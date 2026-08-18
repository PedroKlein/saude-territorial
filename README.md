# saude-territorial

Multi-layer georeferenced platform for primary-care health teams in Porto Alegre. Turns the team's patient records into an interactive map with per-condition layers, priority alerts, route planning, and in-app editing.

Built for **GAT 4** (Grupo de Ação Territorial 4) inside the **PET-Saúde Digital** program (UFRGS + SMS Porto Alegre). Pilot deployment at **US Moab Caldas**.

## Stack

| Concern | Choice |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack, `proxy.ts`) |
| UI | shadcn/ui + Tailwind CSS v4 (CSS-first `@theme`) |
| Map | Leaflet (react-leaflet v5) |
| State (server) | TanStack Query v5 |
| State (client) | Zustand v5 |
| Language | TypeScript (strict) |
| Auth | Better Auth (Google OAuth — identity only) |
| Data | Supabase Postgres, accessed via Drizzle ORM |
| Auth session store | Better Auth (SQLite via `better-sqlite3`) |
| Geocoding | Nominatim (OpenStreetMap) |
| Routing | OSRM |
| Package manager | pnpm |
| Task runner | mise |
| Deploy | Vercel + Supabase cloud |

## Prerequisites

- Node 25 (managed by `mise`)
- pnpm 9+
- A **dev** Supabase project (never point at production)
- A Google Cloud OAuth 2.0 client ID with `openid email profile` scopes

## Setup

1. `mise install` — installs the pinned Node version.
2. `pnpm install`.
3. `cp .env.local.example .env.local` and fill:
   - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` — Google Cloud OAuth client credentials
   - `DATABASE_URL` — Supabase transaction pooler URL (port 6543)
   - `BETTER_AUTH_SECRET` — `openssl rand -hex 32`
   - `BETTER_AUTH_URL` — `http://localhost:3000` in dev
4. `echo y | npx auth migrate` — creates the local `auth.db` SQLite session store.
5. `pnpm db:push` — applies the Drizzle schema to your dev Supabase project. Blocked by `scripts/verify-non-prod-db.ts` if the URL looks like production.
6. `SEED_SYNTHETIC=1 I_HAVE_VERIFIED_NON_PROD=1 pnpm db:seed` — loads synthetic patients from the sister repo fixtures.
7. `pnpm dev` — start at http://localhost:3000 and sign in with Google.

## Commands

| Command | What it does |
|---|---|
| `pnpm dev` | Dev server (Turbopack) |
| `pnpm build` | Production build |
| `pnpm test` | Vitest |
| `pnpm lint` | ESLint |
| `pnpm type-check` | `tsc --noEmit` |
| `pnpm db:generate` | Create a Drizzle migration from schema changes |
| `pnpm db:push` | Apply schema to Supabase (non-prod gated) |
| `pnpm db:seed` | Seed synthetic data (non-prod + LGPD gated) |
| `pnpm db:studio` | Drizzle Studio (browse your DB) |

## Documentation

- [SPEC.md](./SPEC.md) — functional specification, data model, alert rules
- [AGENTS.md](./AGENTS.md) — repo structure and conventions
- [CONTRIBUTING.md](./CONTRIBUTING.md) — dev workflow, branching, commits, review
- [TESTING.md](./TESTING.md) — how to verify changes
- [docs/roadmap.md](./docs/roadmap.md) — post-MVP work in progress
- [docs/gotchas.md](./docs/gotchas.md) — non-obvious behavior across the stack
- [docs/adr/](./docs/adr/) — architectural decisions

## Sister repo

[extensao-gat4](https://github.com/PedroKlein/extensao-gat4) — domain documentation, meeting reports, glossary, static PoC prototypes, synthetic seed data.

## Data handling

Synthetic data only. Seed scripts refuse to run without `SEED_SYNTHETIC=1` and `I_HAVE_VERIFIED_NON_PROD=1`. Never commit real patient records. Never log patient fields to stdout, analytics, or error trackers.

## License

TBD.
