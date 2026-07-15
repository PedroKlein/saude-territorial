# saude-territorial — Implementation Plan

## Milestones (6 focused milestones)

Each milestone produces a **demoable artifact** and can be completed independently of later milestones.

---

### M1: Scaffold + Auth
> **Deliverable:** Running Next.js app with Google OAuth login, protected routes, and a settings page where the user pastes their spreadsheet URL.

**Tasks:**
1. Project scaffold — Next.js 16, pnpm, TypeScript strict, Tailwind v4 (`@theme`), shadcn/ui, ESLint, folder structure per AGENTS.md
2. Better Auth setup — Google OAuth with `spreadsheets` scope, session management, token storage
3. `proxy.ts` route protection — redirect unauthenticated users to login
4. Settings page — paste spreadsheet URL → extract/store spreadsheet ID in Supabase
5. Supabase initial setup — project creation, `user_preferences` table, client wiring (`@supabase/ssr`)
6. Landing page + auth layout — login button, redirect after auth, basic dashboard shell

**Success criteria:**
- User can sign in with Google
- App requests spreadsheets scope
- User can paste a Google Sheets URL and it persists
- Unauthenticated routes redirect to login

**Dependencies:** None (first milestone)

---

### M2: Data Pipeline (Sheets → Supabase)
> **Deliverable:** The app reads all tabs from the configured Google Sheet, parses patient data, geocodes addresses, and caches coordinates.

**Tasks:**
1. Google Sheets client — read all tabs, auto-discover tab names, parse Portuguese headers with column mapping
2. Tab-to-layer metadata — extract tab info, detect patient vs. location tabs (PSE, ILPI)
3. Geocoding service — Nominatim client with 1 req/s rate limit, Brazilian address normalization
4. Supabase cache layer — `coordinates_cache` table, `sync_metadata` table, write-then-read pattern
5. Sync orchestration — background refresh, stale detection, progressive update
6. API route handlers — `/api/sheets/[tabName]`, `/api/geocode`, proper error responses

**Success criteria:**
- App reads real spreadsheet tabs via user's OAuth token
- Addresses are geocoded and cached (no re-geocoding on reload)
- Sync badge shows last sync time
- Handles rate limits gracefully (Sheets 300 reads/min, Nominatim 1/s)

**Dependencies:** M1 (auth + spreadsheet config)

---

### M3: Map + Layers + Territories
> **Deliverable:** Interactive Leaflet map with patient markers, layer toggles, clustering, heatmap mode, and territory polygons.

**Tasks:**
1. Leaflet map component — dynamic import (`ssr: false`), marker icons, React strict mode compat
2. Marker rendering — plot patients from cached geocoded data, per-layer icons/colors
3. `layers.config.ts` — visual config per layer (icon, color, visible columns)
4. Sidebar with layer toggles — checkboxes to show/hide layers, Zustand store for UI state
5. Marker clustering — cluster markers at low zoom with count badges
6. Heatmap mode — density visualization as alternative to markers
7. Territory layer — load GeoJSON microáreas, color by ACS, hover shows info
8. TanStack Query integration — queries for sheet data, hydration from server

**Success criteria:**
- Map renders with markers from real geocoded patient data
- Layers toggleable from sidebar
- Clusters at low zoom, individual markers at high zoom
- Heatmap mode toggle works
- Territory boundaries visible with microárea names

**Dependencies:** M2 (data pipeline provides geocoded patient data)

---

### M4: Interaction + Alerts
> **Deliverable:** Click a marker to see/edit patient data. Alert system evaluates rules and colors markers by urgency.

**Tasks:**
1. Patient detail panel — slide-up panel on marker click, shows patient fields per layer config
2. Edit form — inline editing of patient fields in the detail panel
3. Write-to-Sheet flow — edit → save to Google Sheets → on success update Supabase cache → optimistic UI
4. Alert rule engine — parse rules from config Sheet tab, evaluate against patient data
5. Alert visualization — marker border colors (red/yellow/green), badges, sidebar summary
6. Alert layer (cross-layer) — special layer showing all patients with active alerts regardless of condition
7. CNS deduplication — detect same patient across tabs, merge into single marker with condition badges
8. Conflict resolution UI — surface data conflicts between tabs, let user pick correct version

**Success criteria:**
- Click marker → see patient details
- Edit a field → Sheet updates → cache updates → UI reflects change
- Alert rules from Sheet tab color markers correctly
- Sidebar shows alert count summary
- Duplicate patients (same CNS) show as single marker with multiple condition badges

**Dependencies:** M3 (map with markers to interact with)

---

### M5: Routes + Visit Planning
> **Deliverable:** ACS can plan daily visit routes — select patients, get optimized walking/driving route.

**Tasks:**
1. OSRM client — fetch routes for walking and driving profiles
2. Simple route (US → patient) — "Traçar rota" button on marker, polyline on map
3. Multi-patient selection — UI to select multiple patients for a visit plan
4. Route optimization — order patients for shortest total travel (TSP heuristic via OSRM trip)
5. Route display — numbered polyline, distance/time, reorderable list
6. Manual pin + reference — position patients without formal address on map, save coords to Supabase
7. Filtros avançados — filter by microárea, alert level, last update date

**Success criteria:**
- Route from health unit to a patient displays on map with time/distance
- Multi-patient route calculates optimized order
- Route can be reordered manually
- Patients without geocoded address can be manually pinned

**Dependencies:** M4 (detail panel, alert data for filtering)

---

### M6: Polish + Mobile
> **Deliverable:** Production-ready app optimized for ACS mobile usage.

**Tasks:**
1. Mobile responsive layout — sidebar as bottom sheet, touch-friendly markers
2. Performance optimization — virtualized marker lists, lazy layer loading, bundle analysis
3. Geocoding confidence — hide/flag low-confidence geocoded points
4. Route history — save calculated routes for reuse
5. User preferences — persist layer toggles, zoom/center, filters across sessions
6. Street name synonyms — table of alternative street names for geocoding fallback
7. Address annotations — user-added notes on locations ("acesso pela viela lateral")

**Success criteria:**
- App usable on mobile (ACS uses phone in field)
- Map performs well with 200+ markers
- Preferences persist between sessions
- Geocoding fallbacks work (synonyms, manual pins, annotations)

**Dependencies:** M5 (all core features complete)

---

## Dependency Graph

```
M1 (Scaffold + Auth)
 └─► M2 (Data Pipeline)
      └─► M3 (Map + Layers)
           └─► M4 (Interaction + Alerts)
                └─► M5 (Routes + Planning)
                     └─► M6 (Polish + Mobile)
```

## Estimates (rough, solo dev)

| Milestone | Effort |
|-----------|--------|
| M1 | 2-3 days |
| M2 | 3-5 days |
| M3 | 3-4 days |
| M4 | 5-7 days |
| M5 | 3-5 days |
| M6 | 4-6 days |
| **Total** | **~3-5 weeks** |

## Notes

- All milestones follow **write-then-cache** pattern (Sheet is source of truth)
- LGPD: never log/commit patient data; synthetic data only in tests
- User-facing text in PT-BR; code/types in English
- Domain fields (column names) in Portuguese (e.g., `nomeCompleto`, `dataUltimaAtualizacao`)
