# Pivot Execution — Handoff Prompt

> **Paste this entire file into a fresh planning session.** It contains everything the next agent needs to plan the pivot execution — the phase that adds Drizzle, designs the patient schema, builds CRUD API + edit forms, and migrates synthetic seed data into Supabase.

---

## Repo

**Path:** `/Users/i572543/Dev/github.com/PedroKlein/saude-territorial/main`

**Current state:** Post-cleanup. The Google Sheets architecture is fully removed. The app runs and shows 34 synthetic patients on a Leaflet map via a **temporary in-code mock endpoint** (`/api/patients`). All quality gates green except pre-existing broken lint.

**Git branch:** `main` (uncommitted cleanup changes are in the working tree; commit them before starting execution work).

---

## Session instructions

You are entering **plan mode**. Do NOT start executing yet.

1. **Read the anchor docs first, in this order:**
   - `AGENTS.md` — repo overview, tech stack, principles, domain glossary
   - `SPEC.md` — full functional specification, LOCKED decisions
   - `docs/adr/ADR-001-drop-sheets.md` — why Sheets was dropped
   - `docs/adr/ADR-002-drizzle-orm.md` — why Drizzle was chosen, rollback plan
   - `plans/pivot-cleanup.md` — the cleanup that produced this state (context for what's dead vs. alive)
   - `PROGRESS.md` (top "PIVOT" section) — quick invalidation table

2. **Load these skills** (via `/skill <name>` or by explicit `read`):
   - `drizzle-data-access` — schema patterns, boundary rules, pre-DB-mutation gate
   - `supabase-patterns` — auth-boundary-only (do not use for data queries)
   - `auth-betterauth` — identity-only Google OAuth
   - `tanstack-query` — mutation patterns for CRUD flows
   - `nextjs-patterns` — API route patterns
   - `leaflet-nextjs` — map integration for pin-drag editing
   - `geospatial` — Nominatim geocoding pipeline
   - `lgpd-guard` — synthetic-only seed enforcement, error sanitization
   - `ptbr-conventions` — Brazilian date parsing, form labels in PT-BR
   - `typescript-strict` — no `any`, Zod validation, strict mode conventions
   - `testing-patterns` — Vitest patterns, mocking network / DB

3. **Then produce a pivot-execution plan** using the same structure as `plans/pivot-cleanup.md`:
   - Written to `plans/pivot-execution.md`
   - Registered in `plan_tasks` as `saude-pivot-execution`
   - Phase-by-phase with acceptance criteria a blind reviewer can verify
   - Submit to Plannotator (`/plannotator`) for user review

---

## Locked decisions (do NOT re-litigate)

From the grilling session and cleanup planning:

| # | Decision | ADR / Source |
|---|----------|--------------|
| 1 | Supabase = source of truth | ADR-001 |
| 2 | Drizzle ORM = data access layer | ADR-002 |
| 3 | `@supabase/ssr` for auth boundary ONLY (no data queries) | ADR-002 |
| 4 | Base `patients` + extension tables per condition | SPEC.md §Modelo de Dados |
| 5 | 3 priority layers for MVP: **Gestantes, Tuberculose, HAS** | SPEC.md §Milestones |
| 6 | 4 static alert criteria (locked list) | SPEC.md §Sistema de Alertas |
| 7 | Geocode on save, blocking, with manual-pin fallback + drag-to-fix | SPEC.md §Endereços |
| 8 | CNS UNIQUE + "add condition to existing patient" flow | SPEC.md §Modelo de Dados |
| 9 | Full CRUD in MVP (add / edit / delete) | grilling notes |
| 10 | No RLS in MVP; compensating gates in every route | ADR-002 |
| 11 | Delete legacy SQL migrations; new ones from Drizzle start at 0001 | ADR-002 |
| 12 | Keep 5 layer configs, seed only 3 | SPEC.md |
| 13 | Deploy: Vercel + Supabase cloud | SPEC.md §Deploy |
| 14 | Seed source: `extensao-gat4` synthetic files (see paths below) | SPEC.md §Referências |

## Locked alert rules (4 static rules for MVP)

| Camada | Coluna | Operador | Valor | Nível |
|--------|--------|----------|-------|-------|
| Gestantes | IG (semanas) | > | 40 | 🔴 Vermelho |
| Gestantes | Risco | = | alto | 🟡 Amarelo |
| Tuberculose | `data_ultima_atualizacao` | older_than_days | 30 | 🔴 Vermelho |
| HAS | `data_ultima_consulta` | older_than_days | 180 | 🟡 Amarelo |

The engine already supports the operators; reducing the config from the current 7 rules to these 4 is a pivot-execution task.

---

## Mandatory pre-DB-mutation gate (from ADR-002 discussions)

Any pivot-execution task that runs `drizzle-kit push`, `drizzle-kit migrate`, or otherwise mutates a running Supabase project **MUST include a task-level pre-flight check**:

Suggested implementation:
```typescript
// scripts/verify-non-prod-db.ts
const url = process.env.SUPABASE_URL ?? "";
const isKnownDev = /localhost|-dev\.|staging|test/.test(url);
const explicitOptOut = process.env.SEED_SYNTHETIC === "1" && process.env.I_HAVE_VERIFIED_NON_PROD === "1";
if (!isKnownDev && !explicitOptOut) {
  console.error("Refusing to run: SUPABASE_URL does not match a dev/staging pattern and no explicit opt-out is set.");
  process.exit(1);
}
```

This gate blocks the destructive step, not the entire plan. Any pivot-execution task with `drizzle-kit push` or similar in its recipe must reference this gate in its acceptance criteria.

---

## Seed data paths (`extensao-gat4` sister repo)

| File | Content | Use for |
|------|---------|---------|
| `/Users/i572543/Dev/github.com/PedroKlein/extensao-gat4/main/prototypes/mapa-gestantes/src/data/gestantes.json` | 2109 lines. ~35 synthetic gestantes with full shape (name, CNS, DOB, phone, address+lat/lng, microarea, consultas, exames) | Seed for `patients` + `gestantes_data` |
| `/Users/i572543/Dev/github.com/PedroKlein/extensao-gat4/main/prototypes/poc-01/data/pacientes.csv` | 36 rows. Simple multi-condition (gestante, tuberculose, cronico, acamado) with lat/lng, microarea, ultimo_acompanhamento | Seed for TB and HAS extension tables |
| `/Users/i572543/Dev/github.com/PedroKlein/extensao-gat4/main/prototypes/poc-01/data/microareas.geojson` | 49 lines. Microarea polygons | Territory overlay in `territories/` |
| `/Users/i572543/Dev/github.com/PedroKlein/extensao-gat4/main/prototypes/poc-01/data/equipamentos.geojson` | 12 lines. Health equipment locations | Optional overlay |
| `/Users/i572543/Dev/github.com/PedroKlein/extensao-gat4/main/prototypes/mapa-gestantes/src/data/microareas.json` | 132 lines. Microarea metadata (name, ACS, color) | Merge with GeoJSON for hover info |
| `/Users/i572543/Dev/github.com/PedroKlein/extensao-gat4/main/docs/gestantes.csv` | Raw team export shape (real headers). Small sample. | Reference for column mapping only — NOT for import (may contain sensitive field names) |

**LGPD:** All seed scripts must gate on `SEED_SYNTHETIC=1`. Do not commit any real data.

---

## Suggested pivot-execution phases (starting point — the next planner refines)

1. **PE-1** — Install Drizzle deps + config
   - `pnpm add drizzle-orm postgres`
   - `pnpm add -D drizzle-kit tsx`
   - `drizzle.config.ts` at repo root
   - `src/db/client.ts` (single DB client)

2. **PE-2** — Design and generate initial schema
   - `src/db/schema/patients.ts` (base table + `geocode_status` enum)
   - `src/db/schema/gestantes.ts`, `tuberculose.ts`, `has.ts` (extension tables)
   - Relations file
   - Run `drizzle-kit generate` → produces `supabase/migrations/0001_*.sql`
   - Apply (with pre-flight gate)

3. **PE-3** — Seed migration script
   - `scripts/seed-patients.ts` reading `extensao-gat4` files
   - LGPD gate + non-prod gate
   - Delete `src/lib/demo-data.ts` and the temporary `/api/patients` mock

4. **PE-4** — Read API + wire map to real Supabase reads
   - `GET /api/patients` returning joined rows
   - Update `usePatientData` hook
   - Verify all existing UI (map, filters, priority list, stats, routes) works with real data

5. **PE-5** — Edit flow
   - `PATCH /api/patients/[id]` with Drizzle mutation
   - Re-enable the "Editar" button in `PatientDetailPanel`
   - Address change → re-geocode via Nominatim
   - Draggable markers → `geocode_status = 'manual'` + save lat/lng
   - Optimistic UI with TanStack Query

6. **PE-6** — Create flow
   - "Adicionar paciente" button + right-click-map affordance
   - Modal form with condition selector + condition-specific subforms
   - CNS-exists dialog → "adicionar condição ao paciente"

7. **PE-7** — Delete flow
   - Confirm dialog → `DELETE /api/patients/[id]`
   - Cascade removes extension rows via FK

8. **PE-8** — Reduce alert rules to the locked 4
   - Trim `src/config/alert-rules.config.ts`
   - Update engine tests

9. **PE-9** — Fix pre-existing ESLint 9 config issue
   - Migrate `.eslintrc.json` → `eslint.config.js` (flat config)
   - Verify `pnpm lint` passes

**Explicit non-goals for pivot execution:**
- Mobile support · Real-time / websockets · Multi-instance sync · e-SUS APS integration
- AI prioritization · Custom layers by ACS · Street name aliases with team boundary editing
- Import from Sheet/XLSX (deferred; see MVP doc)

---

## Success signal after pivot execution

- App loads → user signs in with Google → sees the map with real patients from Supabase
- Add a new Gestante via UI → shows on map with correct urgency color
- Edit that Gestante's DPP → save → reload → value persists
- Drag their marker to a new location → coord persists, geocode_status → 'manual'
- Delete → they disappear from map and DB
- CNS collision on create → dialog offers "adicionar condição"

Then the MVP is deliverable. Handoff to the health team.

---

## References

- Plan that produced this state: `plans/pivot-cleanup.md`
- Repos: this app (`saude-territorial`) + sister repo (`extensao-gat4`) with docs and seed data
- Domain contact: Lucas + Leila at US Moab Caldas (via UFRGS PET group)

---

## How to use this file

Copy this file into a fresh planning session's first message:

```bash
# macOS
cat plans/pivot-execution-handoff-prompt.md | pbcopy

# Linux (X11)
cat plans/pivot-execution-handoff-prompt.md | xclip -selection clipboard -in

# Linux (Wayland)
cat plans/pivot-execution-handoff-prompt.md | wl-copy
```
