# PLAN.md

> **This file has been superseded.**

The original milestone plan (M1 Foundation, M2 Interaction, M3 Planning, M4 Polish, all built on Google Sheets as source of truth) is **invalidated by the pivot** executed in August 2026.

## What replaced it

1. **[`docs/adr/ADR-001-drop-sheets.md`](docs/adr/ADR-001-drop-sheets.md)** — the decision to drop Google Sheets as source of truth.
2. **[`docs/adr/ADR-002-drizzle-orm.md`](docs/adr/ADR-002-drizzle-orm.md)** — the decision to use Drizzle ORM for data access.
3. **[`plans/pivot-cleanup.md`](plans/pivot-cleanup.md)** — the plan that removed the dead Sheets architecture from the code and docs. Executed August 2026.
4. **[`plans/pivot-execution.md`](plans/pivot-execution.md)** — the plan that built the new Supabase+Drizzle CRUD layer, edit forms, seed migration, and reduced alert rules to the locked 4. Executed August 2026.
5. **[`plans/ui-polish.md`](plans/ui-polish.md)** — the plan that takes the functional MVP to a coherent design system: shadcn/ui adoption, unified patient panel (V1 accordion), multi-condition wizard, chip markers, route-planner drawer. Companion handoff at [`plans/ui-polish-execution-handoff.md`](plans/ui-polish-execution-handoff.md).

Also see [`SPEC.md`](SPEC.md) for the current functional specification and locked architectural decisions.

## Where progress lives

Task-graph progress lives in `plan_tasks` under the plan name `saude-pivot-cleanup` (and, once created, `saude-pivot-execution`). Ad-hoc dev notes and milestone completions live in [`PROGRESS.md`](PROGRESS.md).

## Historical PLAN.md

If you need to reconstruct the pre-pivot milestone plan (M1-M4 across Google Sheets integration, alerts, routes, polish), recover from git:

```bash
git log --diff-filter=M -- PLAN.md
git show <hash>:PLAN.md
```

That plan is preserved in git history but does not describe the current architecture.
