/**
 * @process saude-territorial/m1-tail-m2-m3-map-interactions-routes
 * @description Complete M1 UI (map + layers + territories), M2 interactions (alerts, editing, clustering, heatmap, dedup, pin), and M3 route planning.
 * @inputs { projectDir: string, specPath: string }
 * @outputs { success: boolean, phases: object[], totalTests: number }
 */

import { defineTask } from "@a5c-ai/babysitter-sdk";

/**
 * M1-tail + M2 + M3 Implementation Process
 *
 * CONTEXT: The data layer (Sheets API, geocoding, auth, Supabase cache) is complete
 * and passing 185 tests. What's missing is all client-side rendering:
 * - Leaflet map with markers (M1 tail)
 * - Multi-layer toggle sidebar (M1 tail)
 * - Territory GeoJSON render (M1 tail)
 * - Patient detail panel, editing, alerts, clustering, heatmap, dedup, pin (M2)
 * - Route planning, day planner, microárea metrics, advanced filters (M3)
 *
 * METHODOLOGY: TDD (Test-Driven Development)
 * Every phase follows red-green-refactor:
 * 1. RED: Write failing tests FIRST based on the spec
 * 2. GREEN: Implement the minimum code to make tests pass
 * 3. REFACTOR: Clean up while keeping tests green
 *
 * SKILLS: Each agent task explicitly lists which .agents/skills/ to load.
 * The subagent MUST read those SKILL.md files before writing any code.
 *
 * DoD PHILOSOPHY: Each phase has a SHELL verification gate that checks:
 * 1. Expected files EXIST (not just .gitkeep)
 * 2. Expected EXPORTS are present (grep for function/component names)
 * 3. NEW tests were written (test count must increase)
 * 4. Type-check passes
 * 5. All tests pass
 * Then an AGENT completeness reviewer validates the phase output against the spec.
 */
export async function process(inputs, ctx) {
  const { projectDir = ".", specPath = "SPEC.md" } = inputs;

  // Baseline test count
  const baselineResult = await ctx.task(baselineTestCountTask, { projectDir });

  // ============================================================================
  // PHASE 1: INSTALL DEPENDENCIES & SCAFFOLD MAP FOUNDATION (M1 tail)
  // ============================================================================

  ctx.log("Phase 1: Installing map dependencies and scaffolding Leaflet foundation");

  const phase1Result = await ctx.task(phase1InstallAndScaffoldTask, {
    projectDir,
  });

  // HARD DoD GATE: Phase 1
  await ctx.task(phase1DodTask, { projectDir });

  // ============================================================================
  // PHASE 2: MAP RENDERING + LAYERS + TERRITORIES (M1 tail)
  // ============================================================================

  ctx.log("Phase 2: Leaflet map with markers, multi-layer sidebar, territory GeoJSON");

  const phase2Result = await ctx.task(phase2MapRenderingTask, {
    projectDir,
    specPath,
  });

  // HARD DoD GATE: Phase 2
  await ctx.task(phase2DodTask, { projectDir });

  // AGENT COMPLETENESS REVIEW: M1
  const m1Review = await ctx.task(m1CompletenessReviewTask, { projectDir, specPath });

  // Breakpoint: map renders with markers and layers
  await ctx.breakpoint({
    question:
      "Phase 2 complete. The Leaflet map should render with markers per layer, a sidebar with layer toggles, and territory polygons. Visual verification recommended via `pnpm dev`. Proceed to M2 interactions?",
    title: "M1 Complete — Map Rendering",
    context: {
      runId: ctx.runId,
      files: [
        { path: "src/components/map/", format: "directory", label: "Map Components" },
        { path: "src/components/sidebar/", format: "directory", label: "Sidebar" },
      ],
    },
  });

  // ============================================================================
  // PHASE 3: ALERT SYSTEM + RULE ENGINE (M2)
  // ============================================================================

  ctx.log("Phase 3: Alert rule engine — evaluates rules from config against patient data");

  const phase3Result = await ctx.task(phase3AlertSystemTask, {
    projectDir,
    specPath,
  });

  // HARD DoD GATE: Phase 3
  await ctx.task(phase3DodTask, { projectDir });

  // Runtime check: browse pages with agent_browser
  await ctx.task(runtimeCheckTask(3, ["/", "/login", "/map"]), { projectDir });

  // Commit Phase 3
  await ctx.task(commitPhaseTask(3, "m2", "alert rule engine with 8 operators + visual integration"), { projectDir });

  // ============================================================================
  // PHASE 4: PATIENT DETAIL PANEL + BIDIRECTIONAL EDITING (M2)
  // ============================================================================

  ctx.log("Phase 4: Detail panel on marker click + edit → save to Sheet → update cache");

  const phase4Result = await ctx.task(phase4DetailPanelTask, {
    projectDir,
    specPath,
  });

  // HARD DoD GATE: Phase 4
  await ctx.task(phase4DodTask, { projectDir });

  // Runtime check: browse pages with agent_browser
  await ctx.task(runtimeCheckTask(4, ["/", "/login", "/map"]), { projectDir });

  // Commit Phase 4
  await ctx.task(commitPhaseTask(4, "m2", "patient detail panel + bidirectional Sheet editing"), { projectDir });

  // ============================================================================
  // PHASE 5: CLUSTERING + HEATMAP + DEDUP + MANUAL PIN (M2)
  // ============================================================================

  ctx.log("Phase 5: Marker clustering, heatmap layer, CNS dedup, manual pin");

  const phase5Result = await ctx.task(phase5ClusterHeatmapDedupTask, {
    projectDir,
    specPath,
  });

  // HARD DoD GATE: Phase 5
  await ctx.task(phase5DodTask, { projectDir });

  // Runtime check: browse pages with agent_browser
  await ctx.task(runtimeCheckTask(5, ["/", "/login", "/map"]), { projectDir });

  // Commit Phase 5
  await ctx.task(commitPhaseTask(5, "m2", "clustering, heatmap, CNS dedup, manual pin"), { projectDir });

  // AGENT COMPLETENESS REVIEW: M2
  const m2Review = await ctx.task(m2CompletenessReviewTask, { projectDir, specPath });

  // Breakpoint: M2 complete
  await ctx.breakpoint({
    question:
      "Phase 5 complete — M2 (Interaction) is done. Alerts show on markers, detail panel opens on click, editing writes back to Sheets, clustering at low zoom, heatmap toggle, CNS dedup, and manual pin for unresolved addresses. Proceed to M3 (Routes)?",
    title: "M2 Complete — Interactions",
    context: {
      runId: ctx.runId,
      files: [
        { path: "src/lib/alerts/", format: "directory", label: "Alert Engine" },
        { path: "src/components/panels/", format: "directory", label: "Panels" },
      ],
    },
  });

  // ============================================================================
  // PHASE 6: SIMPLE ROUTING (US → PATIENT) (M3)
  // ============================================================================

  ctx.log("Phase 6: OSRM integration — single route from health unit to patient");

  const phase6Result = await ctx.task(phase6SimpleRoutingTask, {
    projectDir,
    specPath,
  });

  // HARD DoD GATE: Phase 6
  await ctx.task(phase6DodTask, { projectDir });

  // Runtime check: browse pages with agent_browser
  await ctx.task(runtimeCheckTask(6, ["/", "/login", "/map"]), { projectDir });

  // Commit Phase 6
  await ctx.task(commitPhaseTask(6, "m3", "OSRM simple routing US to patient"), { projectDir });

  // ============================================================================
  // PHASE 7: DAY PLANNER + ROUTE OPTIMIZATION (M3)
  // ============================================================================

  ctx.log("Phase 7: Multi-patient selection, route optimization, day planner UI");

  const phase7Result = await ctx.task(phase7DayPlannerTask, {
    projectDir,
    specPath,
  });

  // HARD DoD GATE: Phase 7
  await ctx.task(phase7DodTask, { projectDir });

  // Runtime check: browse pages with agent_browser
  await ctx.task(runtimeCheckTask(7, ["/", "/login", "/map"]), { projectDir });

  // Commit Phase 7
  await ctx.task(commitPhaseTask(7, "m3", "day planner + multi-stop route optimization"), { projectDir });

  // ============================================================================
  // PHASE 8: ADVANCED FILTERS + MICROÁREA METRICS + STREET ANNOTATIONS (M3)
  // ============================================================================

  ctx.log("Phase 8: Filters (date, microárea, alert level), metrics per territory, street annotations");

  const phase8Result = await ctx.task(phase8FiltersMetricsTask, {
    projectDir,
    specPath,
  });

  // HARD DoD GATE: Phase 8
  await ctx.task(phase8DodTask, { projectDir });

  // Runtime check: browse pages with agent_browser
  await ctx.task(runtimeCheckTask(8, ["/", "/login", "/map", "/settings"]), { projectDir });

  // Commit Phase 8
  await ctx.task(commitPhaseTask(8, "m3", "advanced filters, microarea metrics, street annotations"), { projectDir });

  // AGENT COMPLETENESS REVIEW: M3
  const m3Review = await ctx.task(m3CompletenessReviewTask, { projectDir, specPath });

  // ============================================================================
  // PHASE 9: INTEGRATION VERIFICATION
  // ============================================================================

  ctx.log("Phase 9: Full integration check — build, type-check, lint, all tests");

  await ctx.task(phase9FinalVerifyTask, { projectDir });

  // Final test count assertion
  await ctx.task(finalTestCountTask, { projectDir });

  return {
    success: true,
    phases: [
      phase1Result,
      phase2Result,
      phase3Result,
      phase4Result,
      phase5Result,
      phase6Result,
      phase7Result,
      phase8Result,
    ],
    reviews: { m1: m1Review, m2: m2Review, m3: m3Review },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// TDD PREAMBLE — injected into every agent prompt
// ─────────────────────────────────────────────────────────────────────────────

const TDD_PREAMBLE = `
## METHODOLOGY: TDD (Test-Driven Development)

You MUST follow this workflow for every piece of logic you implement:

1. **RED** — Write the test FIRST. Define what the code should do via test assertions.
   Run \`pnpm test\` to confirm the test FAILS (proves it's testing something real).

2. **GREEN** — Write the MINIMUM implementation to make the test pass.
   Run \`pnpm test\` to confirm it PASSES.

3. **REFACTOR** — Clean up the code while keeping tests green.
   Run \`pnpm test\` one final time.

For UI components that can't be unit-tested easily (Leaflet map wrappers),
write the component but ensure any LOGIC extracted from it (store, hooks,
utils) has full test coverage.

NEVER write implementation without a corresponding test.
NEVER write a test after the implementation — the test must come FIRST.
If you find yourself writing impl first, STOP, delete it, write the test.

## RUNTIME VERIFICATION (MANDATORY)

After implementing UI components, you MUST verify they actually work at runtime:
1. Start the dev server: \`pnpm dev\` (or confirm it's running)
2. Use curl or agent_browser to access the pages you modified
3. Check for 500 errors, build errors, or hydration errors in the response
4. If a page returns an error, FIX IT before considering the task done
5. Check the dev server terminal output for error messages

Do NOT rely solely on \`pnpm type-check\` — a file can type-check but crash at runtime
(e.g., missing 'use client', barrel imports pulling in server-only code, etc.)

## COMMITS (MANDATORY)

Commit your work in small, focused commits as you complete sub-tasks:
- After writing tests + implementation for each module, commit
- Use conventional commits: feat(m2): ..., fix: ..., test: ...
- Do NOT batch all work into one giant commit at the end
- Commit messages in English, be specific about what was added
`;

// ─────────────────────────────────────────────────────────────────────────────
// COMMIT TASK FACTORY
// ─────────────────────────────────────────────────────────────────────────────

function commitPhaseTask(phaseNum, milestone, description) {
  return defineTask({
    id: `phase${phaseNum}-commit`,
    title: `Git commit Phase ${phaseNum} work`,
    kind: "shell",
    command: `cd {{projectDir}} && git add -A && git status --short && git diff --cached --stat && git commit -m "feat(${milestone}): phase ${phaseNum} — ${description}" || echo "Nothing to commit"`,
    expectedExitCode: 0,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// RUNTIME PAGE CHECK TASK FACTORY  
// ─────────────────────────────────────────────────────────────────────────────

function runtimeCheckTask(phaseNum, pagePaths) {
  const pageList = pagePaths.map(p => `- ${p}`).join('\n');
  return defineTask({
    id: `phase${phaseNum}-runtime-check`,
    title: `Runtime verification: browse pages and check for errors (Phase ${phaseNum})`,
    kind: "agent",
    prompt: `## Runtime Verification — Phase ${phaseNum}

You MUST verify that the app pages actually work at runtime using the browser.

STEPS:
1. Make sure the dev server is running (\`pnpm dev\` on port 3000). If not, start it.
2. For each page below, use agent_browser to:
   a. Open the page URL (http://localhost:3000{path})
   b. Take a snapshot to see what rendered
   c. Check for any error messages, "Internal Server Error", or blank pages
   d. Check the console for errors using the qa preset if applicable
3. If a page requires auth (redirects to /login), first hit the dev-session endpoint:
   agent_browser open http://localhost:3000/api/auth/dev-session?redirect={path}
4. Report what you see: elements rendered, any errors, any 500s

PAGES TO CHECK:
${pageList}

FAILURE CONDITIONS (any of these = FAIL):
- Page shows "Internal Server Error" or "500"
- Page shows a Next.js build error overlay (red screen with stack trace)
- Page is completely blank (no HTML content rendered)
- Console has uncaught errors that prevent core functionality

SUCCESS CONDITIONS:
- Pages render their expected content (header, sidebar, map area, forms, etc.)
- No build errors or 500 status codes
- Navigation between pages works

OUTPUT FORMAT:
For each page report:
- URL: <url>
- Status: PASS or FAIL
- What rendered: <brief description>
- Errors found: <none or description>

If ANY page FAILS, your overall result must indicate failure with details on what broke.`,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// BASELINE AND FINAL TEST COUNT TASKS
// ─────────────────────────────────────────────────────────────────────────────

const baselineTestCountTask = defineTask({
  id: "baseline-test-count",
  title: "Record baseline test count (should be 185)",
  kind: "shell",
  command: `cd {{projectDir}} && pnpm test 2>&1 | grep -oP '\\d+ passed' | grep -oP '\\d+' > /tmp/saude-baseline-tests.txt && cat /tmp/saude-baseline-tests.txt`,
  expectedExitCode: 0,
});

const finalTestCountTask = defineTask({
  id: "final-test-count",
  title: "Assert test count grew significantly (at least +40 new tests)",
  kind: "shell",
  command: `cd {{projectDir}} && FINAL=$(pnpm test 2>&1 | grep -oP '\\d+ passed' | grep -oP '\\d+') && BASELINE=$(cat /tmp/saude-baseline-tests.txt) && DIFF=$((FINAL - BASELINE)) && echo "Baseline: $BASELINE, Final: $FINAL, New tests: $DIFF" && [ "$DIFF" -ge 40 ]`,
  expectedExitCode: 0,
});

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 1: INSTALL & SCAFFOLD
// ─────────────────────────────────────────────────────────────────────────────

const phase1InstallAndScaffoldTask = defineTask({
  id: "phase1-install-scaffold",
  title: "Install Leaflet + react-leaflet and scaffold map component shell",
  kind: "agent",
  prompt: `## SKILLS TO LOAD (read these SKILL.md files BEFORE writing any code):
- .agents/skills/leaflet-nextjs/SKILL.md — CRITICAL: dynamic import patterns, icon fix, SSR avoidance
- .agents/skills/nextjs-patterns/SKILL.md — App Router conventions, Server vs Client components
- .agents/skills/tailwind-shadcn/SKILL.md — Tailwind v4 CSS-first theme setup

${TDD_PREAMBLE}

## TASK: Phase 1 — Install map dependencies and scaffold Leaflet foundation

GOAL: Install map packages and create the foundational dynamic-import pattern for Leaflet in Next.js 16.

STEPS:
1. Install packages:
   \`\`\`bash
   pnpm add leaflet react-leaflet @types/leaflet react-leaflet-cluster leaflet.heat
   pnpm add -D @types/leaflet.heat
   \`\`\`

2. Create src/components/map/MapView.tsx — the actual Leaflet map component:
   - MUST have 'use client' directive
   - Import MapContainer, TileLayer from 'react-leaflet'
   - Import 'leaflet/dist/leaflet.css'
   - Fix default marker icon (Leaflet webpack/turbopack icon path issue — see leaflet-nextjs skill)
   - Default center: Porto Alegre [-30.0346, -51.2177], zoom: 14
   - OpenStreetMap tile layer

3. Create src/components/map/DynamicMap.tsx — the dynamic import wrapper:
   - Uses next/dynamic with { ssr: false, loading: () => <div>Carregando mapa...</div> }
   - Imports MapView dynamically

4. Create src/components/map/index.ts — barrel export

5. Wire DynamicMap into src/app/(dashboard)/page.tsx:
   - Replace the placeholder <p> tag with the map
   - Map fills available dashboard space (h-full w-full)

CONSTRAINTS:
- 'use client' on MapView (uses browser APIs)
- Dynamic import with ssr: false is MANDATORY (Leaflet needs window)
- NO tailwind.config.js (Tailwind v4 CSS-first)
- Loading text in PT-BR: "Carregando mapa..."

DEFINITION OF DONE:
- [ ] leaflet and react-leaflet installed in package.json
- [ ] src/components/map/MapView.tsx exists with 'use client' + MapContainer + TileLayer
- [ ] src/components/map/DynamicMap.tsx exists with next/dynamic + ssr: false
- [ ] src/components/map/index.ts barrel export
- [ ] src/app/(dashboard)/page.tsx renders the map component
- [ ] pnpm type-check passes`,
});

const phase1DodTask = defineTask({
  id: "phase1-dod",
  title: "HARD DoD: Phase 1 — packages + files + exports + type-check",
  kind: "shell",
  command: `cd {{projectDir}} && echo "=== DoD Phase 1 ===" \
    && echo "1. Checking leaflet installed..." \
    && pnpm list leaflet | grep -q "leaflet" \
    && echo "   PASS" \
    && echo "2. Checking react-leaflet installed..." \
    && pnpm list react-leaflet | grep -q "react-leaflet" \
    && echo "   PASS" \
    && echo "3. MapView.tsx with 'use client'..." \
    && test -f src/components/map/MapView.tsx \
    && grep -q "use client" src/components/map/MapView.tsx \
    && grep -q "MapContainer\\|TileLayer" src/components/map/MapView.tsx \
    && echo "   PASS" \
    && echo "4. DynamicMap.tsx with dynamic + ssr:false..." \
    && test -f src/components/map/DynamicMap.tsx \
    && grep -q "dynamic" src/components/map/DynamicMap.tsx \
    && grep -q "ssr.*false\\|ssr: false" src/components/map/DynamicMap.tsx \
    && echo "   PASS" \
    && echo "5. Barrel export..." \
    && test -f src/components/map/index.ts \
    && echo "   PASS" \
    && echo "6. Dashboard renders map..." \
    && grep -qE "Map|DynamicMap" src/app/\\(dashboard\\)/page.tsx \
    && echo "   PASS" \
    && echo "7. Type-check..." \
    && pnpm type-check \
    && echo "=== ALL PHASE 1 DoD CHECKS PASSED ==="`,
  expectedExitCode: 0,
});

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 2: MAP RENDERING + LAYERS + TERRITORIES
// ─────────────────────────────────────────────────────────────────────────────

const phase2MapRenderingTask = defineTask({
  id: "phase2-map-rendering",
  title: "Map markers, multi-layer sidebar, territory GeoJSON",
  kind: "agent",
  prompt: `## SKILLS TO LOAD (read these SKILL.md files BEFORE writing any code):
- .agents/skills/leaflet-nextjs/SKILL.md — marker patterns, GeoJSON layer, clustering prep
- .agents/skills/zustand-store/SKILL.md — store design, selectors, slice pattern
- .agents/skills/tanstack-query/SKILL.md — query key factories, prefetch, cache strategy
- .agents/skills/tailwind-shadcn/SKILL.md — sidebar layout, checkbox styling
- .agents/skills/testing-patterns/SKILL.md — mock react-leaflet, test stores/hooks
- .agents/skills/lgpd-guard/SKILL.md — no patient data in tests

${TDD_PREAMBLE}

## TASK: Phase 2 — Map markers, multi-layer sidebar, territory GeoJSON

GOAL: Show patient markers on the map organized by layer, with a sidebar for toggling layers, and territory polygon overlays.

READ ALSO:
- SPEC.md for the full milestone spec
- src/config/layers.config.ts for layer visual configuration (7 layers defined)
- src/lib/sheets/discovery.ts and src/lib/sheets/parser.ts for data shape
- src/lib/geocoding/ for coordinate types

### TDD ORDER:
1. Write src/stores/mapStore.test.ts FIRST (test toggle, select, reset)
2. Implement src/stores/mapStore.ts to pass those tests
3. Write src/hooks/usePatientData.test.ts (test mocked fetch, grouped response)
4. Implement src/hooks/usePatientData.ts to pass
5. Then build UI components (harder to unit test — rely on store/hook coverage)

### IMPLEMENTATION:

1. **Zustand store** (src/stores/mapStore.ts):
   - activeLayers: Record<LayerId, boolean> (all true by default)
   - selectedPatient: string | null (CNS)
   - mapCenter: [number, number], mapZoom: number
   - toggleLayer(id): void — flips boolean
   - setSelectedPatient(cns: string | null): void
   - Export as useMapStore

2. **TanStack Query provider** (src/app/(dashboard)/providers.tsx):
   - QueryClientProvider wrapper, wire into layout

3. **Data hook** (src/hooks/usePatientData.ts):
   - useQuery fetches /api/sheets with spreadsheetId from user prefs
   - Returns { data: Record<LayerId, PatientRecord[]>, isLoading, error }
   - Export as usePatientData

4. **Map markers** (src/components/map/PatientMarker.tsx):
   - Custom colored circle marker per layer
   - onClick → store.setSelectedPatient(cns)
   - Export PatientMarker

5. **Layer rendering** (src/components/map/LayerGroup.tsx):
   - Renders PatientMarker for each patient in one layer
   - Only renders when activeLayers[layerId] is true
   - Export LayerGroup

6. **Sidebar** (src/components/sidebar/LayerSidebar.tsx):
   - Checkbox per layer from LAYER_CONFIG
   - Colored dot + Portuguese label + count
   - Toggle updates store
   - Export LayerSidebar

7. **Territory** (src/components/map/TerritoryLayer.tsx):
   - GeoJSON component from react-leaflet
   - Load from territories/microareas.geojson
   - Create that file with 3-4 sample polygons around Porto Alegre pilot area
   - Semi-transparent fill, hover shows name
   - Export TerritoryLayer

8. **Wire in dashboard**: layout → providers → page with sidebar + map

### TESTS (write FIRST, minimum 7 cases):
- mapStore.test.ts: toggleLayer, setSelectedPatient, initial state (3 cases)
- usePatientData.test.ts: loading state, success response, error state (3 cases)
- At least 1 more for layer visibility logic

DEFINITION OF DONE:
- [ ] src/stores/mapStore.ts exports useMapStore with toggleLayer, setSelectedPatient
- [ ] src/stores/mapStore.test.ts has 3+ passing tests
- [ ] src/hooks/usePatientData.ts exports usePatientData
- [ ] src/hooks/usePatientData.test.ts has 3+ passing tests
- [ ] src/components/map/PatientMarker.tsx exports PatientMarker
- [ ] src/components/map/LayerGroup.tsx exports LayerGroup
- [ ] src/components/sidebar/LayerSidebar.tsx exports LayerSidebar (>30 lines)
- [ ] src/components/map/TerritoryLayer.tsx exports TerritoryLayer
- [ ] territories/microareas.geojson exists with valid FeatureCollection
- [ ] pnpm type-check && pnpm test pass`,
});

const phase2DodTask = defineTask({
  id: "phase2-dod",
  title: "HARD DoD: Phase 2 — store + hooks + components + territory + tests",
  kind: "shell",
  command: `cd {{projectDir}} && echo "=== DoD Phase 2 ===" \
    && echo "1. mapStore exists and exports useMapStore..." \
    && test -f src/stores/mapStore.ts \
    && grep -q "useMapStore" src/stores/mapStore.ts \
    && grep -q "toggleLayer" src/stores/mapStore.ts \
    && grep -q "setSelectedPatient" src/stores/mapStore.ts \
    && echo "   PASS" \
    && echo "2. mapStore TEST exists (3+ cases)..." \
    && test -f src/stores/mapStore.test.ts \
    && CASES=$(grep -c "it(\\|test(" src/stores/mapStore.test.ts) \
    && [ "$CASES" -ge 3 ] \
    && echo "   PASS: $CASES cases" \
    && echo "3. usePatientData hook..." \
    && test -f src/hooks/usePatientData.ts \
    && grep -q "usePatientData" src/hooks/usePatientData.ts \
    && echo "   PASS" \
    && echo "4. usePatientData TEST exists..." \
    && test -f src/hooks/usePatientData.test.ts \
    && echo "   PASS" \
    && echo "5. PatientMarker component..." \
    && test -f src/components/map/PatientMarker.tsx \
    && grep -q "PatientMarker" src/components/map/PatientMarker.tsx \
    && echo "   PASS" \
    && echo "6. LayerGroup component..." \
    && test -f src/components/map/LayerGroup.tsx \
    && grep -q "LayerGroup" src/components/map/LayerGroup.tsx \
    && echo "   PASS" \
    && echo "7. LayerSidebar (>30 lines)..." \
    && test -f src/components/sidebar/LayerSidebar.tsx \
    && grep -q "LayerSidebar" src/components/sidebar/LayerSidebar.tsx \
    && LINES=$(wc -l < src/components/sidebar/LayerSidebar.tsx) && [ "$LINES" -ge 30 ] \
    && echo "   PASS: $LINES lines" \
    && echo "8. TerritoryLayer component..." \
    && test -f src/components/map/TerritoryLayer.tsx \
    && grep -q "TerritoryLayer" src/components/map/TerritoryLayer.tsx \
    && echo "   PASS" \
    && echo "9. GeoJSON file with FeatureCollection..." \
    && test -f territories/microareas.geojson \
    && grep -q "FeatureCollection" territories/microareas.geojson \
    && echo "   PASS" \
    && echo "10. Type-check + tests..." \
    && pnpm type-check && pnpm test \
    && echo "=== ALL PHASE 2 DoD CHECKS PASSED ==="`,
  expectedExitCode: 0,
});

const m1CompletenessReviewTask = defineTask({
  id: "m1-completeness-review",
  title: "AGENT REVIEW: Verify M1 milestone completeness against SPEC.md",
  kind: "agent",
  prompt: `You are a completeness reviewer. Your ONLY job is to verify that M1 (Foundation) is truly done.

Read SPEC.md and check the M1 checklist:
- [ ] Setup Next.js + pnpm + TypeScript strict + Tailwind + shadcn/ui
- [ ] Google OAuth (login + sheet scope)
- [ ] Configuração de planilha (colar URL)
- [ ] Leitura de dados do Google Sheets (todas as abas)
- [ ] Geocodificação (Nominatim) + cache Supabase
- [ ] Mapa Leaflet com marcadores básicos (uma camada)
- [ ] Multi-layer toggle (sidebar com checkboxes)
- [ ] Territórios (GeoJSON render)

For EACH item, grep/read the actual source files to confirm:
1. The file exists
2. It has real implementation (not empty/stub/gitkeep)
3. It exports the expected functions/components
4. Logic modules have test files

OUTPUT FORMAT (strict):
For each checklist item, output:
- DONE: <item> — <evidence file + grep proof>
- MISSING: <item> — <what's missing>

If ANY item is MISSING, your response MUST start with "INCOMPLETE:" on the first line.
If all items are DONE, your response MUST start with "COMPLETE:" on the first line.

Do NOT be lenient. A .gitkeep file is NOT implementation. An empty export {} is NOT implementation.
A component with <10 lines of real code is a STUB, not implementation.`,
});

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 3: ALERT SYSTEM
// ─────────────────────────────────────────────────────────────────────────────

const phase3AlertSystemTask = defineTask({
  id: "phase3-alert-system",
  title: "Alert rule engine + alert visualization on markers",
  kind: "agent",
  prompt: `## SKILLS TO LOAD (read these SKILL.md files BEFORE writing any code):
- .agents/skills/domain-model/SKILL.md — healthcare domain, urgency scoring, alert concepts
- .agents/skills/typescript-strict/SKILL.md — discriminated unions, branded types, Zod validation
- .agents/skills/testing-patterns/SKILL.md — Vitest setup, synthetic data patterns
- .agents/skills/lgpd-guard/SKILL.md — synthetic test data ONLY, no real patient info
- .agents/skills/ptbr-conventions/SKILL.md — date format dd/MM/yyyy for parsing

${TDD_PREAMBLE}

## TASK: Phase 3 — Alert rule engine + visual integration

GOAL: Build a rule engine that evaluates alert rules against patient data and visualizes urgency on map markers.

### REFERENCE:
- SPEC.md section "Sistema de Alertas" for rule format and operators
- Sister repo urgency engine: /Users/i572543/Dev/github.com/PedroKlein/extensao-gat4/main/prototypes/mapa-gestantes/src/logic/urgency.ts

### SPEC RULES FORMAT:
Alert rules: [Layer, Column, Operator, Value, Alert Level]
Operators: >, <, >=, <=, =, !=, older_than_days, is_empty
Levels: vermelho (critical), amarelo (attention), verde (ok)

### TDD ORDER (MANDATORY):
1. Write src/lib/alerts/engine.test.ts FIRST with 10+ cases covering ALL operators
2. Run \`pnpm test\` — should fail (no implementation yet)
3. Implement src/lib/alerts/engine.ts to make tests pass
4. Run \`pnpm test\` — should pass
5. Then add types, config, hook, and visual integration

### IMPLEMENTATION:

1. **Types** (src/types/alerts.ts):
   - AlertOperator: '>' | '<' | '>=' | '<=' | '=' | '!=' | 'older_than_days' | 'is_empty'
   - AlertLevel: 'vermelho' | 'amarelo' | 'verde'
   - AlertRule: { layer: string, column: string, operator: AlertOperator, value: string | number, level: AlertLevel }
   - AlertResult: { patientCns: string, level: AlertLevel, triggeredRules: AlertRule[] }

2. **Rule engine** (src/lib/alerts/engine.ts):
   - evaluateRule(rule: AlertRule, patientData: Record<string, unknown>): boolean
   - evaluatePatient(rules: AlertRule[], patient: Record<string, unknown>, layerId: string): AlertResult
   - getHighestAlert(results: AlertResult[]): AlertLevel
   - parseBrazilianDate(dateStr: string): Date — handles dd/MM/yyyy
   - Pure functions, exported individually

3. **Default rules config** (src/config/alert-rules.config.ts):
   - ALERT_RULES: AlertRule[] with at least 5 rules from SPEC

4. **Alert hook** (src/hooks/useAlerts.ts):
   - useAlerts(patients, rules) → Record<string, AlertResult>
   - Memoized with useMemo
   - Export useAlerts

5. **Visual integration**:
   - Update PatientMarker: add colored ring/border based on alert level
   - Add alert summary in LayerSidebar (count red/yellow)

6. **Tests** (src/lib/alerts/engine.test.ts — 10+ cases, written FIRST):
   - Each operator individually: >, <, >=, <=, =, !=
   - older_than_days with a date 45 days ago
   - is_empty with null, undefined, ""
   - Priority: vermelho > amarelo when multiple rules match
   - Missing field gracefully handled (no crash)
   - ALL test data is SYNTHETIC (use "Paciente Teste", CNS "000000000000000")

DEFINITION OF DONE:
- [ ] src/types/alerts.ts exports AlertRule, AlertLevel, AlertResult, AlertOperator
- [ ] src/lib/alerts/engine.ts exports evaluateRule, evaluatePatient, getHighestAlert
- [ ] src/lib/alerts/engine.test.ts has 10+ test cases testing all 8 operators
- [ ] src/config/alert-rules.config.ts exports ALERT_RULES (5+ rules)
- [ ] src/hooks/useAlerts.ts exports useAlerts
- [ ] NO real patient data in any test file
- [ ] pnpm type-check && pnpm test pass`,
});

const phase3DodTask = defineTask({
  id: "phase3-dod",
  title: "HARD DoD: Phase 3 — alert engine + types + config + tests",
  kind: "shell",
  command: `cd {{projectDir}} && echo "=== DoD Phase 3 ===" \
    && echo "1. Alert types exist..." \
    && test -f src/types/alerts.ts \
    && grep -q "AlertRule" src/types/alerts.ts \
    && grep -q "AlertLevel" src/types/alerts.ts \
    && grep -q "AlertResult" src/types/alerts.ts \
    && grep -q "AlertOperator" src/types/alerts.ts \
    && echo "   PASS" \
    && echo "2. Alert engine exports core functions..." \
    && test -f src/lib/alerts/engine.ts \
    && grep -q "evaluateRule" src/lib/alerts/engine.ts \
    && grep -q "evaluatePatient" src/lib/alerts/engine.ts \
    && grep -q "getHighestAlert" src/lib/alerts/engine.ts \
    && echo "   PASS" \
    && echo "3. Alert rules config..." \
    && test -f src/config/alert-rules.config.ts \
    && grep -q "ALERT_RULES" src/config/alert-rules.config.ts \
    && grep -q "vermelho" src/config/alert-rules.config.ts \
    && grep -q "older_than_days" src/config/alert-rules.config.ts \
    && echo "   PASS" \
    && echo "4. useAlerts hook..." \
    && test -f src/hooks/useAlerts.ts \
    && grep -q "useAlerts" src/hooks/useAlerts.ts \
    && echo "   PASS" \
    && echo "5. Alert engine tests (10+ cases)..." \
    && test -f src/lib/alerts/engine.test.ts \
    && CASES=$(grep -c "it(\\|test(" src/lib/alerts/engine.test.ts) \
    && echo "   Found $CASES test cases" \
    && [ "$CASES" -ge 10 ] \
    && echo "   PASS" \
    && echo "6. All 8 operators tested..." \
    && grep -q "older_than_days" src/lib/alerts/engine.test.ts \
    && grep -q "is_empty" src/lib/alerts/engine.test.ts \
    && echo "   PASS" \
    && echo "7. No real patient data..." \
    && ! grep -iP "(maria|jo[aã]o|silva|santos|\\d{15})" src/lib/alerts/engine.test.ts \
    && echo "   PASS" \
    && echo "8. Type-check + tests..." \
    && pnpm type-check && pnpm test \
    && echo "=== ALL PHASE 3 DoD CHECKS PASSED ==="`,
  expectedExitCode: 0,
});

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 4: DETAIL PANEL + EDITING
// ─────────────────────────────────────────────────────────────────────────────

const phase4DetailPanelTask = defineTask({
  id: "phase4-detail-panel",
  title: "Patient detail panel + bidirectional editing",
  kind: "agent",
  prompt: `## SKILLS TO LOAD (read these SKILL.md files BEFORE writing any code):
- .agents/skills/sheets-data-layer/SKILL.md — write-then-cache pattern, rate limits, column mapping
- .agents/skills/tanstack-query/SKILL.md — useMutation, optimistic updates, invalidation
- .agents/skills/tailwind-shadcn/SKILL.md — Sheet component (slide-up panel), form patterns
- .agents/skills/error-handling/SKILL.md — error chain, toast on failure, retry logic
- .agents/skills/ptbr-conventions/SKILL.md — PT-BR toast messages, date formatting
- .agents/skills/lgpd-guard/SKILL.md — no patient data in error messages or logs
- .agents/skills/testing-patterns/SKILL.md — testing mutations, mock API

${TDD_PREAMBLE}

## TASK: Phase 4 — Patient detail panel + bidirectional editing

GOAL: Click marker → slide-up panel with patient details. Edit fields → write to Google Sheets first, then update cache.

### TDD ORDER:
1. Write test for PUT /api/sheets handler (mock googleapis, test success + error)
2. Implement PUT handler to pass
3. Write test for usePatientEdit hook (mock fetch, test optimistic + rollback)
4. Implement hook to pass
5. Build UI components (detail panel, edit panel)

### IMPLEMENTATION:

1. **API route extension** (src/app/api/sheets/route.ts):
   - Add export async function PUT(request)
   - Accepts: { spreadsheetId, tabName, rowIndex, updates: Record<string, string> }
   - Gets user's OAuth token from session
   - Calls Sheets API values.update
   - Returns success or error (no patient data in error response!)

2. **Edit mutation hook** (src/hooks/usePatientEdit.ts):
   - useMutation wrapping PUT /api/sheets
   - onMutate: optimistic update of query cache
   - onSuccess: invalidateQueries
   - onError: rollback + toast("Erro ao salvar. Tente novamente.", { type: 'error' })
   - Export usePatientEdit

3. **Detail panel** (src/components/panels/PatientDetailPanel.tsx):
   - Shows when mapStore.selectedPatient is set
   - Reads patient data from usePatientData by CNS
   - Shows visible columns per layer (from layers.config.ts)
   - "Editar" button, "Traçar rota" button (route wired in Phase 6)
   - Close button (X) resets selectedPatient
   - Uses shadcn/ui Sheet component for slide-up
   - Export PatientDetailPanel

4. **Edit panel** (src/components/panels/PatientEditPanel.tsx):
   - Form with input fields for editable columns
   - "Salvar" button calls usePatientEdit mutation
   - "Cancelar" reverts to view mode
   - Loading state on save
   - Export PatientEditPanel

5. **Tests** (minimum 6 cases):
   - API PUT route: success, auth error (401), sheets error (429)
   - usePatientEdit: optimistic update, rollback on error
   - At least 1 integration test combining both

DEFINITION OF DONE:
- [ ] src/app/api/sheets/route.ts exports PUT function (grep for "export.*PUT")
- [ ] src/hooks/usePatientEdit.ts exports usePatientEdit with useMutation
- [ ] src/components/panels/PatientDetailPanel.tsx exports PatientDetailPanel (>40 lines)
- [ ] src/components/panels/PatientEditPanel.tsx exports PatientEditPanel (>30 lines)
- [ ] Tests: 6+ new cases for write path
- [ ] Error messages in PT-BR, no patient data leaked
- [ ] pnpm type-check && pnpm test pass`,
});

const phase4DodTask = defineTask({
  id: "phase4-dod",
  title: "HARD DoD: Phase 4 — panels + edit hook + API write + tests",
  kind: "shell",
  command: `cd {{projectDir}} && echo "=== DoD Phase 4 ===" \
    && echo "1. PatientDetailPanel (>40 lines, not stub)..." \
    && test -f src/components/panels/PatientDetailPanel.tsx \
    && grep -q "PatientDetailPanel" src/components/panels/PatientDetailPanel.tsx \
    && LINES=$(wc -l < src/components/panels/PatientDetailPanel.tsx) && [ "$LINES" -ge 40 ] \
    && echo "   PASS: $LINES lines" \
    && echo "2. PatientEditPanel (>30 lines)..." \
    && test -f src/components/panels/PatientEditPanel.tsx \
    && grep -q "PatientEditPanel" src/components/panels/PatientEditPanel.tsx \
    && LINES=$(wc -l < src/components/panels/PatientEditPanel.tsx) && [ "$LINES" -ge 30 ] \
    && echo "   PASS: $LINES lines" \
    && echo "3. usePatientEdit with useMutation..." \
    && test -f src/hooks/usePatientEdit.ts \
    && grep -q "usePatientEdit" src/hooks/usePatientEdit.ts \
    && grep -q "useMutation" src/hooks/usePatientEdit.ts \
    && echo "   PASS" \
    && echo "4. API PUT handler..." \
    && grep -qE "export.*(async )?function PUT|export const PUT" src/app/api/sheets/route.ts \
    && echo "   PASS" \
    && echo "5. Write-path tests exist..." \
    && CASES=$(grep -rc "it(\\|test(" src/hooks/usePatientEdit.test.ts src/app/api/sheets/route.test.ts 2>/dev/null | awk -F: '{s+=\$2}END{print s}') \
    && echo "   Found $CASES write-path test cases" \
    && [ "$CASES" -ge 5 ] \
    && echo "   PASS" \
    && echo "6. Type-check + tests..." \
    && pnpm type-check && pnpm test \
    && echo "=== ALL PHASE 4 DoD CHECKS PASSED ==="`,
  expectedExitCode: 0,
});

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 5: CLUSTERING + HEATMAP + DEDUP + MANUAL PIN
// ─────────────────────────────────────────────────────────────────────────────

const phase5ClusterHeatmapDedupTask = defineTask({
  id: "phase5-cluster-heatmap-dedup",
  title: "Marker clustering, heatmap, CNS deduplication, manual pin",
  kind: "agent",
  prompt: `## SKILLS TO LOAD (read these SKILL.md files BEFORE writing any code):
- .agents/skills/leaflet-nextjs/SKILL.md — clustering plugin, heatmap plugin, dynamic import
- .agents/skills/typescript-strict/SKILL.md — branded types for CNS, discriminated unions
- .agents/skills/supabase-patterns/SKILL.md — manual_pins table, RLS, server client
- .agents/skills/nextjs-patterns/SKILL.md — route handlers, server-side auth
- .agents/skills/testing-patterns/SKILL.md — mock Supabase, test pure logic
- .agents/skills/lgpd-guard/SKILL.md — manual_pins stores minimal PII

${TDD_PREAMBLE}

## TASK: Phase 5 — Clustering, heatmap, CNS dedup, and manual pin

GOAL: Cluster markers at low zoom, add heatmap toggle, deduplicate cross-layer patients by CNS, allow manual pin for failed geocoding.

### TDD ORDER:
1. Write src/lib/sheets/dedup.test.ts FIRST (merge logic, conflict detection — 5+ cases)
2. Run tests → fail
3. Implement src/lib/sheets/dedup.ts → pass
4. Write pin API tests
5. Implement pin API
6. Build UI components (ClusteredLayer, HeatmapLayer, ManualPinMode)

### IMPLEMENTATION:

1. **CNS deduplication** (src/lib/sheets/dedup.ts):
   - deduplicatePatients(records: Map<string, PatientRecord[]>): DeduplicationResult
   - DeduplicationResult: { merged: MergedPatient[], conflicts: DetectedConflict[] }
   - MergedPatient: base patient data + layers: string[] (which tabs they appear in)
   - DetectedConflict: { cns, field, values: Record<layerId, string> }
   - Export: deduplicatePatients, types

2. **Marker clustering** (src/components/map/ClusteredLayer.tsx):
   - Wraps PatientMarker[] in MarkerClusterGroup from react-leaflet-cluster
   - Cluster icon shows count + layer color
   - Export ClusteredLayer

3. **Heatmap** (src/components/map/HeatmapLayer.tsx):
   - Dynamic import (ssr: false) wrapping leaflet.heat
   - Points weighted by alert level (vermelho=1.0, amarelo=0.6, verde=0.3)
   - Toggle in sidebar: "Mapa de calor"
   - Export HeatmapLayer

4. **Manual pin** (src/components/map/ManualPinMode.tsx):
   - Activated for patients with geocoding failure
   - Map click handler saves coordinates
   - Reference text input ("próximo ao mercado")
   - Export ManualPinMode

5. **Pin API** (src/app/api/pins/route.ts):
   - GET: list user's manual pins
   - POST: create pin { patient_cns, lat, lng, reference_text }
   - DELETE: remove pin by id
   - Auth: verify session, use user_id for RLS
   - Export GET, POST, DELETE

6. **Tests** (minimum 8 cases total):
   - dedup.test.ts: single layer (no merge needed), two layers same patient, conflict detection, empty input, many patients (5 cases)
   - Pin API: POST success, POST validation error, GET list (3 cases)

DEFINITION OF DONE:
- [ ] src/lib/sheets/dedup.ts exports deduplicatePatients (>30 lines)
- [ ] src/lib/sheets/dedup.test.ts has 5+ cases
- [ ] src/components/map/ClusteredLayer.tsx exports ClusteredLayer (>15 lines)
- [ ] src/components/map/HeatmapLayer.tsx exports HeatmapLayer with dynamic import
- [ ] src/components/map/ManualPinMode.tsx exports ManualPinMode
- [ ] src/app/api/pins/route.ts exports GET, POST, DELETE
- [ ] Pin API test file exists with 3+ cases
- [ ] pnpm type-check && pnpm test pass`,
});

const phase5DodTask = defineTask({
  id: "phase5-dod",
  title: "HARD DoD: Phase 5 — cluster + heatmap + dedup + pin + tests",
  kind: "shell",
  command: `cd {{projectDir}} && echo "=== DoD Phase 5 ===" \
    && echo "1. dedup module (>30 lines)..." \
    && test -f src/lib/sheets/dedup.ts \
    && grep -q "deduplicatePatients" src/lib/sheets/dedup.ts \
    && LINES=$(wc -l < src/lib/sheets/dedup.ts) && [ "$LINES" -ge 30 ] \
    && echo "   PASS: $LINES lines" \
    && echo "2. dedup tests (5+ cases)..." \
    && test -f src/lib/sheets/dedup.test.ts \
    && CASES=$(grep -c "it(\\|test(" src/lib/sheets/dedup.test.ts) && [ "$CASES" -ge 5 ] \
    && echo "   PASS: $CASES cases" \
    && echo "3. ClusteredLayer (>15 lines)..." \
    && test -f src/components/map/ClusteredLayer.tsx \
    && grep -q "ClusteredLayer" src/components/map/ClusteredLayer.tsx \
    && LINES=$(wc -l < src/components/map/ClusteredLayer.tsx) && [ "$LINES" -ge 15 ] \
    && echo "   PASS: $LINES lines" \
    && echo "4. HeatmapLayer with dynamic..." \
    && test -f src/components/map/HeatmapLayer.tsx \
    && grep -q "HeatmapLayer" src/components/map/HeatmapLayer.tsx \
    && echo "   PASS" \
    && echo "5. ManualPinMode..." \
    && test -f src/components/map/ManualPinMode.tsx \
    && grep -q "ManualPinMode" src/components/map/ManualPinMode.tsx \
    && echo "   PASS" \
    && echo "6. Pin API (GET, POST, DELETE)..." \
    && test -f src/app/api/pins/route.ts \
    && grep -q "GET" src/app/api/pins/route.ts \
    && grep -q "POST" src/app/api/pins/route.ts \
    && grep -q "DELETE" src/app/api/pins/route.ts \
    && echo "   PASS" \
    && echo "7. Pin API tests (3+ cases)..." \
    && CASES=$(grep -c "it(\\|test(" src/app/api/pins/route.test.ts 2>/dev/null || echo 0) \
    && [ "$CASES" -ge 3 ] \
    && echo "   PASS: $CASES cases" \
    && echo "8. Type-check + tests..." \
    && pnpm type-check && pnpm test \
    && echo "=== ALL PHASE 5 DoD CHECKS PASSED ==="`,
  expectedExitCode: 0,
});

const m2CompletenessReviewTask = defineTask({
  id: "m2-completeness-review",
  title: "AGENT REVIEW: Verify M2 milestone completeness against SPEC.md",
  kind: "agent",
  prompt: `## SKILLS TO LOAD:
- .agents/skills/testing-patterns/SKILL.md — understand what counts as test coverage

You are a completeness reviewer. Your ONLY job is to verify that M2 (Interaction) is truly done.

Read SPEC.md and check the M2 checklist:
- [ ] Painel de detalhes do paciente (click marcador)
- [ ] Edição bidirecional (edit → save to Sheet → update cache)
- [ ] Sistema de alertas (regras da Sheet, cores nos marcadores)
- [ ] Camada de visão geral de alertas
- [ ] Clustering com contagem
- [ ] Heatmap toggle
- [ ] Deduplicação por CNS + resolução de conflitos
- [ ] Pin manual + referência textual para endereços sem geocoding

For EACH item, grep/read the actual source files to confirm:
1. The file exists with real code (not empty/stub)
2. It exports the expected functions/components (grep for export)
3. File has >15 lines of real implementation (not just imports/types)
4. Core logic has test coverage (a .test.ts file exists and has assertions)

OUTPUT FORMAT (strict):
- DONE: <item> — <file path> — <evidence: export name, line count, test file>
- MISSING: <item> — <what specifically is missing>

If ANY item is MISSING, start with "INCOMPLETE:" and list all missing items.
If all are DONE, start with "COMPLETE:" followed by the evidence list.

STRICTNESS RULES:
- An empty file (export {}) is MISSING
- A file with only type definitions but no logic is MISSING for logic items
- A component that renders only a placeholder/TODO div is MISSING
- A test file with 0 assertions is MISSING`,
});

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 6: SIMPLE ROUTING
// ─────────────────────────────────────────────────────────────────────────────

const phase6SimpleRoutingTask = defineTask({
  id: "phase6-simple-routing",
  title: "OSRM integration — route from health unit to patient",
  kind: "agent",
  prompt: `## SKILLS TO LOAD (read these SKILL.md files BEFORE writing any code):
- .agents/skills/geospatial/SKILL.md — OSRM API, route calculation, coordinate handling
- .agents/skills/nextjs-patterns/SKILL.md — route handlers, proxy pattern
- .agents/skills/error-handling/SKILL.md — OSRM error handling, retry strategy
- .agents/skills/ptbr-conventions/SKILL.md — distance/time formatting (km, min, h)
- .agents/skills/testing-patterns/SKILL.md — mock fetch for OSRM responses

${TDD_PREAMBLE}

## TASK: Phase 6 — OSRM simple routing

GOAL: Calculate and display a route from US Moab Caldas to a selected patient. Walking and driving options.

### TDD ORDER:
1. Write src/lib/routing/format.test.ts FIRST (distance + time formatting — 4+ cases)
2. Implement format.ts → pass
3. Write src/lib/routing/client.test.ts (mock OSRM response — 3+ cases)
4. Implement client.ts → pass
5. Write API route test
6. Implement API route
7. Build UI (RoutePolyline, route button in detail panel)

### IMPLEMENTATION:

1. **Constants** (src/config/constants.ts):
   - US_MOAB_CALDAS: { lat: -30.0555, lng: -51.1736 }
   - OSRM_BASE_URL: 'https://router.project-osrm.org'

2. **Types** (src/types/routing.ts):
   - RouteProfile: 'foot' | 'car'
   - RouteResult: { distance: number, duration: number, geometry: GeoJSON.LineString, waypoints: [number, number][] }
   - OSRM profiles map: foot → 'foot', car → 'driving'

3. **Format utils** (src/lib/routing/format.ts):
   - formatDistance(meters: number): string → "1,2 km" or "350 m" (PT-BR comma decimal)
   - formatDuration(seconds: number): string → "45 min" or "1h 20min"
   - Export both

4. **OSRM client** (src/lib/routing/client.ts):
   - getRoute(from: {lat,lng}, to: {lat,lng}, profile: RouteProfile): Promise<RouteResult>
   - Constructs URL: {BASE}/route/v1/{profile}/{lng},{lat};{lng},{lat}?overview=full&geometries=geojson
   - Parses OSRM response format
   - Throws on OSRM error
   - Export getRoute

5. **API proxy** (src/app/api/routes/route.ts):
   - POST: validates input with Zod, calls getRoute, returns RouteResult
   - Error handling: 400 for bad input, 502 for OSRM failure
   - Export POST

6. **Route polyline** (src/components/map/RoutePolyline.tsx):
   - Renders GeoJSON polyline on map
   - Blue dashed for walking, blue solid for driving
   - Export RoutePolyline

7. **Route trigger** (update PatientDetailPanel):
   - Add "Traçar rota" button
   - Profile toggle: 🚶 A pé / 🚗 Carro
   - Show formatted distance + duration below the route

8. **Update src/lib/routing/index.ts** — re-export from client and format

### TESTS (minimum 8 cases, written FIRST):
- format.test.ts: meters→m, meters→km, seconds→min, seconds→h+min (4 cases)
- client.test.ts: success response, OSRM error, network error (3 cases)
- route API test: valid request (1 case)

DEFINITION OF DONE:
- [ ] src/config/constants.ts exports US_MOAB_CALDAS and OSRM_BASE_URL
- [ ] src/types/routing.ts exports RouteProfile, RouteResult
- [ ] src/lib/routing/format.ts exports formatDistance, formatDuration
- [ ] src/lib/routing/format.test.ts has 4+ cases
- [ ] src/lib/routing/client.ts exports getRoute (>20 lines implementation)
- [ ] src/lib/routing/client.test.ts has 3+ cases
- [ ] src/app/api/routes/route.ts exports POST
- [ ] src/components/map/RoutePolyline.tsx exports RoutePolyline
- [ ] pnpm type-check && pnpm test pass`,
});

const phase6DodTask = defineTask({
  id: "phase6-dod",
  title: "HARD DoD: Phase 6 — OSRM client + format + API + polyline + tests",
  kind: "shell",
  command: `cd {{projectDir}} && echo "=== DoD Phase 6 ===" \
    && echo "1. Constants file..." \
    && test -f src/config/constants.ts \
    && grep -q "US_MOAB_CALDAS" src/config/constants.ts \
    && grep -q "OSRM_BASE_URL" src/config/constants.ts \
    && echo "   PASS" \
    && echo "2. Routing types..." \
    && test -f src/types/routing.ts \
    && grep -q "RouteProfile" src/types/routing.ts \
    && grep -q "RouteResult" src/types/routing.ts \
    && echo "   PASS" \
    && echo "3. Format utils..." \
    && test -f src/lib/routing/format.ts \
    && grep -q "formatDistance" src/lib/routing/format.ts \
    && grep -q "formatDuration" src/lib/routing/format.ts \
    && echo "   PASS" \
    && echo "4. Format tests (4+ cases)..." \
    && test -f src/lib/routing/format.test.ts \
    && CASES=$(grep -c "it(\\|test(" src/lib/routing/format.test.ts) && [ "$CASES" -ge 4 ] \
    && echo "   PASS: $CASES cases" \
    && echo "5. OSRM client (>20 lines)..." \
    && test -f src/lib/routing/client.ts \
    && grep -q "getRoute" src/lib/routing/client.ts \
    && LINES=$(wc -l < src/lib/routing/client.ts) && [ "$LINES" -ge 20 ] \
    && echo "   PASS: $LINES lines" \
    && echo "6. Client tests (3+ cases)..." \
    && test -f src/lib/routing/client.test.ts \
    && CASES=$(grep -c "it(\\|test(" src/lib/routing/client.test.ts) && [ "$CASES" -ge 3 ] \
    && echo "   PASS: $CASES cases" \
    && echo "7. Routes API..." \
    && test -f src/app/api/routes/route.ts \
    && grep -q "POST" src/app/api/routes/route.ts \
    && echo "   PASS" \
    && echo "8. RoutePolyline component..." \
    && test -f src/components/map/RoutePolyline.tsx \
    && grep -q "RoutePolyline" src/components/map/RoutePolyline.tsx \
    && echo "   PASS" \
    && echo "9. Type-check + tests..." \
    && pnpm type-check && pnpm test \
    && echo "=== ALL PHASE 6 DoD CHECKS PASSED ==="`,
  expectedExitCode: 0,
});

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 7: DAY PLANNER + ROUTE OPTIMIZATION
// ─────────────────────────────────────────────────────────────────────────────

const phase7DayPlannerTask = defineTask({
  id: "phase7-day-planner",
  title: "Multi-patient route optimization and day planner",
  kind: "agent",
  prompt: `## SKILLS TO LOAD (read these SKILL.md files BEFORE writing any code):
- .agents/skills/geospatial/SKILL.md — OSRM /trip endpoint for TSP optimization
- .agents/skills/zustand-store/SKILL.md — planner store design, slice pattern
- .agents/skills/tailwind-shadcn/SKILL.md — drag-and-drop list, planner UI
- .agents/skills/ptbr-conventions/SKILL.md — time/distance formatting
- .agents/skills/testing-patterns/SKILL.md — mock OSRM trip responses

${TDD_PREAMBLE}

## TASK: Phase 7 — Route optimization and day planner

GOAL: Select multiple patients for a visit day, optimize route order (TSP), display itinerary.

### TDD ORDER:
1. Write src/stores/routePlannerStore.test.ts FIRST (add, remove, reorder, clear — 4+ cases)
2. Implement store → pass
3. Write src/lib/routing/optimizer.test.ts (mock OSRM /trip — 3+ cases)
4. Implement optimizer → pass
5. Build DayPlanner UI and PlanningMode

### IMPLEMENTATION:

1. **Route planner store** (src/stores/routePlannerStore.ts):
   - waypoints: Array<{ cns: string, lat: number, lng: number, name: string }>
   - optimizedRoute: RouteResult | null
   - isPlanning: boolean (toggle mode)
   - addWaypoint(wp), removeWaypoint(cns), reorderWaypoints(from, to), clearPlan()
   - setOptimizedRoute(route), togglePlanningMode()
   - Export useRoutePlannerStore

2. **OSRM trip optimizer** (src/lib/routing/optimizer.ts):
   - optimizeRoute(waypoints: {lat,lng}[], origin: {lat,lng}): Promise<OptimizedRoute>
   - Uses OSRM /trip/v1/driving/{coordinates}?roundtrip=true&source=first&destination=last
   - Returns: { optimizedOrder: number[], route: RouteResult, totalDistance, totalDuration }
   - origin = US Moab Caldas (always first and last stop)
   - Export optimizeRoute

3. **Day planner UI** (src/components/routes/DayPlanner.tsx):
   - List of waypoints in order (numbered)
   - "Otimizar rota" button → calls optimizeRoute
   - "Limpar" reset button
   - Shows total distance + duration
   - Per-leg distance shown
   - Export DayPlanner (>50 lines)

4. **Planning mode** (src/components/map/PlanningMode.tsx):
   - When isPlanning=true, clicking markers adds/removes from plan
   - Numbered badge on selected markers
   - Mini route preview line between points
   - Export PlanningMode

5. **Sidebar toggle** (update LayerSidebar):
   - Add "Modo planejamento" toggle button
   - When active, show waypoint count

### TESTS (minimum 7 cases, written FIRST):
- routePlannerStore.test.ts: add, remove, reorder, clear (4 cases)
- optimizer.test.ts: success with 3 waypoints, roundtrip verification, empty input (3 cases)

DEFINITION OF DONE:
- [ ] src/stores/routePlannerStore.ts exports useRoutePlannerStore (>30 lines)
- [ ] src/stores/routePlannerStore.test.ts has 4+ cases
- [ ] src/lib/routing/optimizer.ts exports optimizeRoute (>25 lines)
- [ ] src/lib/routing/optimizer.test.ts has 3+ cases
- [ ] src/components/routes/DayPlanner.tsx exports DayPlanner (>50 lines)
- [ ] src/components/map/PlanningMode.tsx exports PlanningMode
- [ ] pnpm type-check && pnpm test pass`,
});

const phase7DodTask = defineTask({
  id: "phase7-dod",
  title: "HARD DoD: Phase 7 — planner store + optimizer + UI + tests",
  kind: "shell",
  command: `cd {{projectDir}} && echo "=== DoD Phase 7 ===" \
    && echo "1. Route planner store (>30 lines)..." \
    && test -f src/stores/routePlannerStore.ts \
    && grep -q "useRoutePlannerStore" src/stores/routePlannerStore.ts \
    && LINES=$(wc -l < src/stores/routePlannerStore.ts) && [ "$LINES" -ge 30 ] \
    && echo "   PASS: $LINES lines" \
    && echo "2. Planner store tests (4+ cases)..." \
    && test -f src/stores/routePlannerStore.test.ts \
    && CASES=$(grep -c "it(\\|test(" src/stores/routePlannerStore.test.ts) && [ "$CASES" -ge 4 ] \
    && echo "   PASS: $CASES cases" \
    && echo "3. Optimizer (>25 lines)..." \
    && test -f src/lib/routing/optimizer.ts \
    && grep -q "optimizeRoute" src/lib/routing/optimizer.ts \
    && LINES=$(wc -l < src/lib/routing/optimizer.ts) && [ "$LINES" -ge 25 ] \
    && echo "   PASS: $LINES lines" \
    && echo "4. Optimizer tests (3+ cases)..." \
    && test -f src/lib/routing/optimizer.test.ts \
    && CASES=$(grep -c "it(\\|test(" src/lib/routing/optimizer.test.ts) && [ "$CASES" -ge 3 ] \
    && echo "   PASS: $CASES cases" \
    && echo "5. DayPlanner (>50 lines)..." \
    && test -f src/components/routes/DayPlanner.tsx \
    && grep -q "DayPlanner" src/components/routes/DayPlanner.tsx \
    && LINES=$(wc -l < src/components/routes/DayPlanner.tsx) && [ "$LINES" -ge 50 ] \
    && echo "   PASS: $LINES lines" \
    && echo "6. PlanningMode component..." \
    && test -f src/components/map/PlanningMode.tsx \
    && grep -q "PlanningMode" src/components/map/PlanningMode.tsx \
    && echo "   PASS" \
    && echo "7. Type-check + tests..." \
    && pnpm type-check && pnpm test \
    && echo "=== ALL PHASE 7 DoD CHECKS PASSED ==="`,
  expectedExitCode: 0,
});

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 8: FILTERS + METRICS + ANNOTATIONS
// ─────────────────────────────────────────────────────────────────────────────

const phase8FiltersMetricsTask = defineTask({
  id: "phase8-filters-metrics",
  title: "Advanced filters, microárea metrics, street annotations",
  kind: "agent",
  prompt: `## SKILLS TO LOAD (read these SKILL.md files BEFORE writing any code):
- .agents/skills/zustand-store/SKILL.md — filter store, persist middleware
- .agents/skills/tailwind-shadcn/SKILL.md — collapsible sections, multi-select, date picker
- .agents/skills/supabase-patterns/SKILL.md — new migration, RLS policy
- .agents/skills/geospatial/SKILL.md — address annotation, name resolution
- .agents/skills/ptbr-conventions/SKILL.md — date format dd/MM/yyyy, filter labels
- .agents/skills/testing-patterns/SKILL.md — test filter combinatorics

${TDD_PREAMBLE}

## TASK: Phase 8 — Filters, microárea metrics, street annotations

GOAL: Complete M3 with powerful filtering, per-microárea statistics, and street name annotations.

### TDD ORDER:
1. Write src/stores/filterStore.test.ts FIRST (filter logic — 4+ cases)
2. Implement filterStore → pass
3. Write src/lib/geocoding/annotations.test.ts (lookup — 3+ cases)
4. Implement annotations → pass
5. Build FilterPanel, MicroareaMetrics UI
6. Create migration

### IMPLEMENTATION:

1. **Filter store** (src/stores/filterStore.ts):
   - State: { microareas: string[], alertLevels: AlertLevel[], dateRange: { from: Date, to: Date } | null, searchText: string }
   - applyFilters(patients: PatientRecord[]): PatientRecord[]
   - setMicroareaFilter, setAlertFilter, setDateRange, setSearch, clearFilters
   - activeFilterCount computed
   - Export useFilterStore

2. **Filter UI** (src/components/sidebar/FilterPanel.tsx):
   - Collapsible section (shadcn/ui Collapsible or Accordion)
   - Multi-select checkboxes for microáreas
   - Alert level toggles (vermelho/amarelo/verde)
   - Date range picker for "última atualização"
   - "Limpar filtros" button
   - Active filter count badge
   - All labels in PT-BR
   - Export FilterPanel (>50 lines)

3. **Microárea metrics** (src/components/sidebar/MicroareaMetrics.tsx):
   - Per-territory stats: patient count, red/yellow alerts count
   - "Sem visita > 30 dias" counter
   - Click → sets microárea filter
   - Export MicroareaMetrics (>30 lines)

4. **Street annotations** (src/lib/geocoding/annotations.ts):
   - getOfficialName(popularName: string): Promise<string | null>
   - addAnnotation(official, popular, notes): Promise<void>
   - Queries Supabase street_annotations table
   - Export both

5. **Migration** (supabase/migrations/003_street_annotations.sql):
   - CREATE TABLE street_annotations (id, user_id, official_name, popular_name, notes, created_at)
   - RLS: authenticated users can read all, write their own

### TESTS (minimum 7 cases, written FIRST):
- filterStore.test.ts: single microárea filter, alert level filter, date filter, combined, clear (5 cases)
- annotations.test.ts: found match, no match (2 cases)

DEFINITION OF DONE:
- [ ] src/stores/filterStore.ts exports useFilterStore with applyFilters, clearFilters (>40 lines)
- [ ] src/stores/filterStore.test.ts has 5+ cases
- [ ] src/components/sidebar/FilterPanel.tsx exports FilterPanel (>50 lines)
- [ ] src/components/sidebar/MicroareaMetrics.tsx exports MicroareaMetrics (>30 lines)
- [ ] src/lib/geocoding/annotations.ts exports getOfficialName
- [ ] src/lib/geocoding/annotations.test.ts has 2+ cases
- [ ] supabase/migrations/003_street_annotations.sql exists with CREATE TABLE + RLS
- [ ] pnpm type-check && pnpm test pass`,
});

const phase8DodTask = defineTask({
  id: "phase8-dod",
  title: "HARD DoD: Phase 8 — filters + metrics + annotations + migration + tests",
  kind: "shell",
  command: `cd {{projectDir}} && echo "=== DoD Phase 8 ===" \
    && echo "1. Filter store (>40 lines)..." \
    && test -f src/stores/filterStore.ts \
    && grep -q "useFilterStore" src/stores/filterStore.ts \
    && grep -q "applyFilters" src/stores/filterStore.ts \
    && LINES=$(wc -l < src/stores/filterStore.ts) && [ "$LINES" -ge 40 ] \
    && echo "   PASS: $LINES lines" \
    && echo "2. Filter store tests (5+ cases)..." \
    && test -f src/stores/filterStore.test.ts \
    && CASES=$(grep -c "it(\\|test(" src/stores/filterStore.test.ts) && [ "$CASES" -ge 5 ] \
    && echo "   PASS: $CASES cases" \
    && echo "3. FilterPanel (>50 lines)..." \
    && test -f src/components/sidebar/FilterPanel.tsx \
    && grep -q "FilterPanel" src/components/sidebar/FilterPanel.tsx \
    && LINES=$(wc -l < src/components/sidebar/FilterPanel.tsx) && [ "$LINES" -ge 50 ] \
    && echo "   PASS: $LINES lines" \
    && echo "4. MicroareaMetrics (>30 lines)..." \
    && test -f src/components/sidebar/MicroareaMetrics.tsx \
    && grep -q "MicroareaMetrics" src/components/sidebar/MicroareaMetrics.tsx \
    && LINES=$(wc -l < src/components/sidebar/MicroareaMetrics.tsx) && [ "$LINES" -ge 30 ] \
    && echo "   PASS: $LINES lines" \
    && echo "5. Annotations module..." \
    && test -f src/lib/geocoding/annotations.ts \
    && grep -q "getOfficialName" src/lib/geocoding/annotations.ts \
    && echo "   PASS" \
    && echo "6. Annotations tests..." \
    && test -f src/lib/geocoding/annotations.test.ts \
    && CASES=$(grep -c "it(\\|test(" src/lib/geocoding/annotations.test.ts) && [ "$CASES" -ge 2 ] \
    && echo "   PASS: $CASES cases" \
    && echo "7. Migration file..." \
    && test -f supabase/migrations/003_street_annotations.sql \
    && grep -qi "create table" supabase/migrations/003_street_annotations.sql \
    && grep -qi "policy\\|rls" supabase/migrations/003_street_annotations.sql \
    && echo "   PASS" \
    && echo "8. Type-check + tests..." \
    && pnpm type-check && pnpm test \
    && echo "=== ALL PHASE 8 DoD CHECKS PASSED ==="`,
  expectedExitCode: 0,
});

const m3CompletenessReviewTask = defineTask({
  id: "m3-completeness-review",
  title: "AGENT REVIEW: Verify M3 milestone completeness against SPEC.md",
  kind: "agent",
  prompt: `## SKILLS TO LOAD:
- .agents/skills/testing-patterns/SKILL.md — what counts as adequate test coverage

You are a completeness reviewer. Your ONLY job is to verify that M3 (Planning) is truly done.

Read SPEC.md and check the M3 checklist:
- [ ] Rota simples (US → paciente, walking/driving)
- [ ] Seleção de múltiplos pacientes para roteiro
- [ ] Otimização de rota (ordem eficiente)
- [ ] Métricas por microárea
- [ ] Filtros avançados (data, microárea, alerta)
- [ ] Anotações e nomes alternativos de ruas

For EACH item:
1. Find the source file(s) implementing it
2. Verify it has real code (>15 lines of logic, not just types/imports)
3. Verify it has test coverage (a .test.ts file with assertions)
4. Verify it exports the expected API

OUTPUT FORMAT:
- DONE: <item> — <file> — <lines of code> — <test file with N cases>
- MISSING: <item> — <what's missing specifically>

Start with "INCOMPLETE:" or "COMPLETE:" on line 1.

STRICTNESS:
- A file that only re-exports is NOT implementation
- A UI component with only a return <div>placeholder</div> is NOT done
- An empty test file is NOT coverage`,
});

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 9: FINAL INTEGRATION
// ─────────────────────────────────────────────────────────────────────────────

const phase9FinalVerifyTask = defineTask({
  id: "phase9-final-verify",
  title: "Full integration verification — build + type-check + lint + tests",
  kind: "shell",
  command: "cd {{projectDir}} && pnpm type-check && pnpm lint && pnpm test && pnpm build",
  expectedExitCode: 0,
});
