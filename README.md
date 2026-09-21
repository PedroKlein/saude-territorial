# saude-territorial

An interactive map for primary-care health teams in Porto Alegre. It shows a team's patient records as map layers grouped by health condition, flags urgent cases, plans visit routes, and lets the team edit records directly in the app.

Built for GAT 4 (Grupo de Ação Territorial 4) in the PET-Saúde Digital program (UFRGS + SMS Porto Alegre), piloted at US Moab Caldas.

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
| Data | PostgreSQL via Drizzle ORM (persistent PGlite locally; native Postgres in production) |
| Auth session store | Better Auth in the same selected PostgreSQL database |
| Geocoding | Nominatim (OpenStreetMap) |
| Routing | OSRM |
| Package manager | pnpm |
| Task runner | mise |

## Getting started

You need [mise](https://mise.jdx.dev) and pnpm 9+. Docker is optional.

```bash
mise run setup   # installs deps, migrates local PGlite, seeds data, creates a dev login
mise run dev     # serves http://localhost:3000
```

Open http://localhost:3000/login and sign in with **dev@local.dev / dev12345**. That's it: no Docker, Supabase, Vercel, or Google account is needed to run locally.

`mise run setup` is safe to re-run. Application and authentication data persist in `.data/pglite/`; use `mise run db:reset` to rebuild the local database. The reset command never deletes unrelated files, including a legacy `auth.db`.

### Optional: sign in with Google

Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env.local` (identity-only, `openid email profile` scopes). When both are set, a "Entrar com Google" button appears next to the email/password form. Leave them unset and the app uses email/password only.

### Running with native Postgres locally

Docker is optional parity tooling, not part of the default development path:

```bash
mise run db:postgres:up
DATABASE_DRIVER=postgres DATABASE_URL=postgresql://saude:saude@localhost:5432/saude_territorial mise run db:migrate
```

Use `mise run db:postgres:reset` to recreate, migrate, and seed that disposable parity database.

### Running on your own server

Nothing here is tied to Supabase or Vercel. Production uses native Postgres: set `DATABASE_DRIVER=postgres` and point `DATABASE_URL` at the deployment database before starting the Next.js app on a Node runtime. Production rejects PGlite and fails fast when `DATABASE_URL` is missing.

## Commands

| Command | What it does |
|---|---|
| `mise run dev` | Dev server (Turbopack) |
| `mise run build` | Production build |
| `mise run test` | Vitest |
| `mise run lint` | ESLint |
| `mise run type-check` | `tsc --noEmit` |
| `mise run db:postgres:up` / `db:postgres:down` / `db:postgres:reset` | Manage the optional Docker Postgres parity database |
| `mise run db:migrate` | Apply Drizzle migrations to local PGlite or selected Postgres |
| `mise run db:seed` | Load synthetic patients (non-prod and LGPD gated) |
| `mise run db:seed:user` | Create the local dev login |
| `mise run db:reset` | Wipe and rebuild the local database |
| `pnpm db:generate` | Generate a Drizzle migration from schema changes |
| `pnpm db:studio` | Browse an explicitly configured Postgres database in Drizzle Studio |

## Documentation

- [SPEC.md](./SPEC.md): what the system does, the data model, and alert rules
- [CONTRIBUTING.md](./CONTRIBUTING.md): workflow, conventions, and how to verify changes
- [AGENTS.md](./AGENTS.md): repo structure and conventions (written for AI coding agents)
- [docs/roadmap.md](./docs/roadmap.md): post-MVP work
- [docs/gotchas.md](./docs/gotchas.md): non-obvious behavior across the stack
- [docs/adr/](./docs/adr/): architectural decisions

## Sister repo

[extensao-gat4](https://github.com/PedroKlein/extensao-gat4) holds the domain documentation, meeting reports, glossary, the original static prototypes, and the synthetic seed data this repo vendors under `seed/`.

## Data handling

All data is synthetic. The seed files live under `seed/` and the seed script sets `SEED_SYNTHETIC=1` for you. The fixed local PGlite database is allowed automatically; remote Postgres targets remain protected by the non-production gate in `scripts/lib/non-prod-gate.ts`. Never commit real patient records, and never log patient fields to stdout, analytics, or error trackers.

## License

TBD.
