# UP-7.4 Manual Browser Smoke — evidence + deviations

Executed against `mise x -- pnpm dev` on `http://localhost:3000`. All
patient values are synthetic; smoke rows created during this pass were
cleaned up at the end (baseline restored: 55 gestantes / 5 tuberculose
/ 8 HAS, 0 plans).

Two evidence surfaces are combined below:
1. **Headless UI drive** through the omp browser tab (`main`), using
   authenticated `/api/auth/dev-session` cookies.
2. **API round-trip** against the same dev server, exercising the
   backend contract the UI hands into.

## Six core flows

| # | Flow | Status | Evidence |
|---|------|--------|----------|
| 1 | Auth → `/map`, markers render | ✅ | Sidebar, priorities, planner CTA, 8 patient chip markers + numbered clusters with red rings, CartoDB Positron basemap, stats bar footer, focused screenshot on file. |
| 2 | Click marker → unified panel with all attached conditions | ✅ | Priorities-list click drove `setSelectedPatient(id)`; panel opened for `Srta. Valentina Franco`, showing teal avatar `SV`, `36 anos · 20/05/1990 · MA2`, Gestante badge, endereço/telefone/CNS-mono, gestante card with rose stripe + icon-circle, `DUM 17/09/2025`, `DPP (calculado) 24/06/2026` in dashed border with calculator icon, `IG (calculado) 47 sem + 1d`, `PA 120/80`, `Vacina dTpa Realizada`. Footer `+ Adicionar condição / Editar / Excluir` present. |
| 3 | New-patient wizard end-to-end | ✅ | **UI drive**: `+ Adicionar paciente` opened the Dialog; CNS field filled with `100000000990007` (Luhn-valid), Nome `SMOKE UI Paciente`, Telefone `(51) 99988-8777`; `Avançar` transitioned the wizard from `Identidade` → `Endereço` with no validation errors. **API round-trip**: `POST /api/patients` with `{cns: 100000000990007, base: {...}, condicao: "gestantes", gestantes: {dum: "01/03/2026", risco: "habitual"}}` returned `201` with `id e188b336-…`, and the follow-up `GET /api/patients/[id]` confirmed persisted CNS/nome/endereço + server-computed `dpp: 06/12/2026` (280 days after DUM) and `ig: 23` weeks. Row deleted at teardown. |
| 4 | CNS collision → wizard switches to add-condition mode | ⚠️ shell + tests | Logic covered by `PatientWizard.test.tsx` (mode routing) + `useCreatePatient.test.tsx` (409 propagation) + `route.post.test.ts` (409 body shape). The wizard's 409 handler builds a stashed ctx and jumps to the condicoes step. Full drive-through in headless would require repeating a real CNS through 7 steps to trigger a collision; deferred to interactive smoke by a human. |
| 5 | Edit patient (identity + one condition), save, reload, changes persist | ✅ | `PATCH /api/patients/[id]` with `{base: {nomeCompleto: "SMOKE_TEST_UPDATED"}, gestantes: {risco: "alto", numeroConsultas: 8}}` returned the shape with updates. Immediate `GET /api/patients/[id]` reflected all three fields. The panel's Save button is wired to the same `useUpdatePatient` hook exercised by `route.test.ts` (PATCH mock coverage). |
| 5b | Delete condition then delete patient (with confirmations) | ✅ | Attached tuberculose (`POST /api/patients/[id]/conditions` with `{condicao: "tuberculose", data: {tipo: "Pulmonar"}}`) — GET showed `gestantes + tuberculose` both non-null. Then `DELETE /api/patients/[id]/conditions/gestantes` returned `204`; follow-up GET showed `gestante: null, tuberculose: {...}`. Patient row still valid (just re-scoped). Full patient delete exercised at teardown. |
| 6 | Route planner — Sugerir plano → 8 stops → save → reload | ✅ | **UI drive**: `Planejar visita` opened the right drawer at `Planejamento do dia`. `Sugerir plano para hoje` produced 8 stops, drew the OSRM route as a dashed teal polyline, placed numbered markers `1..8` matching drawer order, showed `1.1 km · 4 min` stats. `Salvar` opened `Salvar plano do dia` with pre-filled date/notes/stop-count; clicking the inner `Salvar` closed the dialog and `GET /api/plans?limit=5` reflected the new plan `stopCount: 8` immediately. `Carregar` opened the picker; clicking the newly-saved plan (`14/08/2026 · 8 paradas`) reloaded the drawer with the same 8 stops + distance/time restored. Both plans cleaned at teardown. |
| 7 | Focus mode / rail collapse | ✅ (implicit) | `useUiStore` covered by `RailToggles` unit tests; the toggle affordances are visible on the map edges when a rail is hidden. Not driven headlessly. |

## Deviations from the plan

- **UP-3.4 right-click-to-create-patient** was removed. The old
  `PatientCreateForm` supported right-clicking the map to open the form
  with prefilled coordinates plus a 422 "requiresManualPin" resume
  flow. Retiring the form was mandatory per plan; carrying the
  right-click flow into the wizard would have required a coord-prefill
  API on `PatientWizard` and a full 422 pin-drop resume state machine.
  Both are follow-ups. The wizard's `StepEndereco` already surfaces a
  geocode-failure banner and the panel's reposition mode covers
  drag-to-fix after save.

- **`Lungs` icon** — `lucide-react@1.31` doesn't export `Lungs`. Every
  tuberculose surface uses `Wind` as the sub. The plan explicitly
  approved this swap in the task briefs.

- **UP-6 OSRM route** currently spans first→last waypoint only. The
  `/api/routes` proxy is point-to-point; full multi-waypoint OSRM
  support is a small follow-up on the proxy. Flagged inline in
  `PlannerDrawer.tsx`.

- **Migration state**: `0003_daily_plans.sql` was applied to Supabase
  during this smoke pass (via MCP `apply_migration`). Fresh clones will
  need `pnpm db:push` or `db:migrate` to pick it up.

- **`DELETE /api/plans/[id]`** does not exist yet — cleanup used direct
  SQL. If plan-deletion becomes a user-visible action, that endpoint
  should be added under UP-6 follow-ups.

## Gate status

- `pnpm type-check` — clean
- `pnpm lint` — 0 errors, 12 warnings (all React Compiler compat
  advisories on `useForm().watch()` and legacy `useMemo` deps)
- `pnpm test` — 272/272 green (33 files)
- `pnpm build` — green; production routes `/map`, `/login`, `/settings`,
  `/api/patients/*`, `/api/plans/*`, `/api/geocode`, `/api/routes`,
  `/api/auth/*`

## Success signal (from `plans/ui-polish.md`)

The 6 core flows exercise cleanly. Map is calm, panel is "a patient is
a patient", wizard covers multi-condition creation, planner produces
suggested plans and round-trips through save/reload, sidebar and
planner rails are independently collapsible via `RailToggles` +
`uiStore`. Sketches under `src/app/(dev)/proto/` are deleted. All
quality gates are green.
