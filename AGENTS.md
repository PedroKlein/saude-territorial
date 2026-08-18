# AI Agent Instructions — saude-territorial

## What is this repo?

A multi-layer georeferenced health monitoring platform for Primary Health Care teams in Porto Alegre, Brazil. Part of **GAT 4** (Grupo de Ação Territorial 4) within the **PET-Saúde Digital** program (UFRGS + SMS Porto Alegre).

The app renders patient records (managed in-app) as interactive map layers with alerts, routes, and full CRUD editing. **Postgres is the source of truth** (local via Docker for dev; Supabase used only for the MVP demo); Drizzle ORM owns all data access.

**Sister repo:** [extensao-gat4](https://github.com/PedroKlein/extensao-gat4) — project documentation, domain context, meeting reports, glossary, static PoC prototypes, and synthetic seed data.

Read `SPEC.md` for the full functional specification, architecture decisions, and data model.

## Language

- **User-facing content and documentation:** Brazilian Portuguese
- **Code, comments, commit messages, type names:** English
- **Variable names for domain fields** (patient record columns): Portuguese (e.g., `nomeCompleto`, `dataUltimaAtualizacao`, `dpp`, `ig`)

## Tech Stack

| Concern | Choice |
|---------|--------|
| Framework | Next.js 16+ (App Router, Turbopack, `"use cache"`, `proxy.ts`) |
| UI | shadcn/ui + Tailwind CSS v4 (CSS-first `@theme`, no `tailwind.config.js`) |
| Map | Leaflet (react-leaflet v5) |
| State (server) | TanStack Query v5 |
| State (client) | Zustand v5 |
| Language | TypeScript (strict mode) |
| Auth | Better Auth (email/password; Google OAuth optional, identity-only) |
| **Source of truth** | **Postgres** (local via Docker Compose; any Postgres in prod) |
| **Data access** | **Drizzle ORM** |
| Auth session store | Better Auth (SQLite via `better-sqlite3`) |
| Geocoding | Nominatim (OpenStreetMap) |
| Routing | OSRM |
| Package manager | pnpm |
| Deploy | Any Node host + Postgres (Vercel + Supabase used for the MVP demo) |

## Repo Structure

```
AGENTS.md                          # ← You are here
SPEC.md                            # Functional specification
README.md                          # Project overview and setup
CONTRIBUTING.md                    # Dev workflow, branching, commits
package.json                       # pnpm project
tsconfig.json
next.config.ts
drizzle.config.ts
mise.toml
.env.local.example
docs/
├── adr/                           # Architecture Decision Records
│   ├── ADR-001-drop-sheets.md
│   └── ADR-002-drizzle-orm.md
├── roadmap.md                     # Post-MVP roadmap (sheet parity, importer, new layers)
├── gotchas.md                     # Non-obvious behavior across the stack
└── reference/sheet-audit/         # PET workbook column reference (synthetic)
scripts/                           # Seed + dev tooling (seed-patients, verify-non-prod-db)
src/
├── app/                           # Next.js App Router (pages, layouts, API routes)
│   ├── (auth)/                    # Login
│   ├── (dashboard)/               # Authenticated pages
│   │   ├── map/                   # Main map view
│   │   ├── pacientes/             # Patient list + data-quality view
│   │   └── settings/              # Settings placeholder
│   └── api/                       # Route Handlers
│       ├── auth/                  # Better Auth routes (+ dev-session for local testing)
│       ├── patients/              # Patient CRUD + conditions
│       ├── plans/                 # Day-plan persistence
│       ├── geocode/               # Nominatim proxy
│       └── routes/                # OSRM proxy
├── components/                    # React components (map, panels, sidebar, wizard, planner, auth, ui)
├── db/                            # Drizzle client + schema
├── lib/                           # Core logic (auth, alerts, geocoding, routing, patients, planner)
├── stores/                        # Zustand stores (UI state)
├── config/                        # Layer visual config, alert rules, constants
│   ├── layers.config.ts           # Icon, color, visible columns per layer
│   ├── alert-rules.config.ts      # Static alert rules (locked 4)
│   ├── geo.constants.ts           # US Moab Caldas coordinates
│   └── microareas.data.ts         # Microarea metadata
├── hooks/                         # Custom React hooks (usePatientData, ...)
└── types/                         # Shared TypeScript types
territories/                       # GeoJSON files for microáreas
drizzle/                           # Drizzle-generated SQL migrations
docker-compose.yml                 # Local Postgres (docker compose) for dev
seed/                              # Vendored synthetic seed data
```

## Architecture

### Data Flow

```
Postgres (source of truth)
    ↕ Drizzle ORM
Next.js API Routes
    ↕
React Client (map + panels + editing)

Auth: email/password (or optional Google OAuth) → Better Auth → SQLite (`auth.db`) session cookie
```

### Key Principles

1. **Postgres = source of truth.** All patient data lives in Postgres. There is no external mirror to keep in sync. See ADR-001.
2. **Drizzle owns data access.** Every read/write goes through `src/db/`. No Supabase client SDK is used in this repo; Postgres is reached exclusively via the shared client in `src/db/client.ts`. See ADR-002.
3. **CRUD in-app.** Patients are added/edited/removed via the UI, not via an external tool. Edits go through `PATCH /api/patients/[id]`.
4. **Layers are code-defined.** `src/config/layers.config.ts` lists all layers with icon, color, visible columns. Adding a layer is a code change, not a data change.
5. **CNS is unique.** UNIQUE constraint on `patients.cns`. Creating a patient with an existing CNS surfaces "add condition to existing patient" flow.
6. **Base + extension model.** One `patients` row per person; one row per condition in `gestantes_data` / `tuberculose_data` / `has_data` / (future).
7. **No RLS policies in MVP.** Compensating gate: a session check in every route. Destructive DB scripts are non-prod-gated (`scripts/verify-non-prod-db.ts`). The `drizzle/0002` migration enables RLS with no policies as defense-in-depth; the app's DB role owns the tables and bypasses it.
8. **Geocode on save with manual fallback + drag-to-fix.** Nominatim first; user drops/drags a pin when it fails or is misplaced.

### Auth Flow

1. User visits app → `proxy.ts` redirects unauthenticated users to `/login`.
2. Sign in with email/password, or with Google when configured (Better Auth requests only `openid email profile`).
3. Session cookie signed and set → redirect to `/map`.
4. Route handlers read session via `auth.api.getSession({ headers })` and gate access.

### Alert System

Rules are defined **in code** at `src/config/alert-rules.config.ts`. The engine (`src/lib/alerts/engine.ts`) evaluates them against loaded patient data. Locked MVP rules:

- Gestantes: IG > 40 semanas → 🔴 vermelho
- Gestantes: Risco = alto → 🟡 amarelo
- Tuberculose: `data_ultima_atualizacao` > 30 dias → 🔴 vermelho
- HAS: `data_ultima_consulta` > 180 dias → 🟡 amarelo

Operators supported: `>`, `<`, `>=`, `<=`, `=`, `!=`, `older_than_days`, `is_empty`.

Dynamic/user-configurable rules are **pos-MVP**.

## Domain Knowledge

### Key Concepts

| Term | Meaning |
|------|---------|
| **ACS** | Agente Comunitário de Saúde — community health agent who does home visits |
| **US** | Unidade de Saúde — health unit (clinic) |
| **US Moab Caldas** | The pilot health unit for this project |
| **Microárea** | Territory subdivision assigned to one ACS |
| **CNS** | Cartão Nacional de Saúde — unique patient identifier |
| **ESF** | Estratégia Saúde da Família — family health teams |
| **e-SUS APS** | National primary-care health IT system (future integration; not in MVP) |
| **LGPD** | Brazil's data protection law (like GDPR) |
| **DUM** | Data da Última Menstruação (last menstrual period date) |
| **DPP** | Data Provável do Parto (expected delivery date) |
| **IG** | Idade Gestacional (gestational age in weeks) |

### Health conditions modeled

Each condition maps to a `_data` extension table joined to `patients` by `patient_id`. Column details live in `docs/roadmap.md`.

| Condition | Extension table | Key fields |
|-----------|-----------------|-----------|
| Gestantes | `gestantes_data` | DUM, DPP, Risco, IG, data última consulta |
| Tuberculose | `tuberculose_data` | Baciloscopia, TRM, Cultura, Forma Clínica, data última atualização |
| HAS (Hipertensão) | `has_data` | Data última consulta, monitoramento |
| DM (Diabetes) | *(deferred)* | PMDID |
| Domiciliados Acamados | *(deferred)* | Vacinas, Status Visita |
| Puericultura/Binômio | *(deferred)* | Crianças <2 anos |
| PSE (Saúde na Escola) | *(deferred, location-based not patient-based)* | Escola, INEP, Ações |
| ILPI | *(deferred, location-based not patient-based)* | Nome local, Atividades |

### People

| Role | Name |
|------|------|
| Prof. (coordenadora) | Fernanda |
| Prof. (GIS) | Netto |
| Tutor | Thiago |
| Preceptor (US Moab) | Lucas |
| Preceptora | Leila |
| Monitores (computação) | Pedro, Francisco, Flach, Merlini, Guilherme |

## Development Guidelines

### Code Style

- TypeScript strict mode — no `any`, no implicit returns, no unused variables
- Strict ESLint config
- Prefer Server Components by default; use `'use client'` only for interactive components (map, forms, filters)
- Leaflet components MUST use `dynamic(() => import(...), { ssr: false })` — Leaflet requires `window`
- Use Drizzle for all DB access (`src/db/`); never open another Postgres connection outside `src/db/client.ts`

### Data Handling

This is a synthetic-only project: an academic monitoring platform for
PET-Saúde Digital that never touches real patient records. All seed and
reference data (JSON fixtures, CSVs under `docs/reference/`, `extensao-gat4/`)
is fictitious even when the shape mimics a production tab.

- Everything under `docs/reference/`, tests, seeds, and audit CSVs is committable.
- `NEVER log patient fields to console, analytics, or error trackers` still applies — it keeps the code deployable elsewhere later, and it keeps stack traces useful.
- Seed sources: `extensao-gat4` sister repo (`gestantes.json`, `pacientes.csv`), the PET reference workbook (see `docs/reference/sheet-audit/README.md`).
- Seed scripts still gate on `SEED_SYNTHETIC=1` — cheap defence against a future refactor accidentally targeting a real DB.

### Naming Conventions

- Components: PascalCase (`PatientDetailPanel.tsx`)
- Hooks: camelCase with `use` prefix (`usePatientData.ts`)
- Utils/lib: camelCase (`normalizeAddress.ts`)
- Types: PascalCase (`Patient`, `LayerConfig`, `AlertRule`)
- Stores: camelCase with `Store` suffix (`mapStore.ts`)
- API routes: kebab-case directories (`api/patients/[id]/route.ts`)

### Testing

- Vitest for unit tests (logic, parsers, alert engine, Drizzle repositories)
- Playwright for E2E (auth flow, map interactions) — later milestone
- Test alert rules and geocoding logic thoroughly — they affect patient visibility

### Commits

- Conventional commits: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`
- English commit messages
- Reference SPEC.md and/or ADRs when relevant

## Related Resources

| Resource | Location |
|----------|----------|
| Functional specification | `SPEC.md` |
| ADR-001 (drop Sheets) | `docs/adr/ADR-001-drop-sheets.md` |
| ADR-002 (Drizzle ORM) | `docs/adr/ADR-002-drizzle-orm.md` |
| **Testing & verification guide** | **`TESTING.md`** |
| Contributing guide | `CONTRIBUTING.md` |
| Roadmap | `docs/roadmap.md` |
| Gotchas | `docs/gotchas.md` |
| Sister repo (docs + PoCs + seed data) | [extensao-gat4](https://github.com/PedroKlein/extensao-gat4) |
| Domain glossary | extensao-gat4 `docs/glossary.md` |
| Meeting reports | extensao-gat4 `docs/reports.md` |
| Synthetic Gestantes seed | extensao-gat4 `prototypes/mapa-gestantes/src/data/gestantes.json` |
| Synthetic multi-condition seed | extensao-gat4 `prototypes/poc-01/data/pacientes.csv` |

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
