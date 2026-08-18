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
| Auth | Better Auth (email/password; Google OAuth optional) |
| Data | Postgres, accessed via Drizzle ORM (local via Docker Compose) |
| Auth session store | Better Auth (SQLite via `better-sqlite3`) |
| Geocoding | Nominatim (OpenStreetMap) |
| Routing | OSRM |
| Package manager | pnpm |
| Task runner | mise |
| Deploy | Any Node host + Postgres (Vercel + Supabase used for the MVP demo) |

## Prerequisites

- [mise](https://mise.jdx.dev) (manages the pinned Node version and task running)
- pnpm 9+
- Docker (for the local Postgres; `docker compose`)

No external accounts are required to run locally — no Supabase, Vercel, or Google.

## Setup

```bash
mise run setup
```

One command: installs deps, creates `.env.local`, starts a local Postgres in
Docker, applies migrations, seeds synthetic patients, and creates a dev login.
Then:

```bash
mise run dev            # http://localhost:3000
```

Log in at `/login` with **dev@local.dev / dev12345** (email/password — no
external identity provider needed).

### Optional: Google sign-in

Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env.local` (identity-only
`openid email profile` scopes). When both are present, a "Entrar com Google"
button appears alongside the email/password form. Leave them unset to run with
email/password only.

### Hosting elsewhere

Nothing here is tied to Supabase or Vercel. Point `DATABASE_URL` at any Postgres
server (e.g. a university host) and deploy the Next.js app to any Node runtime.

## Commands

| Command | What it does |
|---|---|
| `pnpm dev` | Dev server (Turbopack) |
| `pnpm build` | Production build |
| `pnpm test` | Vitest |
| `pnpm lint` | ESLint |
| `pnpm type-check` | `tsc --noEmit` |
| `pnpm db:generate` | Create a Drizzle migration from schema changes |
| `mise run db:up` / `db:down` | Start / stop the local Postgres container |
| `mise run db:migrate` | Apply Drizzle migrations to `DATABASE_URL` |
| `mise run db:seed` | Seed synthetic data (non-prod + LGPD gated) |
| `mise run db:seed:user` | Create the local dev login |
| `mise run db:reset` | Wipe and rebuild the local database |
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

Synthetic data only, vendored under [`seed/`](./seed/). The seed script sets `SEED_SYNTHETIC=1` and passes the non-prod gate automatically for `localhost` databases; pointing it at a non-local host additionally requires `I_HAVE_VERIFIED_NON_PROD=1`. Never commit real patient records. Never log patient fields to stdout, analytics, or error trackers.

## License

TBD.
