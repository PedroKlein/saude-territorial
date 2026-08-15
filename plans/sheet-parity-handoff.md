# Sheet Parity — Build Session Handoff

> **Paste this entire file as the first message in a fresh session.** The plan is
> written; this session picks a phase and executes it.

## Repo

**Path:** `/Users/i572543/Dev/github.com/PedroKlein/saude-territorial/main`
**Branch:** `main` — 4 commits ahead of `origin/main`, not yet pushed. Do NOT `git push` without explicit user OK.

## Where we are

The MVP is UX-complete. Previous session shipped:

- Address module (CEP autofill via ViaCEP, referência textarea, panel + wizard integration)
- `/pacientes` route with Lista + Qualidade tabs
- Sidebar reshape (Filtros / Visualização / Refinar) with density heatmap + microárea choropleth
- Coincidence picker, US-anchored route optimize, four bug fixes

Current schema: three condition layers (Gestantes/TB/HAS) with partial column coverage. The reference workbook (`Cópia PET de MODELO 2025 monitoramento usuários POR EQUIPE`) defines ten tabs and roughly 3× the columns we have. The gap plus an eventual XLSX importer is the subject of this plan.

## Session instructions

You are entering **build mode**. The plan already exists.

### Anchor docs to read first (in order)

1. `plans/sheet-parity.md` — the plan. LOCKED phases, per-tab column audit, six open decisions.
2. `AGENTS.md` — project rules, PT-BR/EN naming, synthetic-only data posture (§ Data Handling reframed last session).
3. `SPEC.md` — architectural decisions.
4. `plans/sheet-audit/README.md` — how the reference exports are organised.
5. `plans/sheet-audit/csv/*` — 10 CSVs, one per tab, full contents. These are the ground truth for column shapes.
6. `plans/sheet-audit/workbook.xlsx` — raw workbook if you need to see it in Excel/Numbers.
7. Existing schema: `src/db/schema/*.ts`, `src/lib/patients/schemas.ts`, `src/config/alert-rules.config.ts`, `src/config/layers.config.ts`.
8. Previous session's plans for context: `plans/ui-polish.md`, `plans/pivot-execution.md`, `docs/adr/ADR-001-drop-sheets.md`, `docs/adr/ADR-002-drizzle-orm.md`.

### Six decisions the parent left open

Answer these before starting. Defaults in parens.

1. **Enum naming**: PT-BR verbatim (`Abandono`) or English (`abandonment`)? (default: PT-BR verbatim, matches existing patterns)
2. **Puericultura mother-child link**: FK `mother_id` on `patients` + a `role` enum? Or separate `criancas` table? (default: FK on patients, `role` enum with `paciente` default)
3. **Institutions module**: separate table + module? Or a special patient type? (default: separate)
4. **Importer input format**: XLSX only or CSV set? (default: XLSX)
5. **Importer collision behaviour**: upsert-by-CNS or reject collisions? (default: upsert)
6. **Extend alert rules for new layers**: DM (HbA1c > 8, sem consulta 180d), Puericultura (vacina em atraso), Acamados (sem visita 30d)? (default: yes, add per phase — the LOCKED-4 rule was MVP-scoped)

If the user has answered any of these before you start, use their answers. Otherwise ask ONCE at the top of the session with all six batched, then proceed with defaults for whichever they skip.

### Which phase to run first

**Recommendation: Phase A — enum discipline + cross-field validation on existing fields.** No new columns, no new UI concepts, foundational for every subsequent phase. See `plans/sheet-parity.md § Phased execution § Phase A`.

If the user wants to prioritise import over correctness, alternative path is: `A → E-lite (importer covers only current schema) → B → C → D`.

Do NOT start on Phase C or D or E without A being complete. B can run before or after A but benefits from A's enum groundwork.

## Anti-instructions

Do NOT:
- Skip the six decisions.
- Reopen locked design decisions from previous sessions (palette, wizard shape, marker style, planner semantics — see `plans/ui-polish.md § Locked decisions`).
- Rewrite the alert engine — its shape is stable.
- Rewrite the geocoding pipeline — stable.
- Modify RLS policies without explicit user OK.
- `git push` or open PRs.
- Add features beyond the phase you're running. Cross-phase creep kills momentum.

## Locked decisions carried forward

From previous sessions, still binding:

- Aesthetic: DS-11 palette (OKLCH tokens in `src/app/globals.css`), Geist Sans/Mono, 4px rhythm.
- Framework: Next.js 16 App Router + Tailwind v4 CSS-first + shadcn/ui local + Drizzle + Zod.
- Data: Supabase Postgres source of truth (ADR-001), Drizzle-only DB access (ADR-002), synthetic-only data (AGENTS.md § Data Handling).
- Auth: Better Auth (Google OAuth, identity only) + @supabase/ssr session cookie.
- Alert rules: current 4 LOCKED for MVP; new rules per phase are allowed if user green-lit in decision #6.

## Environment

- Node 25 via `mise.toml`.
- `.env.local` at repo root; password rotates — if `pnpm dev` fails auth, grab a fresh string from Supabase Dashboard → Project Settings → Database.
- Boot: `mise x -- pnpm dev` then `http://localhost:3000/api/auth/dev-session?redirect=/map` for dev-session shortcut.
- Supabase project id `gplnvzxtqpqyznqiysza` (project `saude-territorial`). Migrations go through `supabase/migrations/*.sql` and are applied with the `supabase apply_migration` MCP tool.

## Success signal for THIS session

Depends on the phase picked:

- **Phase A** — every enum column is a real Postgres enum + Zod branded string; every cross-field rule fires with a PT-BR error; existing tests + suite (currently 272) still green; a new test file for validation covers each rule.
- **Phase B** — schema migrations for the missing Gestantes / HAS / TB columns land; wizard steps + panel cards render them; existing tests green, new tests for the added columns.
- **Phase C** — DM + Acamados + Expostas + Exame Pé Diabético extension tables + service-layer auto-link rules land; wizard + panel + sidebar filter chips wired.
- **Phase D** — `institutions` table + module + nav tab + map treatment for ILPI + PSE.
- **Phase E** — `/importar` page with preflight report + commit; per-tab parsers cover all ten; import_batches audit table; docs.

## First message to the user

Something like:

> Reading `plans/sheet-parity.md` and the audit CSVs now. Six open decisions before I start — batching them in one question. Also: which phase do you want first? Default recommendation is Phase A (enum discipline + validation).

Wait for the phase pick + decisions, then execute.
