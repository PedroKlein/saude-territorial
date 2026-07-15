# AI Agent Instructions — saude-territorial

## What is this repo?

A multi-layer georeferenced health monitoring platform for Primary Health Care teams in Porto Alegre, Brazil. Part of **GAT 4** (Grupo de Ação Territorial 4) within the **PET-Saúde Digital** program (UFRGS + SMS Porto Alegre).

The app connects to the health team's existing Google Sheets (patient monitoring spreadsheets) and renders them as interactive map layers with alerts, routes, and bidirectional editing.

**Sister repo:** [extensao-gat4](https://github.com/PedroKlein/extensao-gat4) — holds project documentation, domain context, meeting reports, glossary, and the static PoC prototypes that preceded this app.

Read `SPEC.md` for the full functional specification, architecture decisions, and data model.

## Language

- **User-facing content and documentation:** Brazilian Portuguese
- **Code, comments, commit messages, type names:** English
- **Variable names for domain fields** (column headers from health sheets): Portuguese (e.g., `nomeCompleto`, `dataUltimaAtualizacao`)

## Tech Stack

| Concern | Choice |
|---------|--------|
| Framework | Next.js 16+ (App Router, Turbopack, `"use cache"`, `proxy.ts`) |
| UI | shadcn/ui + Tailwind CSS v4 (CSS-first `@theme`, no tailwind.config.js) |
| Map | Leaflet (react-leaflet v5) |
| State (server) | TanStack Query v5 |
| State (client) | Zustand v5 |
| Language | TypeScript (strict mode) |
| Auth | Better Auth (Google OAuth) |
| Patient data | Google Sheets API v4 |
| App state DB | Supabase (Postgres) |
| Geocoding | Nominatim (OpenStreetMap) |
| Routing | OSRM |
| Package manager | pnpm |
| Deploy | Vercel |

## Repo Structure

```
AGENTS.md                          # ← You are here
SPEC.md                            # Functional specification (architecture, data model, milestones)
README.md                          # Project overview and setup instructions
package.json                       # pnpm project
pnpm-lock.yaml
tsconfig.json
next.config.ts
tailwind.config.ts               # REMOVED in Tailwind v4 (config lives in globals.css @theme)
.env.local.example                 # Required environment variables template
src/
├── app/                           # Next.js App Router (pages, layouts, API routes)
│   ├── (auth)/                    # Auth-related pages (login, callback)
│   ├── (dashboard)/               # Authenticated app pages
│   │   ├── map/                   # Main map view
│   │   ├── settings/              # Spreadsheet config, preferences
│   │   └── layout.tsx             # Dashboard layout (sidebar + map)
│   ├── api/                       # Route Handlers
│   │   ├── auth/                  # Better Auth routes
│   │   ├── sheets/                # Google Sheets proxy (read/write)
│   │   ├── geocode/               # Nominatim proxy + caching
│   │   └── routes/                # OSRM proxy
│   ├── layout.tsx                 # Root layout
│   └── page.tsx                   # Landing/redirect
├── components/                    # React components
│   ├── map/                       # Leaflet map, markers, layers, heatmap, clusters
│   ├── panels/                    # Detail panel, edit panel, conflict resolution
│   ├── sidebar/                   # Layer toggles, filters, alerts summary
│   ├── routes/                    # Route display, day planner
│   └── ui/                        # shadcn/ui components
├── lib/                           # Core logic (non-React)
│   ├── sheets/                    # Google Sheets API client, parser, column mapping
│   ├── geocoding/                 # Nominatim client, address normalization
│   ├── alerts/                    # Rule engine (evaluates alert rules from config sheet)
│   ├── layers/                    # Layer auto-discovery, config loader
│   ├── supabase/                  # Supabase client, types, queries
│   └── routing/                   # OSRM client, route optimization
├── stores/                        # Zustand stores (UI state)
├── types/                         # Shared TypeScript types
├── config/                        # Layer visual config, app constants
│   └── layers.config.ts           # Icon, color, visible columns per layer
└── hooks/                         # Custom React hooks
territories/                       # GeoJSON files for microáreas, bairros
public/                            # Static assets (icons, logos)
supabase/
├── migrations/                    # SQL migrations for Supabase schema
└── seed.sql                       # Seed data (if any)
```

## Architecture

### Data Flow

```
Google Sheets (source of truth)
    ↕ OAuth on-behalf (user's token)
Next.js API Routes
    ↕
Supabase (cache: coordinates, prefs, sync metadata)
    ↕
React Client (map + panels + editing)
```

### Key Principles

1. **Google Sheets = source of truth.** All patient data lives in the team's spreadsheet. Supabase caches coordinates and app state only.
2. **Write to Sheet first.** On edit: write to Google Sheets → if success → update Supabase cache. Never write to cache without Sheet confirmation.
3. **Progressive load.** Map renders immediately from Supabase cache. Fresh data streams in from Sheets in the background.
4. **One tab = one layer.** Each spreadsheet tab is auto-discovered as a map layer. Visual config comes from `src/config/layers.config.ts`.
5. **CNS as unique ID.** Patients are deduplicated across tabs by their CNS (Cartão Nacional de Saúde). Conflicts are surfaced to users.

### Auth Flow

1. User logs in with Google OAuth
2. App requests `spreadsheets` scope (read/write on-behalf)
3. Token stored in session — used for all Sheets API calls
4. User must have Editor access to the team's spreadsheet in Google Drive

### Alert System

Alert rules are defined in a special Google Sheet tab with format: `[Layer, Column, Operator, Value, Alert Level]`. The rule engine evaluates these at render time against patient data.

Operators: `>`, `<`, `>=`, `<=`, `=`, `!=`, `older_than_days`, `is_empty`

## Domain Knowledge

### Key Concepts

| Term | Meaning |
|------|---------|
| **ACS** | Agente Comunitário de Saúde — community health agent who does home visits |
| **US** | Unidade de Saúde — health unit (clinic) |
| **US Moab Caldas** | The pilot health unit for this project |
| **Microárea** | Territory subdivision assigned to one ACS |
| **CNS** | Cartão Nacional de Saúde — unique patient identifier (like SSN for health) |
| **ESF** | Estratégia Saúde da Família — family health teams |
| **E-SUS** | National health IT system |
| **LGPD** | Brazil's data protection law (like GDPR) |
| **DUM** | Data da Última Menstruação (last menstrual period date) |
| **DPP** | Data Provável do Parto (expected delivery date) |
| **IG** | Idade Gestacional (gestational age in weeks) |

### Sheet Tabs (= Map Layers)

The team's spreadsheet has these tabs:

| Tab | Entity Type | Key Specific Fields |
|-----|-------------|-------------------|
| Gestantes | Patient | DUM, DPP, Risco, IG |
| Gestantes expostas | Patient | Contatos expostos |
| Tuberculose | Patient | Baciloscopia, TRM, Cultura, Forma Clínica |
| DM (Diabetes) | Patient | PMDID |
| HAS (Hipertensão) | Patient | Data última consulta |
| Domiciliados Acamados | Patient | Vacinas, Status Visita |
| Exame pé diabético | Patient | Exam data |
| Puericultura/Binômio | Patient | Crianças <2 anos |
| PSE (Saúde na Escola) | School | Nome escola, INEP, Ações |
| ILPI | Institution | Nome local, Atividades |

All patient tabs share: Data última atualização, Nome, CNS, Data Nascimento, Idade, Telefone, Rua, Número, Complemento.

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
- Strict ESLint config (rules TBD, will be configured during project setup)
- Prefer Server Components by default; use `'use client'` only for interactive components (map, forms, filters)
- Leaflet components MUST use `dynamic(() => import(...), { ssr: false })` — Leaflet requires `window`

### Data Handling

- **NEVER commit real patient data** — no names, addresses, CNS, or health conditions
- **NEVER log patient data** to console, error trackers, or analytics
- Synthetic/mock data only in the repository
- Real data comes exclusively from the user's Google Sheets at runtime via OAuth

### Naming Conventions

- Components: PascalCase (`PatientDetailPanel.tsx`)
- Hooks: camelCase with `use` prefix (`usePatientData.ts`)
- Utils/lib: camelCase (`parseSheetData.ts`)
- Types: PascalCase (`Patient`, `LayerConfig`, `AlertRule`)
- Stores: camelCase with `Store` suffix (`mapStore.ts`)
- API routes: kebab-case directories (`api/sheets/[tabName]/route.ts`)

### Testing

- Vitest for unit tests (logic, parsers, alert engine)
- Playwright for E2E (auth flow, map interactions) — later milestone
- Test alert rules and geocoding logic thoroughly — they affect patient visibility

### Commits

- Conventional commits: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`
- English commit messages
- Reference SPEC.md milestones when relevant (e.g., `feat(m1): add Google OAuth flow`)

## Related Resources

| Resource | Location |
|----------|----------|
| Functional specification | `SPEC.md` |
| **Testing & verification guide** | **`TESTING.md`** |
| Sister repo (docs + PoCs) | [extensao-gat4](https://github.com/PedroKlein/extensao-gat4) |
| Domain glossary | extensao-gat4 `docs/glossary.md` |
| Meeting reports | extensao-gat4 `docs/reports.md` |
| Static PoC reference | extensao-gat4 `prototypes/mapa-gestantes/` |
| Previous urgency engine | extensao-gat4 `prototypes/mapa-gestantes/src/logic/` |
