# Plan: Pivot Cleanup

> **This plan is NOT the pivot execution.** It is the cleanup that puts the repo in a state where the pivot execution can be planned cleanly.

## Destination

A repo where:

1. All Google-Sheets-as-source-of-truth code is deleted (client, discovery, parser, pipeline, URL config, on-behalf-of auth, cross-tab CNS conflict UI, sheet-write edit hook).
2. Auth is simplified to **identity-only** Google OAuth (no `spreadsheets` scope, no token refresh for Sheets).
3. `googleapis` dependency is removed.
4. All project docs (SPEC, AGENTS, README) describe the **new architecture** (Supabase as source of truth, in-app CRUD, static alert rules in code, seed from `extensao-gat4`).
5. All skill files (`.agents/skills/`) reflect the new architecture. `sheets-data-layer` deleted. `auth-betterauth`, `error-handling`, `supabase-patterns` rewritten.
6. An ADR captures the pivot rationale, linking the meeting summary and MVP doc.
7. The map still renders 34 synthetic patients via a **temporary in-code mock endpoint** (renamed from `/api/sheets/demo` to `/api/patients`). This is explicitly a placeholder to be replaced during pivot execution.
8. All quality gates pass: `pnpm type-check`, `pnpm test`, `pnpm lint`, `pnpm build`, `pnpm dev` boots and map renders.

## Non-goals (explicitly deferred to pivot execution plan)

- Designing the Supabase `patients` + extension-table schema
- Writing migration 004 for patient tables
- Building CRUD API endpoints (`POST/PATCH/DELETE /api/patients/[id]`)
- Building the add/edit patient forms
- Geocode-on-save flow
- Draggable-marker manual-pin correction
- Migrating seed data from `extensao-gat4` files into Supabase
- Reducing alert rules to the locked 4 (current 7-rule engine stays for now)
- CNS-exists-add-condition dialog
- Any UI/UX design work

The cleanup **must not** touch functionality that still works (map, layers, alerts, filters, priority list, stats, legend, routes) — only the parts of the old Sheets architecture that are unambiguously dead.

## Locked decisions (context for reviewers)

From the grilling session that produced this plan:

| Decision | Value |
|---|---|
| Source of truth | Supabase (was: Google Sheets) |
| Data ingress | In-app CRUD (was: bidirectional Sheet sync) |
| Editing model | Full CRUD in-app (add, edit, delete) |
| Deploy target | Vercel + Supabase cloud |
| Sheets code disposal | Delete entirely (not archive) |
| Demo mode disposal | Keep temporarily, migrate to Supabase during pivot execution |
| Extra layers | Keep 5 layer configs, seed only 3 (Gestantes, TB, HAS) |
| Priority layers | Gestantes, Tuberculose, HAS |
| Alert criteria | 4 static rules (defined in pivot execution, not this plan) |
| Geocoding | On save, blocking, with manual-pin fallback + drag-to-correct |
| CNS dedup | Unique + "add condition to existing patient" flow |
| Data model | Base `patients` + one extension table per condition |
| Data access layer | Drizzle ORM against Supabase Postgres (auth via `@supabase/ssr`) |
| Existing SQL migrations | Delete all — DB starts fresh during pivot execution |
| Seed source | `extensao-gat4` synthetic files |

## Phases

### Phase 1: Delete Sheets integration code

Rip out the parts of the Sheets architecture that are unambiguously dead. Keep demo mode temporarily.

**Tasks:**

- **T1.1** Delete `src/lib/sheets/` entirely
  - Files: `client.ts`, `client.test.ts`, `discovery.ts`, `discovery.test.ts`, `parser.test.ts`, `pipeline.ts`, `pipeline.test.ts`, `url-parser.ts`, `url-parser.test.ts`
  - **AC:** `ls src/lib/sheets` returns "No such file or directory". **Verify:** `test ! -d src/lib/sheets && echo ok`
  - **AC:** No source file imports from `@/lib/sheets` or `../sheets`. **Verify:** `grep -r "from.*['\"].*sheets" src --include='*.ts' --include='*.tsx'` returns no matches.

- **T1.2** Delete `src/app/api/sheets/route.ts` and its test
  - **AC:** Files gone. **Verify:** `test ! -f src/app/api/sheets/route.ts`

- **T1.3** Rename `/api/sheets/demo` → `/api/patients` (temporary mock endpoint)
  - Move `src/app/api/sheets/demo/route.ts` → `src/app/api/patients/route.ts`
  - Update any import paths and route handler URLs
  - Add a top-of-file comment: `// TEMPORARY: mock data source until Supabase pivot execution. See plans/pivot-cleanup.md.`
  - **AC:** `curl -s http://localhost:3000/api/patients` returns 34 synthetic patients as JSON.
  - **AC:** `/api/sheets/demo` no longer exists. **Verify:** `curl -sI http://localhost:3000/api/sheets/demo | head -1` shows 404.
  - **AC:** Directory `src/app/api/sheets/` no longer exists.

- **T1.4** Delete `src/components/settings/SpreadsheetConfig.tsx` and its test
  - **AC:** Files gone; no imports resolve to them. **Verify:** `grep -r SpreadsheetConfig src` returns no matches.

- **T1.5** Handle `src/app/(dashboard)/settings/page.tsx`
  - If the page only rendered `SpreadsheetConfig`: replace with a placeholder page ("Configurações — em breve") that returns valid JSX.
  - If it has other content: strip out SpreadsheetConfig usage only.
  - **AC:** Navigating to `/settings` in `pnpm dev` returns 200 and no runtime error. **Verify:** curl + visual check.

- **T1.6** Delete `src/components/panels/ConflictPanel.tsx`
  - This was the cross-tab CNS conflict-resolution UI. Not applicable with Supabase-as-source-of-truth.
  - **AC:** File gone; not imported anywhere. **Verify:** `grep -r ConflictPanel src` returns no matches.

- **T1.7** Delete `src/hooks/usePatientEdit.ts` and its test
  - This hook wrote patient edits back to Sheets. Replaced later by CRUD API mutations during pivot execution.
  - Detail panel currently uses this — stub the panel's edit action to a no-op with a `TODO: pivot execution` comment.
  - **AC:** File gone; PatientDetailPanel compiles without it. **Verify:** `pnpm type-check` passes.
  - **AC:** Clicking "Salvar" in the detail panel (if visible) does nothing visible but does not crash.

- **T1.8** Update `src/hooks/usePatientData.ts` to fetch from `/api/patients`
  - Change the queryFn URL from `/api/sheets/demo` (or wherever) to `/api/patients`
  - **AC:** `pnpm dev` shows the map with 34 markers (no regression from current state). **Verify:** screenshot.

- **T1.9** Update `src/components/map/MapWithData.tsx` if it references Sheets
  - Remove any imports from `@/lib/sheets` or `usePatientEdit`
  - **AC:** File compiles; map still renders. **Verify:** `pnpm type-check`.

- **T1.10** Delete legacy SQL migrations under `supabase/migrations/`
  - Files: `001_initial_schema.sql`, `002_rls_policies.sql`, `003_street_annotations.sql`
  - These describe the old architecture (`coordinates_cache`, `sync_metadata`, `manual_pins`, `route_history`, `user_preferences`, `street_annotations`) — all superseded by the new Drizzle-managed schema designed in pivot execution
  - **The running Supabase project's tables are NOT dropped by this step** — this only removes the migration history from the repo. The tables become orphaned; pivot execution will design a new schema in Drizzle and wipe/recreate the DB.
  - **Rollback path:** these files are preserved in git history. To recover, run `git log --diff-filter=D --summary -- supabase/migrations/` to find the deletion commit, then `git checkout <hash>~1 -- supabase/migrations/`. No separate archive folder is created — git IS the archive.
  - **What this task DOES NOT do (scope clarification):** This task performs `git rm` on schema *description* files. It does **not** run `DROP TABLE`, `pg_dump`, `drizzle-kit push`, or any command that connects to the Supabase project. The database and its contents are untouched. Any concern about "deleting patient data" or "wiping the DB" applies to a **future** pivot-execution task (which will introduce Drizzle-generated migrations and may recreate the schema) — that future task is where a real-data gate belongs, not here.
  - Any code that still references these tables at runtime (e.g., geocoding cache reads) must be either stubbed to no-op or documented in the code with a `TODO: Drizzle re-implementation in pivot execution` comment
  - **AC:** `ls supabase/migrations/` returns empty (or only a `.gitkeep`). **Verify:** `find supabase/migrations -name '*.sql'` returns 0 results.
  - **AC:** No test failures caused by missing tables. **Verify:** `pnpm test`.
  - **AC:** Deletion commit message references ADR-002 and includes the git-log rollback command in the body. **Verify:** `git log -1 --format=%B` on the deletion commit.

**Phase 1 acceptance:** All `sheets` imports gone from `src/`, except deliberate references in comments. Map still shows 34 markers. Legacy SQL migrations deleted.

**Files touched:** ~18 deletions, 4 modifications.

---

### Phase 2: Simplify auth

Remove Sheets-scope and token-refresh machinery.

**Tasks:**

- **T2.1** Remove `spreadsheets` scope from `src/lib/auth.ts`
  - Only `openid email profile` remains in the Google OAuth config
  - **AC:** `grep -i spreadsheets src/lib/auth.ts` returns no matches.

- **T2.2** Delete `src/lib/auth-refresh.ts` and its test
  - This handled Sheets token refresh. No longer needed since we don't call Sheets on-behalf.
  - **AC:** Files gone. **Verify:** `test ! -f src/lib/auth-refresh.ts`
  - **AC:** No imports resolve to it. **Verify:** `grep -r auth-refresh src` returns no matches.

- **T2.3** Simplify `src/app/api/auth/dev-session/route.ts`
  - Remove `googleapis` import if present
  - Remove any Sheets-token-fetching logic
  - Keep basic dev-session mechanic for local testing
  - **AC:** `grep googleapis src/app/api/auth/` returns no matches.

- **T2.4** Update `src/lib/auth.test.ts` and any auth tests referencing removed behavior
  - Remove assertions about Sheets scope, token refresh, on-behalf-of
  - **AC:** `pnpm test src/lib/auth.test.ts` passes.

- **T2.5** Verify login flow end-to-end
  - Manual smoke test: sign in with Google → redirected to `/map` → sees markers
  - **AC:** Login works. **Verify:** manual browser test with screenshot.

**Phase 2 acceptance:** Auth requests only identity scopes; no code path calls Sheets APIs.

**Depends on:** Phase 1 (must delete sheets-consuming code before auth can be safely stripped).

---

### Phase 3: Remove googleapis dependency

**Tasks:**

- **T3.1** Remove `googleapis` from `package.json` dependencies
  - **AC:** `grep googleapis package.json` returns no matches.

- **T3.2** Run `pnpm install` and verify lockfile updates cleanly
  - **AC:** `pnpm install` exits 0. `pnpm-lock.yaml` no longer references googleapis. **Verify:** `grep -c googleapis pnpm-lock.yaml` returns 0.

- **T3.3** Run `pnpm build` to confirm no lingering imports
  - **AC:** Build succeeds. **Verify:** exit 0.

**Depends on:** Phases 1 and 2 (both must remove googleapis imports first).

---

### Phase 4: Update skills

Skills live in `.agents/skills/` and shape how future agent sessions reason about this codebase. If they still describe Sheets-as-source-of-truth, every future planning session will drift back to the old model.

**Tasks:**

- **T4.1** Delete `.agents/skills/sheets-data-layer/` entirely
  - **AC:** Directory gone. **Verify:** `test ! -d .agents/skills/sheets-data-layer`

- **T4.2** Rewrite `.agents/skills/auth-betterauth/SKILL.md`
  - Drop: `spreadsheets` scope, `linkSocial` for incremental scope, on-behalf-of pattern, Sheets token refresh
  - Keep: basic Google OAuth, session handling, proxy.ts route protection
  - Update the description frontmatter so it no longer mentions Sheets triggers
  - **AC:** `grep -i "sheets\|spreadsheet" .agents/skills/auth-betterauth/SKILL.md` returns only historical/removed-context mentions (0-2 matches max, in a "removed as of pivot" note).

- **T4.3** Simplify `.agents/skills/error-handling/SKILL.md`
  - Drop the Google-Sheets-429-chain section
  - Drop Sheets-specific error classification examples
  - Keep general error-boundary, retry, toast patterns
  - **AC:** `grep -i "sheets\|429" .agents/skills/error-handling/SKILL.md` returns no matches (or only in a historical note).

- **T4.4** Rewrite `.agents/skills/supabase-patterns/SKILL.md`
  - Reframe: this skill is now about the **Supabase Auth boundary** (login, session, cookies via `@supabase/ssr`, proxy.ts refresh). Data access is handled by Drizzle, covered in a separate skill.
  - Drop `geocode_cache`, `sync_metadata`, write-then-cache examples
  - Drop CRUD examples using `@supabase/supabase-js` — those move to the new `drizzle-data-access` skill
  - Update description frontmatter to make the auth-only scope explicit
  - **AC:** SKILL.md scope is limited to auth/session. `grep -i "from.*supabase.*select\|from.*supabase.*insert" .agents/skills/supabase-patterns/SKILL.md` returns no matches (queries live in the Drizzle skill).

- **T4.6** Add `.agents/skills/drizzle-data-access/SKILL.md`
  - Placeholder skill covering the Drizzle-vs-Supabase-JS split: Drizzle owns all data queries/mutations, `@supabase/ssr` owns auth only. Includes: pattern for using generated types, base+extension join pattern, migration workflow (`drizzle-kit generate` + commit), where the DB connection lives.
  - Detail expected in pivot execution — this cleanup task just seeds the file with the boundary rules and description frontmatter so future sessions load it correctly.
  - **AC:** File exists with a valid frontmatter description and at least a boundary-rules section. **Verify:** read.

- **T4.5** Sanity-check the other skills for stale Sheet references
  - Files to skim: `lgpd-guard`, `nextjs-patterns`, `tanstack-query`, `testing-patterns`, `zustand-store`, `domain-model`, `geospatial`, `leaflet-nextjs`, `ptbr-conventions`, `tailwind-shadcn`, `typescript-strict`
  - Fix any that mention "Sheet is source of truth" or the write-then-cache pattern as the primary flow.
  - **AC:** `grep -r "source of truth\|write-then-cache" .agents/skills/` shows results consistent with the new architecture only.

**Phase 4 acceptance:** Any agent loading these skills reasons about Supabase-first architecture, not Sheets-first.

**Depends on:** None (parallel with Phases 1-3).

---

### Phase 5: Rewrite project docs

Update the human-readable documentation to match the new architecture.

**Tasks:**

- **T5.1** Rewrite `SPEC.md`
  - Replace the tech stack table's "Patient data" row: Google Sheets → in-app CRUD via Supabase Postgres
  - Add a new row: "Data access" → **Drizzle ORM** (queries, mutations, migrations via `drizzle-kit`)
  - Auth row: **@supabase/ssr** (Google OAuth identity only, no `spreadsheets` scope)
  - Rewrite the "Modelo de Dados" section: drop the tab-by-tab column tables (they were mapping Sheets tabs to layers), replace with the Supabase base + extension table model (structure only, exact columns TBD in pivot execution). Note: schema lives in `src/db/schema/*.ts` as Drizzle definitions; migrations generated via `drizzle-kit generate` and committed to `supabase/migrations/`.
  - Rewrite the "Fluxo de Dados" diagram: no more Sheets ↔ Next.js ↔ Supabase; now just Next.js ↔ Supabase
  - Rewrite the "Autenticação" section: identity-only Google OAuth, no on-behalf-of
  - Rewrite the "Sistema de Camadas" section: layers are code-defined (not auto-discovered from tabs)
  - Rewrite the "Sistema de Alertas" section: rules live in code (`alert-rules.config.ts`), not a Sheet tab
  - Rewrite the "Milestones" section: replace M1-M4 with the pivot-execution milestones (or a placeholder pointing to the pending pivot-execution plan)
  - Rewrite the "Decisões Arquiteturais" LOCKED section: replace with the 12 new locked decisions from the grilling session
  - **AC:** `grep -c "Google Sheets\|planilha\|sheets" SPEC.md` returns ≤ 3 (only in the "Deferred: import from spreadsheet" section and the extensao-gat4 references).
  - **AC:** New LOCKED section lists all 12 decisions with dates.
  - **AC:** SPEC.md reads coherently end-to-end. **Verify:** human read-through.

- **T5.2** Update `AGENTS.md`
  - Tech stack table: change "Patient data" row from `Google Sheets API v4` → `Supabase (Postgres)`. Remove the `App state DB` row (now redundant with primary DB).
  - Repo structure section: remove `src/lib/sheets/` directory listing. Remove `SpreadsheetConfig` from `src/components/settings/`.
  - Data flow section: rewrite the diagram; drop the OAuth on-behalf line
  - Architecture principles: rewrite principle 1 ("Google Sheets = source of truth") → "Supabase = source of truth. Import from spreadsheet is a future feature."
  - Drop principle 2 ("Write to Sheet first")
  - Drop principle 5 ("One tab = one layer"). Replace with "Layers are code-defined in `src/config/layers.config.ts`."
  - Domain knowledge section: keep the sheet-tab table but reframe as "Historical mapping — the team's spreadsheet tabs that inspired the layer model. In the new architecture these are database entities, not sheet tabs."
  - **AC:** `grep -c "Google Sheets\|planilha" AGENTS.md` returns ≤ 4 (only in the "Historical mapping" section and future-import references).
  - **AC:** AGENTS.md is internally consistent with SPEC.md. **Verify:** cross-read.

- **T5.3** Update `README.md`
  - Setup instructions: remove any Google Sheets API credential setup (client ID/secret for Sheets)
  - Remove any "paste your spreadsheet URL" step
  - Add a note about the pivot and link to `docs/adr/ADR-001-drop-sheets.md`
  - **AC:** `grep -c "spreadsheet\|sheets" README.md` returns ≤ 2 (only historical/deferred-feature references).

- **T5.4** Add `docs/adr/ADR-001-drop-sheets.md`
  - Sections: Status (Accepted, date), Context (the meeting summary + MVP doc key points), Decision (Supabase becomes source of truth), Consequences (positive + negative), Alternatives considered (kept bidirectional; import-then-abandon), References (link the meeting summary text and MVP doc from the earlier chat)
  - **AC:** File exists at that path. Contains all 5 sections. **Verify:** read.

- **T5.4b** Add `docs/adr/ADR-002-drizzle-orm.md`
  - Sections: Status (Accepted, date), Context (Supabase became source of truth via ADR-001; need typed data access for agent-friendly CRUD across `patients` + extension tables), Decision (Drizzle ORM for data; `@supabase/ssr` for auth boundary only; **delete legacy SQL migrations 001-003; new Drizzle-generated migrations start from 0001**), Consequences (positive: typed queries, no code-gen step, SQL-native migrations, no RLS-bypass footgun; negative: less mainstream than Prisma, PoC context accepts RLS deferral, orphaned tables in the running Supabase project until pivot execution wipes them), Alternatives considered (Prisma — RLS bypass footgun; Supabase-JS + generated types — stringly joins), **Rollback plan** (legacy migrations preserved in git history; recover via `git log --diff-filter=D -- supabase/migrations/` + `git checkout`; running-project tables can be restored from git-recovered SQL if needed), References (link the discussion excerpt)
  - **AC:** File exists at that path. Contains all 6 sections (including explicit Rollback plan). **Verify:** read.

- **T5.5** Replace `PLAN.md` with a stub
  - Content: "The original milestone plan (M1-M4 Foundation/Interaction/Planning/Polish) is invalidated by the pivot. See `docs/adr/ADR-001-drop-sheets.md` for context. The pivot cleanup plan is at `plans/pivot-cleanup.md`. The pivot execution plan will be added at `plans/pivot-execution.md` after cleanup completes."
  - **AC:** PLAN.md is 5-10 lines pointing to the ADR and the two plans.

- **T5.6** Update `PROGRESS.md`
  - Add a top-of-file section: "## PIVOT — YYYY-MM-DD" listing what's now dead (Sheets client, SpreadsheetConfig, spreadsheets scope, cross-tab CNS conflict UI, sheet-write edit flow, legacy SQL migrations) and what's still valid (map, layers, filters, alerts, priority list, stats, legend, routes, US marker)
  - Include the two ADR locks (drop Sheets, Drizzle)
  - **AC:** PROGRESS.md has the PIVOT section at the top. All "DONE" items are re-verified as still-valid or marked as "invalidated by pivot".

- **T5.7** Update `TESTING.md`
  - Remove references to deleted test files (`sheets/*.test.ts`, `SpreadsheetConfig.test.tsx`, `usePatientEdit.test.tsx`, `auth-refresh.test.ts`)
  - Remove any Sheets-mocking instructions
  - **AC:** `grep -c "sheets\|SpreadsheetConfig\|usePatientEdit" TESTING.md` returns 0.

**Phase 5 acceptance:** A new contributor reading only `README.md → AGENTS.md → SPEC.md → ADR-001` gets an accurate picture of the current architecture without any Sheets confusion.

**Depends on:** Phases 1, 2, 3 (deletions must be settled so doc updates reflect final file paths). Parallel with Phase 4.

---

### Phase 6: Verify clean state

Prove the cleanup is complete and non-regressive.

**Tasks:**

- **T6.1** `pnpm type-check` passes
  - **AC:** Exit code 0. **Verify:** run it.

- **T6.2** `pnpm test` passes
  - Deleted tests must be removed from the run, not silently skipped
  - **AC:** Exit code 0. Test count decreased by the removed files. No orphaned tests failing. **Verify:** run it, compare test count before/after.

- **T6.3** `pnpm lint` passes with no new suppressions
  - **AC:** Exit code 0. **Verify:** run it.

- **T6.4** `pnpm build` passes
  - **AC:** Exit code 0. **Verify:** run it.

- **T6.5** `pnpm dev` boots and map renders correctly
  - Manual smoke test: dev server starts → login flow works → map loads → 34 markers visible → layer toggle works → filters work → priority list shows patients → clicking a marker opens detail panel (read-only mode is fine)
  - **AC:** All the above work. **Verify:** screenshot of map with markers.

- **T6.6** Grep sweep: no stale Sheets references
  - **AC:** `grep -r "googleapis" src` returns 0 matches.
  - **AC:** `grep -r "spreadsheet" src --include='*.ts' --include='*.tsx'` returns 0 matches (or only in comments explaining historical context).
  - **AC:** `grep -r "from.*sheets/" src` returns 0 matches.
  - **AC:** `grep -r "sheets-data-layer" .` returns 0 matches.
  - **AC:** `find supabase/migrations -name '*.sql'` returns 0 results (legacy migrations deleted, no new ones yet — pivot execution adds them via Drizzle).

**Phase 6 acceptance:** All gates green; map is functional; no dead references remain.

**Depends on:** Phases 1-5 all complete.

---

### Phase 7: Handoff prompt with pbcopy

Generate a ready-to-paste prompt for the next agent session that will **plan** the pivot execution (not build it — planning first, matching the two-phase methodology this cleanup itself demonstrated).

**Tasks:**

- **T7.1** Write `plans/pivot-execution-handoff-prompt.md`
  - Content structure:
    1. Repo path (`/Users/i572543/Dev/github.com/PedroKlein/saude-territorial/main`)
    2. Instructions: enter plan mode, read the three anchor docs (`SPEC.md`, `docs/adr/ADR-001-drop-sheets.md`, `docs/adr/ADR-002-drizzle-orm.md`), then produce a pivot-execution plan
    3. Locked decisions summary (all 12+ locks, including Drizzle)
    4. Skills to load with rationale: `drizzle-data-access` (schema + queries), `tanstack-query` (mutation patterns), `leaflet-nextjs` (map integration), `geospatial` (Nominatim on-save), `lgpd-guard` (synthetic seed only), `ptbr-conventions` (UI text), `supabase-patterns` (auth boundary only), `nextjs-patterns` (API routes), `typescript-strict` (branded types for CNS)
    5. Seed data paths in `extensao-gat4` sister repo
    6. **Mandatory pre-DB-mutation gate:** any pivot-execution task that runs `drizzle-kit push`, `drizzle-kit migrate`, or otherwise mutates the running Supabase project MUST include a task-level pre-flight check that verifies the target Supabase project ID is non-production. Suggested implementation: a `scripts/verify-non-prod-db.ts` that reads `SUPABASE_URL` and refuses to proceed unless it matches a whitelisted dev/staging pattern OR a `SEED_SYNTHETIC=1 && I_HAVE_VERIFIED_NON_PROD=1` env-var pair is set. This gate blocks the destructive step, not the whole plan.
    7. Explicit non-goals reminder (mobile, e-SUS integration, AI, custom-layer creation, etc.)
    8. Reference back to this cleanup plan and the two ADRs
  - **AC:** File exists at that path with all 8 sections.

- **T7.2** Print the pbcopy command at end of run
  - Output to the user: `cat plans/pivot-execution-handoff-prompt.md | pbcopy` (macOS) with a note about `xclip -selection clipboard -in` for Linux
  - **AC:** The exact command appears in the final agent message.

**Phase 7 acceptance:** User has a one-command way to copy the handoff prompt into a fresh planning session for the pivot execution.

**Depends on:** Phase 6 complete.

---

## Ordering summary

```
P1 (delete sheets code + legacy migrations) ──┐
                                              ├──► P3 (remove googleapis) ──┐
P2 (simplify auth) ───────────────────────────┘                             │
                                                                            ├──► P6 (verify) ──► P7 (handoff)
P4 (update skills, add drizzle-data-access) ────────────────────────────────┤
                                                                            │
P5 (update docs, add ADR-001 + ADR-002) ────────────────────────────────────┘
```

## Risks

- **Detail panel edit action** (T1.7) — currently uses `usePatientEdit`. Stubbing to no-op means the "Salvar" button becomes a lie until pivot execution wires up `PATCH /api/patients/[id]`. Mitigation: hide the Save button entirely with a `TODO` comment during cleanup, restore during pivot execution.
- **Test suite health** — some tests may reference Sheet types transitively. Expect to spend time updating imports in the tests that survive.
- **`/settings` page** (T1.5) — if there's more in there than SpreadsheetConfig, don't nuke it blindly. Read first.

## Success signal

After this plan lands, the next planning session can start with:

> "The architecture is Supabase-as-source-of-truth. Read `SPEC.md` and `docs/adr/ADR-001-drop-sheets.md`. Now plan the pivot execution: schema design + CRUD API + edit forms + seed migration."

…and nothing in the repo will contradict that.
