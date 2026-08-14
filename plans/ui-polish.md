# Plan: UI/UX Polish

> **This is the follow-on to `plans/pivot-execution.md`.** Pivot execution shipped a functionally complete MVP (Supabase-as-source-of-truth via Drizzle, real CRUD, 4 locked alert rules, session-gated routes). This plan takes that MVP from "works" to "feels designed" — form/panel refactors, marker overhaul, route-planner drawer, wizard flow, and a design system that stops feeling like shadcn defaults.
>
> **Design phase is complete before this plan starts.** All decisions were validated against throwaway sketches under `src/app/(dev)/proto/*` in a preceding session; those sketches are load-bearing references for this plan and are deleted in the cleanup phase.

## Destination

A repo where:

1. **A cohesive light-theme design system is committed** — palette (calm teal brand, rose/terracotta/indigo condition accents, semantic red/amber/green alerts), Geist Sans/Mono typography scale, 4px spacing rhythm, discipline on radii and shadows. Tokens live in `src/app/globals.css` under Tailwind v4's `@theme` block.
2. **shadcn/ui is installed** and the required primitives are generated locally into `src/components/ui/`.
3. **Framer Motion (`motion`) drives all UI transitions** — panel/section collapse, wizard steps, drawer slide, marker entrance/exit. `lottie-react` handles the wizard success moment.
4. **`PatientDetailPanel` is rebuilt around the "a patient is a patient" model** — one panel per patient identity, N collapsible condition cards below (one per row present in `gestantes_data` / `tuberculose_data` / `has_data`). Cards render only for conditions actually attached. Rose/terracotta/indigo side stripes per condition, icon-in-colored-circle, "Mostrar campos avançados" reveal per section.
5. **A shared multi-step wizard replaces `PatientCreateForm` and `PatientEditForm` add-condition entry points.** New-patient flow: identidade → endereço/geocode → condições (multi-select) → data-page-per-condition → confirmar → sucesso (Lottie). Add-condition flow reuses the same wizard, starting at "condições", scoped by `alreadyAttached`.
6. **Form fields use proper components** — `react-imask` masks for CNS `000 0000 0000 0000`, phone `(00) 00000-0000`, PA `000/000`; shadcn Calendar + Popover for date pickers (single and range); `Select` with enumerated options for risco / tipo / forma clínica / TDO / etc.; `Command` combobox for microárea search.
7. **Cross-field validation via Zod refinements** — DPP is computed (not validated), IG is computed, `data_ultima_consulta ≤ today`, `data_proxima_consulta ≥ hoje`, `data_inicio ≤ data_encerramento`, `baciloscopia_primeira ≤ baciloscopia_segunda`, CNS = 15 digits + basic Luhn checksum. Wired into `POST` and `PATCH` handlers; surfaced client-side via `react-hook-form` + `zodResolver`.
8. **Map markers are chip-style** — rounded pill with layer icon and colored fill, small alert dot top-right when a rule triggers, coincidence badge bottom-right when N > 1 patients share coordinates. Clusters are numbered bubbles colored by worst alert level in cluster. Basemap tiles switch to CartoDB Positron (or equivalent muted light theme) so markers dominate.
9. **Sidebar, right panel, and legend are collapsible** with pip-toggle affordances on the map edges. A "focus mode" strips the app down to just the map when needed.
10. **Route planner becomes a first-class second mode** — right-side drawer with three flows (A) manual pick, (B) filter-then-plan chips, (C) "Sugerir plano para hoje" auto-suggest. Ordered stops with drag-to-reorder, numbered markers on the map matching the drawer, dashed OSRM route line in an accent color distinct from all layer/alert colors. Foot/car profile switch. Save-plan persists via a small schema addition.
11. **A dashboard chrome refresh** — teal-square logo, quiet header, sidebar with search + layer toggles + priority list + "Planejar visita" CTA, right-panel host reserved for detail or planner drawer depending on mode.
12. **The 6 core flows still work** — auth → map, click marker → panel, new patient wizard, edit patient, add condition to existing, delete patient. All existing tests still pass; new tests cover the added invariants and the panel/wizard render logic.
13. **`src/app/(dev)/proto/*` is deleted** in the cleanup phase, after each sketch has been promoted to a real component.
14. **All quality gates pass:** `pnpm type-check`, `pnpm test`, `pnpm lint`, `pnpm build`, plus a manual browser smoke test on the 6 flows.

## Non-goals (explicitly deferred beyond this plan)

- Dark theme (add a toggle scaffold only if trivial; visual dark-mode work is a separate pass)
- Mobile / responsive layout — desktop-first per Q1 ("planejamento na US")
- New layers (Puericultura, DM, Acamados, PSE, ILPI — remain in `LAYER_CONFIG`, deferred)
- Weekly / templated / per-microárea plan variants (Q3, Phase 2)
- Assigning plans to specific ACS agents in a persisted way (single-user assumption for MVP planner)
- Real-time / collaborative editing
- Configurable alert rules via UI (LOCKED 4 rules stay)
- e-SUS APS integration
- Dashboard aggregation view (charts, temporal trends)
- Import from XLSX/Sheet
- Accessibility audit beyond the color-blind-safe redundant shape+color marker encoding
- Change the auth flow, alert engine, or Drizzle data-access model

## Locked decisions (context for reviewers — do NOT re-litigate)

Design phase decisions from the preceding session:

| # | Decision | Source |
|---|----------|--------|
| DS-1 | Desktop-first, US-based planning workflow, two personas (editor + planner) share one UI | Q1 |
| DS-2 | Map is always central; sidebar and right panel are collapsible rails | Q2, Q4 |
| DS-3 | A patient is a patient — identity + N condition cards, never layer-scoped panels | Q5b |
| DS-4 | Only render a condition card when the patient has a row in that extension table | Q5b refinement |
| DS-5 | Multi-condition wizard — "Condições" (plural) with multi-select, one data page per chosen condition | Q5b refinement |
| DS-6 | Wizard is reused for both "novo paciente" and "adicionar condição"; the latter is called from the panel and from CNS-collision on create | Q5a + Q5b |
| DS-7 | Sketch-validated V1 accordion for the panel (Notion-style side stripe) | `/proto/panel` |
| DS-8 | Sketch-validated marker style: chip + icon + alert dot + coincidence badge; clusters = numbered bubble ring-colored by worst alert | `/proto/map` |
| DS-9 | Sketch-validated planner drawer with A+B+C flows and drag-to-reorder | `/proto/planner` |
| DS-10 | Aesthetic: Notion warmth + Felt spatial confidence + Datawrapper editorial clarity, permanent light theme | Q6 |
| DS-11 | Palette (OKLCH): brand teal `oklch(58% 0.10 195)`, rose gestante `oklch(72% 0.11 15)`, terracotta TB `oklch(60% 0.09 40)`, indigo HAS `oklch(60% 0.13 275)`, alert red `oklch(58% 0.19 25)`, alert amber `oklch(75% 0.14 75)`, OK green `oklch(65% 0.14 155)`, warm off-white bg `oklch(98.5% 0.005 90)` | Q6 |
| DS-12 | Typography: Geist Sans (14/12/16 body/label/H2, 500/600 weights), Geist Mono for CNS / coordinates / timestamps only | Q6 |
| DS-13 | Iconography: lucide-react only, 16px dense / 20px comfortable / 24px touch | Q6 |
| DS-14 | Motion: Framer Motion primary (200ms entrances, 150ms exits, 250ms layout), Lottie for hero moments, CSS transitions for hover/focus | Q6 |
| DS-15 | Component library: shadcn/ui generated locally; masked inputs via `react-imask`; date picker via shadcn Calendar (wraps react-day-picker) | Q6 follow-up |
| DS-16 | Redundant shape+color encoding for markers so alert states survive deuteranopia (dot + icon + color) | Q4 rec |

Design decisions inherit and do NOT override any locked SPEC or ADR decision from pivot-execution (Drizzle, session gates, RLS default-deny, LOCKED alert rules, base+extension model, geocode-on-save, CNS unique + adicionar-condição flow).

## Schema additions

Two small additions (both nullable and safe to defer if scope expands):

**UP-7a — `daily_plans` + `daily_plan_stops` (required for "Salvar plano")**

```sql
CREATE TABLE daily_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  acs_name TEXT,
  profile TEXT NOT NULL CHECK (profile IN ('foot', 'car')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE daily_plan_stops (
  plan_id UUID NOT NULL REFERENCES daily_plans(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
  stop_order INTEGER NOT NULL,
  PRIMARY KEY (plan_id, stop_order)
);
```

If the persistence work sprawls (per-ACS assignment, completion tracking, recurrence), scope back to ephemeral plans + client-side "Exportar PDF" via `html2canvas` or similar, and flag `daily_plans` as post-MVP.

**No other schema changes.** Extension-table columns already cover the full field set the wizard exposes (see `plans/pivot-execution.md` PE-2). "Mostrar campos avançados" toggles surface columns that were already there.

## Anchor docs (read in this order)

1. `AGENTS.md` — repo overview, PT-BR/EN naming rule, tech stack
2. `SPEC.md` — LOCKED architectural decisions
3. `plans/pivot-execution.md` — everything the previous plan delivered, especially the schema section (PE-2) so you know what's already there
4. `docs/adr/ADR-001-drop-sheets.md` and `docs/adr/ADR-002-drizzle-orm.md`
5. `src/db/schema/*.ts` — ground truth on what columns exist per condition
6. `src/config/layers.config.ts` and `src/components/panels/layerFields.ts` — the current form field surface (partial; this plan expands it)
7. `src/config/alert-rules.config.ts` — the LOCKED 4 rules
8. `src/app/(dev)/proto/*` — the four validated sketches, one per major surface

## Prerequisites — environment

- Node 25 via `mise.toml`
- `.env.local` at repo root (Supabase URL/keys + Better Auth secret; password may rotate between sessions — grab from Supabase Dashboard → Project Settings → Database if `pnpm dev` fails auth)
- Boot: `mise x -- pnpm dev` then `http://localhost:3000/api/auth/dev-session?redirect=/map`
- Branch: `pivot/execution-foundation` is where design/sketches live. Start this work on a new branch off `pivot/execution-foundation` — suggest `ui/polish` — and rebase onto master only after Phase UP-3 lands, so early commits stay isolated if we need to back out.

## Phased execution

Each task carries its own acceptance criteria. Phases run in order; tasks within a phase can be parallelized via `task` subagents where marked (⇉).

---

### Phase UP-0 — Foundation and deps

**UP-0.1 — Install dependencies**

Install (as regular deps unless flagged dev):
- `motion` (Framer Motion — the successor package name)
- `lottie-react`
- `react-imask`
- `react-hook-form`
- `@hookform/resolvers` (for Zod integration)
- `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` (drag-to-reorder in planner)
- (shadcn brings `react-day-picker`, `@radix-ui/*` primitives transitively — no manual install)

Acceptance: `pnpm install` clean, `pnpm type-check` green, `pnpm build` green.

**UP-0.2 — Initialize shadcn/ui**

- Run `pnpm dlx shadcn@latest init` (choose Tailwind v4 + CSS variables profile). Answer prompts to place components under `src/components/ui/` matching AGENTS.md convention.
- Confirm `components.json` is committed with `style: "new-york"`, `baseColor: "neutral"`, and paths match `src/`.

Acceptance: `src/components/ui/` exists (empty). `components.json` at repo root.

**UP-0.3 — Generate shadcn primitives** ⇉

Generate these components in one batch:
```
button input label textarea select checkbox radio-group
popover calendar command dialog sheet tabs accordion
badge alert toast tooltip separator scroll-area
```

Acceptance: Each file present under `src/components/ui/`, TypeScript compiles, no runtime error importing any of them from a smoke test route.

**UP-0.4 — Lift design tokens into `globals.css`**

Replace the current `@theme` block in `src/app/globals.css` with the DS-11 palette. Preserve the `@source inline(...)` guard so dynamically-assembled `bg-*` classes survive tree-shaking, but update its class list to the new color tokens.

Concrete tokens to define:
- `--color-background`, `--color-surface`, `--color-border`, `--color-text-primary`, `--color-text-secondary`
- `--color-brand` (teal), `--color-brand-hover`
- `--color-alert-red`, `--color-alert-amber`, `--color-ok-green`
- `--color-gestante`, `--color-tuberculose`, `--color-hipertensao` (condition accents — replaces the current `--color-layer-*` set for the three MVP layers; leave the deferred layer colors defined but unused)
- Radii and shadows follow the DS-11 spec.

Update `src/config/layers.config.ts` so `colorToken` values match the new custom-property names. Do NOT delete the layers we're not seeding.

Acceptance: The `/map` route boots and renders. Colors may drift from the current look; that is expected. No visual regressions in the sense of blank / broken UI.

---

### Phase UP-1 — Reusable primitives

**UP-1.1 — Masked input wrappers** ⇉

Create `src/components/ui/masked-input.tsx` exporting `CnsInput`, `PhoneInput`, `PressureInput`. Each wraps `react-imask` `IMaskInput` with the shadcn `Input` styling.

Acceptance: A dev smoke route or Storybook-style test renders each; typing enforces the mask; onChange emits the unmasked value + the masked display.

**UP-1.2 — DatePicker components** ⇉

Create `src/components/ui/date-picker.tsx` — a shadcn `Popover` + `Calendar` compound that:
- Accepts a `Date | null` value and `onChange`
- Formats display as `dd/MM/yyyy` (PT-BR)
- Supports `min` / `max` bounds
- Has a `DateRangePicker` sibling for the `mode="range"` case (baciloscopia 1ª/2ª, treatment início/encerramento)

Acceptance: Picker opens on click, keyboard navigation works, PT-BR locale is applied via `date-fns/locale/pt-BR`.

**UP-1.3 — `Field` compound and `Computed` display**

Create `src/components/panels/Field.tsx` — a `<div>` with a small-caps label, description hint, and error slot. Used by both edit form and wizard.

Create `src/components/panels/Computed.tsx` — the dashed-border display for read-only computed values (DPP, IG). Includes the small calculator icon from lucide.

Acceptance: Type signatures match how `PatientEditForm` and `wizard` will consume them.

**UP-1.4 — Zod refinements**

Extend `src/lib/patients/schemas.ts` (created in pivot execution PE-6) with `.refine()` blocks:

- Base patient: CNS regex `/^\d{15}$/` + Luhn checksum helper (deterministic per SUS specification — `computeCnsChecksum` in `src/lib/patients/cns.ts` new file)
- Gestante: `dum` present when `dpp` is present; on the API boundary, compute DPP as DUM + 280 days rather than accepting client-provided values. Refine `dataUltimaConsulta <= today`.
- TB: `dataInicio <= encerramentoData` when both set; `baciloscopiaPrimeiraData <= baciloscopiaSegundaData` when both set.
- HAS: `dataUltimaConsulta <= today`.

Also add `src/lib/patients/dates.ts` with `computeDpp(dum: Date): Date` and `computeIg(dum: Date, at?: Date): { weeks: number; days: number }`.

Acceptance: New tests in `src/lib/patients/schemas.test.ts` and `src/lib/patients/dates.test.ts` cover happy path + at least one failing case per refinement.

---

### Phase UP-2 — PatientDetailPanel refactor (biggest slice)

**UP-2.1 — Backend: patient-with-all-conditions endpoint**

Currently `usePatientData` fetches per-layer arrays. The unified panel needs a single-patient endpoint returning identity + every attached condition in one payload.

Add `GET /api/patients/[id]` that returns:
```ts
{
  id, nomeCompleto, cns, dob, endereco, latitude, longitude,
  microarea, telefone, vulnerabilidades, updatedAt, geocodeStatus,
  gestante: GestanteData | null,
  tuberculose: TuberculoseData | null,
  has: HasData | null,
}
```
Session-gated per pivot execution PE-7. The `POST` / `PATCH` / `DELETE` handlers stay as-is.

Acceptance: `curl` with a valid dev session returns the shape above; 404 when patient not found; 401 when unauthenticated.

**UP-2.2 — New `PatientDetailPanel` (V1 accordion)**

Rewrite `src/components/panels/PatientDetailPanel.tsx` per `/proto/panel` V1:

- Identity block at top: avatar (teal circle with initials), nome, age + DOB + microárea, alert chips (redundant color+icon), endereco line, telefone line, CNS mono, vulnerabilidades in amber callout if present
- Condition cards below — one per non-null extension row — using shadcn `Accordion` with `type="multiple"` so several can stay open. Each card carries:
  - Rose (`--color-gestante`) / terracotta (`--color-tuberculose`) / indigo (`--color-hipertensao`) `border-left-color` 3px
  - Colored icon-circle in the header (Baby / Lungs / HeartPulse)
  - Section title + condition-specific meta line (e.g. "38 sem · risco alto")
  - Field grid using `Field` primitive
  - "Mostrar campos avançados" reveal — sub-accordion or toggle-driven state — exposes the columns kept out of the default view
- Footer: "+ Adicionar condição" (opens wizard in `cond` mode), "Editar paciente" (flips fields to inputs — see UP-2.3), "Excluir paciente" behind `ConfirmDialog`

Update `useMapStore.selectedPatient` semantics from `cns` to `patientId`. Migrate call sites.

Acceptance: Clicking a marker for a patient with 2 conditions shows both cards. Collapsing/expanding animates via Framer Motion. Old tests updated to the new shape.

**UP-2.3 — Panel edit mode**

Wire an `isEditing` flag into the panel. When enabled:
- Identity fields become `Input` / `DatePicker` / `Select`
- Each open condition card's fields become editable
- Per-card "Salvar condição" and "Cancelar" — or a global "Salvar" at the panel footer for identity + all open cards
- Use `react-hook-form` + `zodResolver`
- On save: PATCH `/api/patients/[id]` for identity; PATCH `/api/patients/[id]/conditions/[cond]` for each condition row (add these routes if PE didn't already, mirroring the existing PATCH shape)

Acceptance: Editing a Gestante's DUM live-updates the computed DPP/IG display without a save; save persists; error state highlights the failing field.

**UP-2.4 — Delete-condition affordance**

Each condition card has a subtle "Remover condição" action inside a `DropdownMenu` in the card header. Confirms via `ConfirmDialog`. On success, the card animates out via Framer Motion `exit` animation.

Acceptance: Patient with 2 conditions can lose one; the remaining card persists; the mapStore refreshes without re-selecting.

---

### Phase UP-3 — Wizard flow

**UP-3.1 — Wizard shell** ⇉

Extract from `/proto/wizard` into `src/components/wizard/Wizard.tsx`. Generic shell taking a `steps: Step[]` array, `currentStepId`, `onNext` / `onBack`, and the rendered step content. Handles the modal shell, step indicator (colored progress bars with labels), and footer navigation.

Acceptance: Rendering the shell with a 3-step mock renders the modal cleanly.

**UP-3.2 — Step components** ⇉

Each step is a component under `src/components/wizard/steps/`:
- `StepIdentidade` — uses `CnsInput`, `PhoneInput`, `DatePicker`, `Select` for sexo, `Textarea` for vulnerabilidades
- `StepEndereco` — text input for endereco + `Select` for MA + geocode preview panel with a mini-map (reuse `react-leaflet` in a small container). The preview shows the resolved coordinate and offers "Ajustar pino manualmente" which enters a drag-a-pin state (deferred to PATCH stage today, per current behavior — flag in comments)
- `StepEscolherCondicoes` — multi-select with checkboxes per `/proto/wizard`. Shows `alreadyAttached` for the "cond" flow and disables those options
- `StepDadosGestante`, `StepDadosTB`, `StepDadosHAS` — condition-specific forms. `StepDadosGestante` includes the computed DPP/IG display and the inline "Regra de alerta ativada" preview when `risco = "alto"`
- `StepConfirmar` — final summary with the identity card + condition cards preview
- `StepSucesso` — Lottie animation (a suitable green-check animation from `lottiefiles.com` bundled under `public/lottie/success.json`; keep it small) + "Ver no mapa" and "Adicionar outra condição" actions

Each step exposes a Zod schema; the wizard shell validates on step transition and refuses to advance on invalid data (`react-hook-form` errors displayed inline).

Acceptance: Every step renders in isolation via a dev route; happy path completion (via headless browser navigation) POSTs a valid patient payload.

**UP-3.3 — `PatientWizard` glue**

`src/components/wizard/PatientWizard.tsx` composes the shell + steps for both flows (`mode: "new" | "add-condition"`).

For `mode: "new"`:
- Steps: identidade → endereco → condicoes → (data pages, one per chosen condition) → confirmar → sucesso
- On save: POST `/api/patients` with identity + address + first condition (whichever comes first in the chosen order); after the response, PATCH additional conditions if there are >1
- If POST returns 409 (CNS collision), switch mode mid-flow to "add-condition" scoped to the existing patient (open the same wizard, but at the `condicoes` step with `alreadyAttached` from the collision payload)

For `mode: "add-condition"`:
- Steps: condicoes → (data pages) → confirmar → sucesso
- Save: PATCH `/api/patients/[id]` for each new condition row (or POST `/api/patients/[id]/conditions` — introduce this if it's cleaner than overloading PATCH; discuss with the current API surface)

Acceptance: The `AddPatientButton` in the dashboard header opens the wizard in `new` mode. The panel's "+ Adicionar condição" opens it in `add-condition` mode. A `create-then-add-more` browser smoke test covers both.

**UP-3.4 — Retire old forms**

Delete `PatientCreateForm.tsx` and `PatientEditForm.tsx`. Migrate any residual utility functions they contained.

Acceptance: No dangling imports. `pnpm type-check` and `pnpm test` green.

---

### Phase UP-4 — Map surface polish

**UP-4.1 — Chip marker** ⇉

Replace the current `L.divIcon`-based marker in `src/components/map/MarkersLayer.tsx` (or equivalent) with a `divIcon` rendered via `renderToStaticMarkup` from the sketch's `Marker` component. Ensure:
- Layer color from the palette (via CSS custom-property lookup)
- Alert dot top-right when the patient satisfies at least one rule
- Coincidence badge bottom-right when N > 1 patients share the exact coordinate (compute in a memoized aggregator over the fetched data)
- Redundant shape or icon per condition survives the color-blind test

Acceptance: 68 seeded patients render with correct color, alerts, and coincidence badges when they overlap. Deuteranopia simulation (Chrome DevTools rendering panel) keeps the alert states legible.

**UP-4.2 — Cluster style**

Replace `react-leaflet-cluster`'s default cluster with a custom `iconCreateFunction` that produces the numbered-bubble style from the sketch: white circle, dark number, colored ring where color = worst alert level in the cluster (red > amber > neutral).

Acceptance: Zooming out visibly clusters, click behavior expands, cluster ring color reflects the highest alert in the group.

**UP-4.3 — Sidebar / panel / legend collapse**

Add `showSidebar`, `showPanel`, `showLegend` state at the dashboard layout level (or use a new `useUiStore` under `src/stores/`). Add pip-toggle buttons on the map edges when any is hidden. Legend has an inline `X` when visible and a floating `?` button when hidden.

Acceptance: Each rail collapses independently with a 250ms Framer Motion slide. Focus mode = all three hidden.

**UP-4.4 — Basemap swap**

Update the TileLayer URL to CartoDB Positron (`https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png` — CC-BY attribution, still OpenStreetMap-derived). Verify attribution string reflects the change.

Acceptance: Map visually calmer; markers pop against the muted basemap.

**UP-4.5 — Microárea outline overlay**

Wire the existing `territories/` GeoJSON into a `LayerGroup` that renders MA outlines as teal-dashed polygons. Toggle behavior: when a MA is filtered / selected in the sidebar (or in the planner filter), only that MA's outline highlights; others fade.

Acceptance: Selecting "MA 07" in the layer sidebar highlights that outline; deselecting shows all.

---

### Phase UP-5 — Sidebar refresh

**UP-5.1 — Search + layer toggles + priority list**

Rebuild the left sidebar per `/proto/map`:
- Search input with lucide-search icon, focus ring in brand teal, live filter over `usePatientData`
- Layer toggles: three rows for Gestantes / TB / HAS, each with icon-in-colored-square + label + count. Click toggles visibility of that layer's markers on the map
- Priority list: hoisted from wherever it currently lives; row style per sketch (alert dot + condition badge + name + meta + MA)
- "Planejar visita" button in a footer strip, brand teal, opens the planner drawer

Acceptance: Toggling layer G hides gestante markers immediately; search returns matches and clicking a result selects that patient and pans the map.

---

### Phase UP-6 — Route planner drawer

**UP-6.1 — Drawer shell**

Extract from `/proto/planner` into `src/components/planner/PlannerDrawer.tsx`. Uses shadcn `Sheet`, right-aligned, 400px, replaces the patient detail panel while planning mode is active. State: `usePlannerStore` under `src/stores/`.

**UP-6.2 — Auto-suggest**

`src/lib/planner/suggest.ts` implements:
```ts
function suggestPlan(patients: Patient[], today: Date, cap = 8): Stop[] {
  // score = alert_severity_weight + days_since_last_visit_weight
  // sort desc, cap, greedy re-order for spatial locality via haversine
}
```

Locked severity weights:
- Red alert = 100
- Amber alert = 50
- No alert = 0
- Days since last visit contributes `min(days / 180, 1) * 20` (bounded)

Acceptance: Given the 68 seeded patients, "Sugerir plano para hoje" yields a plausible 8-patient list where red alerts dominate the top; unit test covers the ranking.

**UP-6.3 — Filter chips**

Microárea / condition / alert-level chip filters at the top of the drawer. Selected chips filter the "candidates" the "Adicionar todos" bulk action operates on. Chips also drive the `dim` state on non-planned markers.

**UP-6.4 — Drag-to-reorder**

Wire `@dnd-kit/sortable` into the stop list. Each stop row uses the grip icon; drag reorders; OSRM route regenerates on drop.

**UP-6.5 — Profile switch + OSRM regeneration**

Foot / car pill toggle. On change, refetch OSRM with the appropriate profile URL. Distance/time in the stats strip updates.

**UP-6.6 — Save plan**

- Migration `0004_daily_plans.sql` (or the next unused index) per the schema addition above
- POST `/api/plans` with `{ date, acs_name?, profile, notes?, stops: [{ patient_id, order }] }` returning the new plan id
- GET `/api/plans` lists (paginated later; MVP returns last 30 days)
- Sidebar "Planejar visita" gains a subtitle showing "3 planos salvos" once any exist; clicking opens a lightweight plan-picker to reload one

Acceptance: Save + reload round-trips; the loaded plan re-renders identical stops in the drawer and route on the map.

---

### Phase UP-7 — Cleanup + verification

**UP-7.1 — Delete sketches**

Remove `src/app/(dev)/proto/` entirely. Remove any lingering `next.config.ts` allowances if we added them.

**UP-7.2 — Retire dead code**

- `src/lib/demo-data.ts` — should already be gone from pivot execution, but sanity-check
- Any layer-scoped detail-panel utilities superseded by unified panel
- Any legacy alert-chip components superseded by new palette-driven ones

**UP-7.3 — Run all gates**

```
pnpm type-check
pnpm lint
pnpm test
pnpm build
```

All green before proceeding.

**UP-7.4 — Manual browser smoke on the 6 core flows**

1. Auth → `/map`, map loads with markers
2. Click a marker → unified panel opens with all attached conditions expanded
3. New patient wizard: identity → address (geocode preview succeeds) → condições (multi-select) → data pages → confirmar → sucesso (Lottie plays)
4. CNS collision on create → wizard switches to add-condition mode against existing patient
5. Edit patient (identity + one condition), save, reload, changes persist
6. Delete condition then delete patient (with confirmations)
7. Route planner: "Sugerir plano" produces 8 stops, drag-to-reorder works, save plan, reload plan

Screenshot each state as evidence. Document any deviation from the sketch in a `progress-notes.md`.

**UP-7.5 — Commit strategy**

One conventional-commit per phase, tagged appropriately:
- `feat(design): lift tokens into globals.css and adopt shadcn/ui`
- `feat(panel): unified patient detail with per-condition accordion (V1)`
- `feat(wizard): multi-step patient wizard with multi-condition selection`
- `feat(map): chip markers + clusters + collapsible rails`
- `feat(sidebar): search / layer toggles / priority list refresh`
- `feat(planner): route planner drawer with auto-suggest and save`
- `chore(design): remove proto sketches after promotion`

Do NOT `git push` without explicit user OK.

---

## Success signal

The user can, with pleasure:
- Open the map on their laptop at US Moab Caldas and immediately know what they're looking at.
- Add a new gestante with proper date pickers, dropdown risco, and DPP that updates live as DUM changes.
- Attempt an invalid combination and get an immediate in-context error.
- See at a glance which patients need attention today, both on the map and in the priority list.
- Toggle sidebar/panel/legend to focus on the map during a team meeting.
- Build a daily plan for an ACS in under a minute using "Sugerir plano" + a few manual tweaks.
- Feel like this app was designed for the SUS Primary Care context, not built to a checklist.

## Progress tracking

Task graph nodes: use plan name `saude-ui-polish` if the `plan_tasks` table is being tracked. Otherwise ad-hoc notes in `PROGRESS.md`.
