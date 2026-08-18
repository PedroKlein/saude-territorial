/**
 * `geocodeWithCache` — read-through Nominatim cache backed by `geocode_cache`.
 *
 * The cache is keyed on the deterministic normalized form of the address
 * (`city|street|number`, lowercased). Two callers geocoding "R. Flores 100"
 * and "Rua das Flores, 100" hit the same row because
 * `normalizeAddress` collapses abbreviations before the key is built.
 *
 * The Nominatim rate limit lives inside `geocode()` itself (1 req/s across
 * the whole app). Cache hits do NOT pay that cost — they short-circuit
 * before the rate-limited call.
 *
 * See `.agents/skills/geospatial/SKILL.md` for the geocoding policy.
 *
 * LGPD: this module only handles addresses transiently to compute a hash
 * and issue an HTTP call. It never logs address strings alongside a patient
 * identifier — callers are responsible for not passing patient identity in.
 */

import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { geocodeCache } from "@/db/schema/geocode-cache";
import { geocode } from "@/lib/geocoding/client";
import type { GeoResult, NormalizedAddress } from "@/lib/geocoding/types";

/** Deterministic cache key derived from a normalized address. */
export function buildCacheKey(addr: NormalizedAddress): string {
  const number = addr.number ?? "";
  return `${addr.city}|${addr.street}|${number}`.toLowerCase();
}

// Bucketing policy lives inside the geocode client already; re-import here
// would be a cycle. Re-derive the bucket from the raw score.
function bucketConfidence(importance: number): GeoResult["confidence"] {
  if (importance >= 0.6) return "high";
  if (importance >= 0.4) return "medium";
  return "low";
}

/**
 * Look up an address in the geocode cache, falling back to Nominatim on miss.
 * Returns `null` when both cache miss AND Nominatim yield no result.
 *
 * On a miss with a successful geocode, the result is upserted with
 * `INSERT ... ON CONFLICT DO NOTHING` so two concurrent callers race safely.
 */
export async function geocodeWithCache(
  addr: NormalizedAddress,
): Promise<GeoResult | null> {
  const key = buildCacheKey(addr);

  const hit = await db.query.geocodeCache.findFirst({
    where: eq(geocodeCache.key, key),
  });

  if (hit) {
    return {
      lat: hit.lat,
      lng: hit.lng,
      confidence: bucketConfidence(hit.confidence),
      importance: hit.confidence,
      displayName: hit.displayName ?? undefined,
    };
  }

  const result = await geocode(addr);
  if (!result) return null;

  await db
    .insert(geocodeCache)
    .values({
      key,
      lat: result.lat,
      lng: result.lng,
      confidence: result.importance,
      displayName: result.displayName ?? null,
    })
    .onConflictDoNothing({ target: geocodeCache.key });

  return result;
}

