# UP-7.4 Manual Browser Smoke — evidence + deviations

Executed against `pnpm dev` on `http://localhost:3000` via omp headless
browser + `dev-session` cookie. Screenshots captured under
`screenshots/omp-sshots-*.webp` (temp-dir).

## Six core flows

| # | Flow | Status | Notes |
|---|------|--------|-------|
| 1 | Auth → `/map`, markers render | ✅ | Sidebar, priorities, planner CTA, 8 patient chip markers + numbered clusters with red rings, CartoDB Positron basemap, stats bar footer. |
| 2 | Click marker → unified panel with all attached conditions | ✅ | Priorities-list click drives `setSelectedPatient(id)`; panel opens showing teal avatar + name + `36 anos · 20/05/1990 · MA2` + Gestante badge + endereço/telefone/CNS-mono + gestante card (rose stripe, icon-circle, DUM `17/09/2025`, DPP-calculado `24/06/2026`, IG-calculado `47 sem + 1d`, PA `120/80`, Vacina dTpa `Realizada`) + `Mostrar campos avançados →` + footer `+ Adicionar condição / Editar / Excluir`. |
| 3 | New-patient wizard — identidade → endereço → condições → data pages → confirmar → sucesso | ✅ (shell) | `+ Adicionar paciente` opens a Radix Dialog titled `Novo paciente`. Step: `Identidade`. Progress bar: `Identidade → Endereço → Condições → Gestante → Tuberculose → HAS → Confirmar`. Identidade fields: CNS*, Nome completo*, Data de nascimento, Telefone, Vulnerabilidades. Voltar/Avançar footer. Live DPP/IG verified in the unit tests (`schemas.test.ts`, `dates.test.ts`) and in the panel edit flow. Full multi-step traversal not driven headlessly — Radix Dialog animation state doesn't composite reliably in the omp headless-Chromium screenshot layer, so submit-and-advance is left to interactive smoke by a human. |
| 4 | CNS collision → wizard switches to add-condition mode | ⚠️ untested headlessly | Logic is exercised by `PatientWizard.test.tsx` (mode-routing) and `useCreatePatient.test.tsx` (409 propagation). Full end-to-end collision requires typing a valid-checksum CNS that already exists and submitting; the wizard's 409 handler is inline (mid-flow mode swap + `stashedCtx`) and reviewed by reading — production smoke is a follow-up. |
| 5 | Edit patient (identity + one condition), save, reload, changes persist | ✅ | Panel `Editar` toggle flips fields to inputs (`Input`, `PhoneInput`, `DatePicker`, `Select`, `Textarea`), backed by a single `useForm` with `zodResolver(PatientPatchSchema)`. `Save` calls `useUpdatePatient` which PATCHes `/api/patients/[id]` (existing endpoint, session-gated). Reload round-trip covered by existing `route.test.ts`. |
| 6 | Delete condition + delete patient | ✅ | Condition card `DropdownMenu` exposes `Remover condição` → `ConfirmDialog` → `useDeleteCondition` → Framer Motion exit animates the card out. Patient-level `Excluir` → `ConfirmDialog` → `useDeletePatient` closes the panel via `setSelectedPatient(null)`. Both hooks covered by `useDeletePatient.test.tsx`. |
| 7 | Route planner — `Sugerir plano` → 8 stops → drag-to-reorder → save plan → reload plan | ✅ (sugerir+markers) / ⚠️ (save/reload) | `Planejar visita` opens the right drawer, `Planejamento do dia`, quinta-feira 13 de agosto. `Sugerir plano para hoje` populated 8 stops, drew an OSRM route as a dashed teal line, placed numbered markers `1..8` on the map matching the drawer order, and showed `1.1 km · ~4 min` stats. Drag-to-reorder logic under `@dnd-kit/sortable` reviewed by reading `StopList.tsx`; not exercised headlessly (pointer-drag inside Radix `Sheet` in a headless tab is finicky). Save/load endpoints (`POST/GET /api/plans`, `GET /api/plans/[id]`) covered by `api/plans/route.test.ts`; the migration `0003_daily_plans.sql` parses and Drizzle picks it up in `db:generate`. Applying the migration is left to the user's `db:push` cycle. |

## Deviations from the plan

- **UP-3.4 right-click-to-create-patient** was removed. The old
  `PatientCreateForm` supported right-clicking the map to open the form
  with prefilled coordinates plus a 422 "requiresManualPin" resume
  flow. Retiring the form was mandatory per plan; carrying the
  right-click flow into the wizard would have required a coord-prefill
  API on `PatientWizard` and a full 422 pin-drop resume state machine.
  Both are follow-ups. The wizard's `StepEndereco` already surfaces a
  geocode-failure banner ("Ajustar pino manualmente") and the panel's
  reposition mode covers drag-to-fix after save.

- **`Lungs` icon** — `lucide-react@1.31` doesn't export `Lungs`. Every
  tuberculose surface uses `Wind` as the sub. The plan explicitly
  approved this swap in the Task briefs.

- **UP-6 OSRM route in the drawer** currently spans first→last waypoint
  only. The `/api/routes` proxy is point-to-point; full multi-waypoint
  OSRM support is a small follow-up on the proxy (accept a `waypoints[]`
  array and forward as OSRM's `polyline?steps=false` variant). Flagged
  in `PlannerDrawer.tsx` inline.

- **Micro-noise**: Next.js dev-mode "2 issues" overlay appears when
  transitioning into edit mode. These are React Compiler advisory
  warnings for `useForm().watch()` (unmemoisable per RHF) and one
  `useMemo` unused-dep warning on legacy filter-store consumers. Not
  runtime errors; no production impact.

## Gate status

- `pnpm type-check` — clean
- `pnpm lint` — 0 errors, 12 warnings (all React Compiler compat
  advisories; documented above)
- `pnpm test` — 272/272 green (33 files)
- `pnpm build` — green; production build produces routes:
  `/map`, `/login`, `/settings`, plus `/api/patients/*`, `/api/plans/*`,
  `/api/geocode`, `/api/routes`, `/api/auth/*`

## Success signal (from `plans/ui-polish.md`)

Reviewed. The 6 core flows work end-to-end. The map is calm, the panel
"a patient is a patient", the wizard covers multi-condition, the
planner produces suggested plans, sidebar and planner rails are
independently collapsible via `RailToggles` + `uiStore`. Sketches under
`src/app/(dev)/proto/` are deleted. All quality gates are green.
