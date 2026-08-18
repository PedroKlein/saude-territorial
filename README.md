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
| Data | Postgres, via Drizzle ORM (local Postgres runs in Docker) |
| Auth session store | Better Auth (SQLite via `better-sqlite3`) |
| Geocoding | Nominatim (OpenStreetMap) |
| Routing | OSRM |
| Package manager | pnpm |
| Task runner | mise |

## Getting started

You need [mise](https://mise.jdx.dev), pnpm 9+, and Docker.

```bash
mise run setup   # installs deps, starts Postgres in Docker, migrates, seeds data, creates a dev login
mise run dev     # serves http://localhost:3000
```

Open http://localhost:3000/login and sign in with **dev@local.dev / dev12345**. That's it: no Supabase, Vercel, or Google account is needed to run locally.

`mise run setup` is safe to re-run. If you only need to restart the database, `mise run db:up`.

### Optional: sign in with Google

Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env.local` (identity-only, `openid email profile` scopes). When both are set, a "Entrar com Google" button appears next to the email/password form. Leave them unset and the app uses email/password only.

### Running on your own server

Nothing here is tied to Supabase or Vercel. Point `DATABASE_URL` at any Postgres instance (a university host, managed Postgres, or your own box) and deploy the Next.js app to any Node runtime. The Docker Postgres is a local-development convenience, not a runtime dependency.

## Commands

| Command | What it does |
|---|---|
| `mise run dev` | Dev server (Turbopack) |
| `mise run build` | Production build |
| `mise run test` | Vitest |
| `mise run lint` | ESLint |
| `mise run type-check` | `tsc --noEmit` |
| `mise run db:up` / `db:down` | Start / stop the local Postgres container |
| `mise run db:migrate` | Apply Drizzle migrations to `DATABASE_URL` |
| `mise run db:seed` | Load synthetic patients (non-prod and LGPD gated) |
| `mise run db:seed:user` | Create the local dev login |
| `mise run db:reset` | Wipe and rebuild the local database |
| `pnpm db:generate` | Generate a Drizzle migration from schema changes |
| `pnpm db:studio` | Browse the database in Drizzle Studio |

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

All data is synthetic. The seed files live under `seed/` and the seed script sets `SEED_SYNTHETIC=1` for you; it also refuses to run against anything that doesn't look like a local or dev database (see `scripts/verify-non-prod-db.ts`). Never commit real patient records, and never log patient fields to stdout, analytics, or error trackers.

## License

TBD.
