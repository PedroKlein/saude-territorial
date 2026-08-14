# UI Polish — Build Session Handoff

> **Paste this entire file as the first message in a fresh session.** Design is done; this session builds.

## Repo

**Path:** `/Users/i572543/Dev/github.com/PedroKlein/saude-territorial/main`
**Branch:** `pivot/execution-foundation` — design sketches committed here. Cut a new branch `ui/polish` off this before starting.
**Not pushed.** Do not `git push` without explicit user OK.

## Where we are

The MVP works. Design phase completed in the previous session:

- 7 grilling questions locked users, workflow, aesthetic direction, form structure, marker style, and the "patient is a patient" architecture reshape.
- Four sketches live under `src/app/(dev)/proto/*` — `/proto/panel`, `/proto/map`, `/proto/wizard`, `/proto/planner`. Each is a throwaway static route that renders in dev; each was validated with the user.
- The full execution plan lives at **`plans/ui-polish.md`**. Read it before doing anything else.

## Session instructions

You are entering **build mode**. Read the plan, then execute it phase by phase.

1. **Read anchor docs first, in this order:**
   - `plans/ui-polish.md` — the plan you're executing. LOCKED decisions and phase-by-phase acceptance criteria are there
   - `AGENTS.md` — repo overview, PT-BR/EN naming rule, tech stack
   - `SPEC.md` — architectural decisions
   - `plans/pivot-execution.md` — everything the previous plan delivered (especially the PE-2 schema section, so you know exactly which columns exist)
   - `docs/adr/ADR-001-drop-sheets.md` and `docs/adr/ADR-002-drizzle-orm.md`
   - `src/db/schema/*.ts` — the ground truth on extension-table columns
   - `src/config/layers.config.ts` and `src/components/panels/layerFields.ts` — the current form field surface (this plan expands it)
   - `src/config/alert-rules.config.ts` — the LOCKED 4 rules
   - `src/app/(dev)/proto/*` — the four validated sketches. Look at them in the browser (boot dev, visit `/proto`) as living design specs. They are deleted in Phase UP-7

2. **Load these skills** (via `read skill://<name>` up front):
   - `codebase-design` — the panel refactor is a "deepen this module" exercise
   - `go-testing` equivalent for the JS/TS stack: `tanstack-query`, `nextjs-patterns`, `leaflet-nextjs`
   - `typescript-strict` — Zod at the boundary, no `any`
   - `ptbr-conventions` — form labels, `dd/MM/yyyy`, `s/n` handling, impersonal tone
   - Any `shadcn`, `radix`, or `react-hook-form` skill in the registry

3. **Then execute `plans/ui-polish.md` phase by phase.** Phases are numbered UP-0 through UP-7. Do NOT skip phases; do NOT reorder. Within a phase, marked `⇉` tasks can be parallelized via `task` subagents. Between phases, checkpoint with the user unless they've explicitly delegated the entire plan.

## Anti-instructions

Do NOT:
- Re-open any locked decision (design system, palette, architecture reshape, schema). If a locked decision blocks you, flag it and stop; don't quietly change course.
- Add features not in the plan (dark mode, mobile responsive, new layers, weekly plans, per-ACS assignment, dashboard aggregation) — see the non-goals section
- Rewrite the API surface unless the plan explicitly asks you to. The `POST /api/patients`, `PATCH /api/patients/[id]`, `DELETE /api/patients/[id]` shapes are stable. UP-2.1 introduces one new endpoint (`GET /api/patients/[id]`); UP-6.6 introduces plan-persistence endpoints
- Rewrite the alert engine — LOCKED
- Rewrite the geocoding pipeline — LOCKED
- Migrate the schema outside the one addition described in UP-6.6 (`daily_plans` + `daily_plan_stops`). If a form field reveals a genuinely missing schema column, flag it and stop; don't silently add columns
- Modify RLS policies — LOCKED default-deny + session gates
- `git push` or open PRs — user drives that

## Locked decisions (from the design session — read plans/ui-polish.md for full context)

Aesthetic:
- **Palette (OKLCH):** brand teal `oklch(58% 0.10 195)`, rose gestante `oklch(72% 0.11 15)`, terracotta TB `oklch(60% 0.09 40)`, indigo HAS `oklch(60% 0.13 275)`, alert red `oklch(58% 0.19 25)`, alert amber `oklch(75% 0.14 75)`, OK green `oklch(65% 0.14 155)`, warm off-white bg `oklch(98.5% 0.005 90)`.
- **Typography:** Geist Sans (14/12/16 body/label/H2, 500/600 weights), Geist Mono for CNS/coordinates/timestamps only.
- **Spacing:** 4px rhythm; radii 4/6/10/999px; three shadow tiers (xs/sm/md).
- **Motion:** Framer Motion (`motion` package) — 200ms entrances, 150ms exits, 250ms layout. Lottie for the wizard success moment.
- **Icons:** lucide-react only.
- **Component library:** shadcn/ui generated locally under `src/components/ui/`; `react-imask` for CNS/phone/PA masks; shadcn Calendar for date pickers.
- **Theme:** permanent light. Dark toggle is deferred.

Architecture reshapes:
- **Patient is a patient.** One panel per patient identity; N collapsible condition cards below, one per attached extension row. Only render condition cards for conditions the patient actually has.
- **Wizard is shared** between "novo paciente" (identity → address → condições → data pages → confirmar → sucesso) and "adicionar condição" (condições → data pages → confirmar → sucesso). The condições step is a multi-select; one data page is inserted per chosen condition.
- **Panel = default right rail. Planner drawer replaces it when planning mode is active.**
- **Sidebar / right panel / legend are all independently collapsible.** Focus mode = all three hidden.

Wizard step conventions:
- Multi-select "Condições" (plural). "Adicionar" opens the wizard scoped to condition-selection only if the entry point is the existing panel.
- DPP and IG are computed and read-only in the UI (dashed-border, calculator icon). API boundary computes DPP from DUM; never accepts client-provided DPP.
- Alert-preview appears inline in the data step ("Regra de alerta ativada — risco alto colocará este paciente na lista de prioridades ao salvar").
- Success screen has a Lottie animation.

Map / marker conventions:
- **Chip markers:** rounded pill with layer icon + colored fill; small alert dot top-right when a rule triggers; coincidence badge bottom-right (number in dark pill) when N > 1 patients share the exact coordinate.
- **Clusters:** numbered bubble, white body, ring color = worst alert level in the cluster.
- **Redundant shape+color encoding** so alert states survive deuteranopia.
- **Basemap:** CartoDB Positron (or equivalent muted light theme).

Route planner conventions (A+B+C from Q3):
- **A (manual pick):** "+ Adicionar paciente" opens a searchable picker
- **B (filter-then-plan):** microárea / condition / alert-level chip filters + "Adicionar todos ao plano" bulk action
- **C (auto-suggest):** "Sugerir plano para hoje" button, scored by alert severity × recency
- **Numbered markers on the map** match the drawer stop order
- **OSRM route** drawn as a dashed indigo polyline (visually distinct from all layer/alert colors)
- **Foot/car profile switch** recalculates OSRM live
- **Save plan** via `daily_plans` + `daily_plan_stops` (schema addition in UP-6.6)

## Non-goals

- Dark theme (toggle scaffold only if trivial)
- Mobile / responsive layout — desktop-first
- New layers (Puericultura / DM / Acamados / PSE / ILPI stay deferred)
- Weekly / templated / per-microárea plan variants
- Real-time / collaborative editing
- Configurable alert rules via UI
- Dashboard aggregation view
- Import from XLSX / Sheet
- Accessibility audit beyond the color-blind marker encoding

## Environment

- Node 25 via `mise.toml`
- `.env.local` at repo root — password may rotate; if `pnpm dev` fails auth, grab the fresh string from Supabase Dashboard → Project Settings → Database
- Boot: `mise x -- pnpm dev` then `http://localhost:3000/api/auth/dev-session?redirect=/map` for dev-session shortcut
- Stack: Next.js 16 (App Router, Turbopack, `proxy.ts` for auth gate) + Tailwind v4 (CSS-first `@theme`) + Leaflet (react-leaflet v5, dynamic-imported) + TanStack Query v5 + Zustand v5 + Drizzle ORM

## Success signal

Reload plans/ui-polish.md's "Success signal" section. The 6 core flows work with the polished UI; sketches are deleted; every gate is green; user sees the app for the first time and feels like it was designed on purpose.

## First message to the user

Something like:

> Reviewing `plans/ui-polish.md` now. I'll start with Phase UP-0 (foundation and deps) and check in with you at each phase boundary. Any changes to the plan before I begin?

Then read the plan and start Phase UP-0.
