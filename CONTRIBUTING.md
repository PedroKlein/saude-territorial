# Contributing to saude-territorial

## Before you start

Read the [README](./README.md) for setup and [SPEC.md](./SPEC.md) for the data model. All data in this project is synthetic; never commit real records and never log patient fields.

## Language conventions

- Code, comments, commit messages, type names, and file names are in **English**.
- User-facing UI text (labels, buttons, toasts, error messages) is in **Brazilian Portuguese**.
- Domain field names on patient records stay in Portuguese (`nomeCompleto`, `dpp`, `ig`, `dataUltimaAtualizacao`) to match the reference workbook.

## Branching and commits

`main` is the integration branch. Work on `feat/<slug>`, `fix/<slug>`, `chore/<slug>`, or `docs/<slug>`, rebase onto `main` before opening a PR, and keep history linear.

Use conventional commits (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`) in the imperative mood. Reference `SPEC.md`, an ADR, or `docs/roadmap.md` when a change is architectural.

## Code style

- TypeScript strict mode: no `any`, no implicit returns, no unused variables.
- Prefer Server Components. Reach for `"use client"` only when a component needs state, effects, or event handlers.
- Load Leaflet components with `dynamic(() => import(...), { ssr: false })`; Leaflet needs `window`.
- All database access goes through Drizzle. Postgres is reached only via the shared client in `src/db/client.ts`. See [ADR-002](./docs/adr/ADR-002-drizzle-orm.md).

## Comments

Comments are a last resort; code should read on its own. When you do comment, explain why, not what. The exceptions worth keeping are LGPD and security warnings, links to external specs (RFCs, DATASUS algorithms), and notes on non-obvious framework workarounds. A `TODO` or `FIXME` needs a name and a reason.

## Testing and verification

Passing tests is necessary but not the whole story. Unit tests check logic in isolation; you still have to run the app to know a change works for a real user.

Run the four gates before pushing:

```bash
mise run type-check
mise run lint
mise run test
mise run build
```

Write Vitest tests for logic (parsers, the alert engine, validation, Drizzle repositories). Test observable contracts and error paths, not plumbing, and never export a symbol just to make it testable.

For UI and API changes, verify against the running app. Start it with `mise run dev` and sign in at `/login` with `dev@local.dev / dev12345`.

- UI: the page renders styled (not raw HTML), buttons and navigations work, and protected pages redirect to `/login` when you're signed out.
- API: check it directly with a signed session cookie.

```bash
COOKIE=$(curl -s -D - http://localhost:3000/api/auth/dev-session 2>/dev/null \
  | grep "set-cookie.*session_token" \
  | sed 's/.*session_token=\([^;]*\).*/\1/')

curl -s -H "Cookie: better-auth.session_token=$(python3 -c "import urllib.parse; print(urllib.parse.unquote('$COOKIE'))")" \
  http://localhost:3000/api/patients

# The same call without the cookie should return 401, not 500.
```

`GET /api/auth/dev-session` is a development-only shortcut: it signs a session cookie for the first user in `auth.db` (the seeded dev user) and is disabled outside development.

## Data safety

- The `db:seed` scripts set `SEED_SYNTHETIC=1` for you. `scripts/verify-non-prod-db.ts` passes automatically for a `localhost` database; a non-local host additionally requires `I_HAVE_VERIFIED_NON_PROD=1`. Don't disable this gate.
- `db:migrate` and `db:seed` are gated by the same check.
- LGPD: never commit real patient data, and never log patient fields anywhere the code could run in production.

## Pull requests

Open PRs against `main`. Describe what changed, why, and how you verified it. Green CI (type-check, lint, test, build) is required, and at least one reviewer from the extension group should sign off.

## Architectural decisions

- [ADR-001](./docs/adr/ADR-001-drop-sheets.md): Google Sheets dropped as the source of truth
- [ADR-002](./docs/adr/ADR-002-drizzle-orm.md): Drizzle ORM for data access

Add a new ADR under `docs/adr/` whenever a decision affects the whole app or reverses a prior one. Numbering is sequential. Post-MVP work is tracked in [docs/roadmap.md](./docs/roadmap.md).
