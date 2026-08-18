# ADR-001: Drop Google Sheets as source of truth; promote Supabase

- **Status:** Accepted — 2026-08 pivot
- **Deciders:** Pedro Klein (dev), Lucas + Leila (US Moab Caldas / SMS Porto Alegre), UFRGS PET-Saúde group
- **Supersedes:** the "Sheet = fonte de verdade" LOCKED decision in the original `SPEC.md`

## Context

The project's original architecture (as specified in the pre-pivot `SPEC.md`) made the health team's existing Google Sheets **the source of truth** for patient data. The app was designed to read all tabs on demand, write edits back to the Sheet first, and treat Supabase Postgres as a cache. That design was chosen for "zero friction" — the team keeps their existing workflow, and the app just visualizes it.

Two workstreams changed the picture:

1. **Team meetings** (see meeting summary shared with the group) surfaced that the "dream delivery" ACS want is not a spreadsheet visualizer — it is a **customization tool** where they can add layers, correct street names, adjust localizations, and eventually pull from complementary bases like CDR (Código de Logradouros) and e-SUS APS. This shape can't sit on a "we mirror your spreadsheet" architecture.

2. **The agreed MVP** (see the "Design de Software / Definição de Escopo" doc) is explicit: on-demand processing, in-app data operation, no real-time, no mobile, no distributed sync. It also lists **"atualização de dados da planilha pelo mapa"** as a "may enter" — not a "must enter". The bidirectional-sync assumption baked into the old architecture was heavier than the MVP requires.

Consequences of the old architecture that made pivoting attractive:
- Google Sheets API rate limits (300 reads/min, 60 writes/min) and 1-2s write latency were shaped like every UX-slowing quirk.
- Two ACS editing the same row → last-write-wins with no transaction, no conflict detection, no audit trail.
- Real patient data in Google Drive is a weak LGPD posture — access control is coarse and dependent on Workspace hygiene.
- Every ingestion was a parsing minefield (headers drift, dates are strings, phone numbers auto-format).
- Cross-tab CNS dedup with runtime conflict resolution was a whole subsystem for a UX that the team didn't ask for.

## Decision

**Supabase Postgres becomes the source of truth.** All patient data lives in `patients` + condition-specific extension tables. Editing happens in the app UI (full CRUD), not in the Sheet. The Google Sheets integration is deleted.

Concretely:
- Delete `src/lib/sheets/`, `src/app/api/sheets/`, `SpreadsheetConfig`, `usePatientEdit`, `ConflictPanel`, `/api/config`, `auth-refresh.ts`.
- Drop the `spreadsheets` OAuth scope; identity-only Google login remains.
- Rename `/api/sheets/demo` → `/api/patients` (temporary mock; replaced by real Supabase reads via Drizzle in pivot execution).
- Import from spreadsheet becomes a **future feature**, not a runtime dependency.

## Consequences

**Positive:**
- Massive simplification. No 429 chains, no on-behalf-of token flow, no cross-tab conflict UI, no write-then-cache orchestration.
- Territorial features (street aliases, manual pins, ACS corrections, team boundaries) become **native database concepts** instead of awkward extensions over Sheets.
- LGPD posture improves — data lives in one governed place, not scattered across Google Drive.
- Local install / self-hosted Supabase is now on the table (deferred, but feasible).
- Team can iterate on the app UI without touching a shared Sheet mid-day.

**Negative / accepted trade-offs:**
- The team no longer has their spreadsheet workflow as the daily anchor. Once the pilot begins, edits happen in the app, not in the Sheet. Migration path for their existing data: a one-shot XLSX bootstrap during pivot execution using the synthetic seed from `extensao-gat4` as the reference shape.
- "Bidirectional sync back to Sheet" — if it ever comes back, it's a **new feature**, not the default. That's a real UX regression for anyone who liked seeing their edits in Google Drive.
- Pivot execution has to build CRUD forms for at least 3 conditions before the app is usable at all — a bigger front-loaded UI investment than the old "just render what's in the tab" approach.

## Alternatives considered

- **Keep bidirectional Sheet sync.** Rejected: the team asked for customization features that can't sit on a Sheet mirror. Rate limits and conflict handling remain.
- **Import from Sheet once, then abandon.** Rejected in favor of app-native CRUD. Import may come back as a "may enter" feature (per MVP doc) once the base CRUD is stable.
- **Read-only Sheet mirror.** Rejected: the team explicitly wants to edit and customize; read-only reintroduces the "planilha é muita informação" problem they raised.

## References

- Meeting summary (shared 2026-08 with UFRGS PET group): "Customização por parte dos agentes dos mapas… atualização de localizações feita dinamicamente pelos próprios agentes… planilha é MUITA informação para treinamento."
- MVP doc "Design de Software — Projeto GAT-4 — Saúde Digital": entrega mínima lists "processamento sob demanda", "sistema de camadas", "sistema de alertas"; import from Sheet is "PODE entrar", not "VAI entrar".
- `docs/adr/ADR-002-drizzle-orm.md` — companion decision on data access layer.
