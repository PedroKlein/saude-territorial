# AI Agent Instructions — saude-territorial

## What is this repo?

A multi-layer georeferenced health monitoring platform for Primary Health Care teams in Porto Alegre, Brazil. Part of **GAT 4** (Grupo de Ação Territorial 4) within the **PET-Saúde Digital** program (UFRGS + SMS Porto Alegre).

The app renders patient records (managed in-app) as interactive map layers with alerts, routes, and full CRUD editing. **Supabase Postgres is the source of truth**; Drizzle ORM owns all data access.

> **Post-pivot** (August 2026): the original architecture read/wrote Google Sheets on behalf of the user. That was removed. See `docs/adr/ADR-001-drop-sheets.md` and `docs/adr/ADR-002-drizzle-orm.md`.

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
| Auth | Better Auth (Google OAuth — **identity only**, no `spreadsheets` scope) |
| **Source of truth** | **Supabase Postgres** (was Google Sheets pre-pivot — see ADR-001) |
| **Data access** | **Drizzle ORM** (was `@supabase/supabase-js` queries — see ADR-002) |
| Auth session store | `@supabase/ssr` (session cookies only; not for data queries) |
| Geocoding | Nominatim (OpenStreetMap) |
| Routing | OSRM |
| Package manager | pnpm |
| Deploy | Vercel + Supabase cloud |

## Repo Structure

```
AGENTS.md                          # ← You are here
SPEC.md                            # Functional specification
README.md                          # Project overview and setup
PLAN.md                            # Pointer to plans/ (post-pivot)
package.json                       # pnpm project
pnpm-lock.yaml
tsconfig.json
next.config.ts
.env.local.example
docs/
├── adr/                           # Architecture Decision Records
│   ├── ADR-001-drop-sheets.md
│   └── ADR-002-drizzle-orm.md
plans/                             # Structured execution plans
├── pivot-cleanup.md               # The plan that produced this state
└── pivot-execution.md             # (Added in the next planning session)
src/
├── app/                           # Next.js App Router (pages, layouts, API routes)
│   ├── (auth)/                    # Auth-related pages (login, callback)
│   ├── (dashboard)/               # Authenticated app pages
│   │   ├── map/                   # Main map view
│   │   ├── settings/              # Placeholder post-pivot; reintroduced later
│   │   └── layout.tsx             # Dashboard layout (sidebar + map)
│   ├── api/                       # Route Handlers
│   │   ├── auth/                  # Better Auth routes (+ dev-session for local testing)
│   │   ├── patients/              # TEMPORARY mock endpoint; becomes CRUD in pivot execution
│   │   ├── geocode/               # Nominatim proxy + cache
│   │   ├── pins/                  # Manual pin persistence
│   │   └── routes/                # OSRM proxy
│   ├── layout.tsx                 # Root layout
│   └── page.tsx                   # Landing/redirect
├── components/                    # React components
│   ├── map/                       # Leaflet map, markers, layers, heatmap, clusters
│   ├── panels/                    # Detail panel (edit affordance stubbed pending Drizzle CRUD)
│   ├── sidebar/                   # Layer toggles, filters, priority list, sync badge
│   ├── auth/                      # Sign-in button, user menu
│   └── ui/                        # shadcn/ui components
├── lib/                           # Core logic (non-React)
│   ├── auth.ts                    # Better Auth server config (identity-only)
│   ├── auth-client.ts             # Better Auth client
│   ├── demo-data.ts               # TEMPORARY synthetic patients (replaced by DB seed in pivot execution)
│   ├── geocoding/                 # Nominatim client, address normalization, cache
│   ├── alerts/                    # Rule engine
│   ├── routing/                   # OSRM client
│   ├── supabase/                  # (post-pivot: auth-boundary only; data queries live in src/db/)
│   └── db/                        # (TO BE ADDED in pivot execution) Drizzle client + schema
├── stores/                        # Zustand stores (UI state)
├── types/                         # Shared TypeScript types
├── config/                        # Layer visual config, alert rules, constants
│   ├── layers.config.ts           # Icon, color, visible columns per layer
│   ├── alert-rules.config.ts      # Static alert rules (post-pivot: 4 locked rules planned)
│   ├── geo.constants.ts           # US Moab Caldas coordinates
│   └── microareas.data.ts         # Microarea metadata
└── hooks/                         # Custom React hooks (usePatientData, ...)
territories/                       # GeoJSON files for microáreas, bairros
public/                            # Static assets (icons, logos)
supabase/
└── migrations/                    # SQL migrations — REGENERATED via Drizzle during pivot execution
```

## Architecture

### Data Flow (post-pivot)

```
Supabase Postgres (source of truth)
    ↕ Drizzle ORM
Next.js API Routes
    ↕
React Client (map + panels + editing)

Auth: Google OAuth (identity only) → Better Auth → @supabase/ssr session cookie
```

### Key Principles

1. **Supabase = source of truth.** All patient data lives in Postgres. There is no external mirror to keep in sync. See ADR-001.
2. **Drizzle owns data access.** Every read/write goes through `src/db/`. No `@supabase/supabase-js` calls to `.from(...)` anywhere. See ADR-002.
3. **CRUD in-app.** Patients are added/edited/removed via the UI, not via an external tool. Edits go through `PATCH /api/patients/[id]`.
4. **Layers are code-defined.** `src/config/layers.config.ts` lists all layers with icon, color, visible columns. Adding a layer is a code change, not a data change.
5. **CNS is unique.** UNIQUE constraint on `patients.cns`. Creating a patient with an existing CNS surfaces "add condition to existing patient" flow.
6. **Base + extension model.** One `patients` row per person; one row per condition in `gestantes_data` / `tuberculose_data` / `has_data` / (future).
7. **No RLS in MVP.** Compensating gates: session check in every route, service-role DB access restricted to admin scripts.
8. **Geocode on save with manual fallback + drag-to-fix.** Nominatim first; user drops/drags a pin when it fails or is misplaced.

### Auth Flow

1. User visits app → `proxy.ts` redirects unauthenticated users to `/login`.
2. Sign in with Google → Better Auth requests `openid email profile` (no additional scopes).
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

Each condition maps to a `_data` extension table joined to `patients` by `patient_id`. Column details are designed in pivot execution.

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

**Historical note:** these were originally Google Sheets tabs pre-pivot. Their shape informed the extension-table design but the data now lives in Postgres.

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
- Use Drizzle for all DB access (`src/db/`); never call `.from(...)` on the Supabase client

### Data Handling

- **NEVER commit real patient data** — no names, addresses, CNS, or health conditions.
- **NEVER log patient data** to console, error trackers, or analytics.
- Synthetic/mock data only. Seed sources: `extensao-gat4` sister repo (`gestantes.json`, `pacientes.csv`).
- Seed scripts must gate on `SEED_SYNTHETIC=1` and (for prod-target scripts) `I_HAVE_VERIFIED_NON_PROD=1`.

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
| Cleanup plan (executed August 2026) | `plans/pivot-cleanup.md` |
| Sister repo (docs + PoCs + seed data) | [extensao-gat4](https://github.com/PedroKlein/github.com/PedroKlein/extensao-gat4) |
| Domain glossary | extensao-gat4 `docs/glossary.md` |
| Meeting reports | extensao-gat4 `docs/reports.md` |
| Synthetic Gestantes seed | extensao-gat4 `prototypes/mapa-gestantes/src/data/gestantes.json` |
| Synthetic multi-condition seed | extensao-gat4 `prototypes/poc-01/data/pacientes.csv` |

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
