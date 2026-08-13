---
name: geospatial
description: >
  Geocoding (Nominatim) and routing (OSRM) patterns for this Porto Alegre health monitoring
  project. Covers Brazilian address normalization, Nominatim rate limits (max 1 req/s),
  caching geocoded coordinates in Supabase, structured vs free-form queries, OSRM route
  optimization for ACS home visits, and coordinate handling. Use when geocoding patient
  addresses, building route plans, handling missing/ambiguous coordinates, or configuring
  the geocoding proxy. Triggers on: geocode, Nominatim, OSRM, route, coordinates, lat,
  lng, address normalization, endereço, geohash, driving route, visit route, TSP, distance,
  "address not found". Do NOT use for map rendering (use leaflet-nextjs) or general data
  fetching (use tanstack-query).
---

# Geospatial: Nominatim + OSRM

## Nominatim Usage Policy (Hard Constraints)

Public Nominatim API (`nominatim.openstreetmap.org`):
- **Max 1 request per second** (absolute limit, not average)
- Must include identifying `User-Agent` header (e.g., `saude-territorial/1.0`)
- No bulk geocoding without explicit permission
- Results must be cached — never re-geocode the same address

**For this project:** Proxy all Nominatim calls through our API route with:
1. Server-side rate limiting (1 req/s)
2. Supabase cache lookup first
3. Queue for pending requests

## Address Normalization (Brazilian Addresses)

Porto Alegre addresses are messy. Common issues:

| Problem | Example | Normalized |
|---------|---------|------------|
| Abbreviations | "R.", "Av.", "Trav." | "Rua", "Avenida", "Travessa" |
| Missing type | "Flores, 100" | "Rua Flores, 100" |
| Informal names | "em frente ao mercado" | Remove — not geocodable |
| Compound numbers | "100-A", "100 fundos" | Use "100", complement separate |
| No number | "Rua X, s/n" | Geocode street only, lower confidence |
| Neighborhood appended | "Rua X, 100 - Bairro Y" | Split: street + bairro separate params |

```typescript
// lib/geocoding/normalize.ts
const STREET_ABBREVIATIONS: Record<string, string> = {
  'r.': 'Rua', 'r ': 'Rua ',
  'av.': 'Avenida', 'av ': 'Avenida ',
  'trav.': 'Travessa',
  'bc.': 'Beco', 'bco.': 'Beco',
  'est.': 'Estrada',
  'pç.': 'Praça', 'pc.': 'Praça',
}

export function normalizeAddress(rua: string, numero: string, bairro?: string): NormalizedAddress {
  let street = rua.trim().toLowerCase()

  // Expand abbreviations
  for (const [abbr, full] of Object.entries(STREET_ABBREVIATIONS)) {
    if (street.startsWith(abbr)) {
      street = full + street.slice(abbr.length)
      break
    }
  }

  // Clean number
  const cleanNumber = numero.replace(/[^\d]/g, '') || ''  // Remove "A", "fundos", etc.

  return {
    street: capitalizeWords(street),
    number: cleanNumber,
    city: 'Porto Alegre',
    state: 'RS',
    country: 'br',
    bairro,
  }
}
```

## Structured Nominatim Query (Preferred)

Structured queries are faster and more accurate than free-form:

```typescript
// lib/geocoding/nominatim.ts
interface NominatimParams {
  street?: string     // "Rua das Flores, 100"
  city?: string       // "Porto Alegre"
  state?: string      // "Rio Grande do Sul"
  country?: string    // "br"
  postalcode?: string
}

async function geocodeStructured(params: NominatimParams): Promise<GeoResult | null> {
  const url = new URL('https://nominatim.openstreetmap.org/search')
  url.searchParams.set('format', 'jsonv2')
  url.searchParams.set('limit', '1')
  url.searchParams.set('countrycodes', 'br')
  if (params.street) url.searchParams.set('street', params.street)
  if (params.city) url.searchParams.set('city', params.city)
  if (params.state) url.searchParams.set('state', params.state)

  const response = await fetch(url, {
    headers: { 'User-Agent': 'saude-territorial/1.0 (health-monitoring-poa)' },
  })

  const results = await response.json()
  if (!results.length) return null

  return {
    lat: parseFloat(results[0].lat),
    lng: parseFloat(results[0].lon),
    confidence: mapImportance(results[0].importance),
    displayName: results[0].display_name,
  }
}
```

## Geocoding Cache Strategy

> **Post-pivot note:** the Supabase-backed `coordinates_cache` table was removed. The `/api/geocode` route currently hits Nominatim directly on every call. Caching will be reintroduced during pivot execution via Drizzle — likely as a `geocode_cache` table keyed on the normalized address. The rest of this section is retained as design guidance for that future reintroduction.

Cache lookup will use a Postgres `geocode_cache` table via Drizzle (see `drizzle-data-access` skill for schema patterns).
The geospatial-specific logic is the **cache key construction**:

```typescript
// hypothetical src/db/geocode-cache.ts (pivot execution)
function buildCacheKey(addr: NormalizedAddress): string {
  // Deterministic key from normalized fields — order matters
  return `${addr.city}|${addr.street}|${addr.number}`.toLowerCase()
}

// Flow: check cache → miss → rate-limited Nominatim call → upsert result
```

Address normalization (above) ensures "R. Flores 100" and "Rua Flores, 100" produce
the same cache key, preventing duplicate API calls.

## Batch Geocoding (Progressive)

For initial load of many patients, geocode progressively:

```typescript
// Process in small batches with 1s delay between each
async function batchGeocode(
  patients: PatientWithoutCoords[],
  onProgress?: (done: number, total: number) => void
): Promise<GeocodedPatient[]> {
  const results: GeocodedPatient[] = []

  for (let i = 0; i < patients.length; i++) {
    const address = normalizeAddress(patients[i].rua, patients[i].numero)
    const geo = await geocodeWithCache(address)

    results.push({ ...patients[i], ...(geo ?? { lat: null, lng: null }) })
    onProgress?.(i + 1, patients.length)

    // Nominatim requires 1s between requests (only for cache misses)
    // geocodeWithCache only hits Nominatim on cache miss — rate limiter handles delay
  }

  return results
}
```

## OSRM: Trip vs Route Decision

| Scenario | Endpoint | Params |
|----------|----------|--------|
| ACS leaves US, visits patients, returns to US | `/trip/v1/` | `roundtrip=true` |
| ACS starts at home, visits patients, ends wherever | `/route/v1/` | `overview=full` |
| One-way A→B navigation | `/route/v1/` | Two coordinates only |

**Critical:** Using `/trip/` for one-way routes produces a valid JSON response with a
longer-than-necessary route (it forces return to start). The error is silent.

## Route Optimization (Trip endpoint)

For ACS daily visit routes (Traveling Salesman approximation):

```typescript
// lib/routing/osrm.ts
const OSRM_URL = process.env.OSRM_URL ?? 'https://router.project-osrm.org'

interface RouteResult {
  distance: number     // meters
  duration: number     // seconds
  geometry: GeoJSON.LineString
  waypoints: [number, number][]  // ordered stops
}

async function optimizeRoute(
  stops: [number, number][],  // [lng, lat] — OSRM uses lng,lat order!
  profile: 'driving' | 'walking' = 'driving'
): Promise<RouteResult> {
  // OSRM Trip endpoint solves TSP (finds optimal visit order)
  const coords = stops.map(([lng, lat]) => `${lng},${lat}`).join(';')
  const url = `${OSRM_URL}/trip/v1/${profile}/${coords}?overview=full&geometries=geojson&roundtrip=true`

  const response = await fetch(url)
  const data = await response.json()

  if (data.code !== 'Ok') throw new Error(`OSRM error: ${data.code}`)

  const trip = data.trips[0]
  return {
    distance: trip.distance,
    duration: trip.duration,
    geometry: trip.geometry,
    waypoints: data.waypoints.map((wp: any) => wp.location),
  }
}
```

**OSRM coordinate order is `[longitude, latitude]`** — the inverse of Leaflet's `[lat, lng]`.
This is the #1 source of routing bugs.

## Nominatim Confidence Thresholds

Nominatim returns an `importance` field (0.0–1.0). Use it to gate map placement:

| importance | Meaning | Action |
|---|---|---|
| ≥ 0.6 | House-level match | Show on map (normal pin) |
| 0.4–0.59 | Street or block centroid | Show with warning color pin + "endereço aproximado" tooltip |
| < 0.4 | Neighborhood/city centroid | Mark as ungeocoded; show in sidebar list only, not on map |

```typescript
type GeoConfidence = 'high' | 'medium' | 'low'

function classifyConfidence(importance: number): GeoConfidence {
  if (importance >= 0.6) return 'high'
  if (importance >= 0.4) return 'medium'
  return 'low'
}
```

**Why this matters:** Without a threshold, ACS might navigate to a neighborhood
centroid thinking it's the patient's house — wasting a visit.

## Nominatim Tips for Porto Alegre Specifically

Brazilian addresses on OpenStreetMap have known issues:
- Many addresses lack house numbers in OSM data for Porto Alegre suburbs
- Highway-adjacent addresses may have `addr:street` = "Rodovia BR-116" instead of local name
- Use `countrycodes=br` to avoid false matches in Portugal (same street names)
- For better results, always pass `city=Porto Alegre` and `state=Rio Grande do Sul`
- If structured query fails, try free-form with the pattern: `"Rua Name, Number, Porto Alegre"`

## Fallback Strategy (Front-Load This)

```
1. Structured query (street + number + city)
   ↓ no result?
2. Street-only query (without number)
   ↓ no result?
3. Neighborhood centroid (bairro + city)
   ↓ no result?
4. Mark as "ungeocoded" — show in sidebar list but not on map
```

## NEVER

- **NEVER call Nominatim directly from the client** — proxy through API route (rate limit + User-Agent + cache)
- **NEVER send more than 1 request/second to public Nominatim** — they will ban the IP
- **NEVER geocode the same address twice** — always check Supabase cache first
- **NEVER use Nominatim for bulk geocoding without caching** — 500 patients = 8+ minutes at 1/sec; cache makes subsequent loads instant
- **NEVER use `/trip/` for one-way A-to-B routes** — Trip forces a circular path and returns a longer route than `/route/`; use Trip only when ACS returns to starting point
- **NEVER pass `[lat, lng]` to OSRM** — it expects `[longitude, latitude]`; swapping causes routes in the wrong hemisphere
- **NEVER trust geocoding results blindly** — check that coordinates fall within Porto Alegre bounding box (-30.27 to -29.93 lat, -51.27 to -51.01 lng)
- **NEVER log geocoded addresses with patient identifiers** — coordinates + name = LGPD violation (see lgpd-guard)
- **NEVER skip address normalization** — "R. Flores 100" and "Rua das Flores, 100" would cache as different entries without it
