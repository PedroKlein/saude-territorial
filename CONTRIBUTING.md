# Contributing to saude-territorial

## Before you start

- Read [README.md](./README.md) for setup and [SPEC.md](./SPEC.md) for the data model.
- All patient data is synthetic. Never commit real records; never log patient fields.

## Language conventions

- Code, comments, commit messages, type names, file names: **English**.
- User-facing UI text (labels, buttons, toasts, error messages): **Brazilian Portuguese**.
- Domain field names on patient records: **Portuguese** (`nomeCompleto`, `dpp`, `ig`, `dataUltimaAtualizacao`) — matches the reference workbook.

## Branching

- `main` is the integration branch; deploys to Vercel.
- Feature branches: `feat/<slug>`, `fix/<slug>`, `chore/<slug>`, `docs/<slug>`.
- Rebase onto `main` before opening a PR; keep history linear.

## Commits

- Conventional commits: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`.
- Imperative mood, English.
- Reference `SPEC.md`, an ADR, or `docs/roadmap.md` when the change is architectural.

## Pre-PR checklist

Run all four before pushing:

- `pnpm type-check`
- `pnpm lint`
- `pnpm test`
- `pnpm build`

For UI changes, manually verify the affected surface at http://localhost:3000. See [TESTING.md](./TESTING.md).

## Code style

- TypeScript strict mode. No `any`, no implicit returns, no unused variables.
- Prefer Server Components; use `"use client"` only when a component needs state, effects, or event handlers.
- Leaflet components must load via `dynamic(() => import(...), { ssr: false })` — Leaflet needs `window`.
- All database access goes through Drizzle in `src/db/`. Never call `.from(...)` on a Supabase client. See [ADR-002](./docs/adr/ADR-002-drizzle-orm.md).

## Comments

- Comments are a last resort. Code should read on its own.
- Explain **why**, never **what**. If a comment describes what the code does, rewrite the code.
- Load-bearing exceptions: LGPD/security warnings, links to external specs (RFCs, DATASUS algorithms), non-obvious workarounds for framework behavior.
- `TODO`/`FIXME` need a name and a reason.

## Testing

- Vitest for unit tests (logic, parsers, alert engine, Drizzle repositories).
- Playwright scripts under `scripts/` for multi-step flows.
- Test observable contracts and error paths. Don't test plumbing. Never export a symbol just to make it testable.

## Data safety

- Seed scripts require `SEED_SYNTHETIC=1` and `I_HAVE_VERIFIED_NON_PROD=1`.
- `pnpm db:push`, `db:migrate`, and `db:seed` are gated by `scripts/verify-non-prod-db.ts`. Do not disable this gate.
- LGPD: never commit real patient data. Never log patient fields anywhere the code could be deployed to production.

## Pull requests

- Open against `main`.
- Fill in what changed, why, and how you verified it.
- Green CI (type-check + lint + test + build) is required.
- Assign at least one reviewer from the extension group.

## Roadmap

Post-MVP work in progress: [docs/roadmap.md](./docs/roadmap.md).

## Architectural decisions

- [ADR-001](./docs/adr/ADR-001-drop-sheets.md) — Google Sheets dropped as source of truth
- [ADR-002](./docs/adr/ADR-002-drizzle-orm.md) — Drizzle ORM for data access

Add a new ADR under `docs/adr/` whenever a decision affects the whole app or reverses a prior one. Numbering is sequential.
