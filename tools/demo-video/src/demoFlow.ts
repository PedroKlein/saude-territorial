import type {Locator, Page, Route} from "playwright";
import {demoScenario} from "./scenario";

export type DemoPointerAction = {
  type: "move" | "click";
  x: number;
  y: number;
  durationMs: number;
};

export type DemoStage =
  | "authenticate"
  | "register-patient"
  | "show-alert"
  | "suggest-plan"
  | "add-manual-stop"
  | "optimize-route"
  | "save-plan"
  | "reload-plan"
  | "show-full-route"
  | "complete";

type DemoFlowOptions = {
  baseUrl: string;
  externalServices?: "live" | "mocked";
  onPointerAction?: (action: DemoPointerAction) => void;
  onStage?: (stage: DemoStage) => void;
  patientDetailHoldMs?: number;
  pause?: () => Promise<void>;
  pointerSteps?: number;
  scrollDelayMs?: number;
  typingDelayMs?: number;
};

type Interaction = {
  patientDetailHoldMs: number;
  pause: () => Promise<void>;
  pointerSteps: number;
  scrollDelayMs: number;
  typingDelayMs: number;
};

type RouteRequest = {
  waypoints?: Array<{lat: number; lng: number}>;
};

const pointerActionHandlers = new WeakMap<Page, (action: DemoPointerAction) => void>();

const noop = async () => undefined;

function emitPointerAction(page: Page, action: DemoPointerAction): void {
  pointerActionHandlers.get(page)?.(action);
}

function routeRequest(route: Route): RouteRequest {
  try {
    return route.request().postDataJSON() as RouteRequest;
  } catch {
    return {};
  }
}

function coordinatesFrom(route: Route): [number, number][] {
  const waypoints = routeRequest(route).waypoints ?? [];
  return waypoints.map(({lat, lng}) => [lng, lat]);
}

async function installDeterministicBoundaries(page: Page): Promise<void> {
  const transparentPng = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
    "base64",
  );
  const fulfillExternalImage = async (route: Route) => {
    try {
      await route.fulfill({response: await route.fetch()});
    } catch {
      await route.fulfill({status: 200, contentType: "image/png", body: transparentPng});
    }
  };
  await page.route(/https:\/\/tile\.openstreetmap\.org\//, fulfillExternalImage);
  await page.route(/https:\/\/unpkg\.com\/leaflet\//, fulfillExternalImage);
  await page.route(/\/api\/geocode$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: "{}",
    });
  });

  await page.route(/\/api\/routes\/optimize$/, async (route) => {
    const coordinates = coordinatesFrom(route);
    const lastIndex = Math.max(0, coordinates.length - 1);
    const middle = Array.from({length: Math.max(0, lastIndex - 1)}, (_, index) => index + 1);
    const first = middle[0];
    const second = middle[1];
    if (first !== undefined && second !== undefined) {
      middle[0] = second;
      middle[1] = first;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        order: [0, ...middle, lastIndex],
        distance: 4200,
        duration: 1800,
        geometry: {type: "LineString", coordinates},
      }),
    });
  });

  await page.route(/\/api\/routes$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        distance: 4200,
        duration: 1800,
        geometry: {type: "LineString", coordinates: coordinatesFrom(route)},
      }),
    });
  });
}

async function movePointerTo(
  page: Page,
  locator: Locator,
  pointerSteps: number,
): Promise<{x: number; y: number}> {
  const box = await locator.boundingBox();
  if (!box) throw new Error("Interaction target is not visible.");
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  const durationMs = pointerSteps > 1 ? Math.max(240, pointerSteps * 14) : 0;
  emitPointerAction(page, {type: "move", x, y, durationMs});
  if (durationMs > 0) await page.waitForTimeout(durationMs);
  await page.mouse.move(x, y);
  return {x, y};
}

async function clickTarget(
  page: Page,
  locator: Locator,
  pointerSteps: number,
): Promise<void> {
  await locator.scrollIntoViewIfNeeded();
  const point = await movePointerTo(page, locator, pointerSteps);
  emitPointerAction(page, {type: "click", ...point, durationMs: 0});
  await locator.click();
}

async function enterText(
  page: Page,
  locator: Locator,
  value: string,
  interaction: Interaction,
): Promise<void> {
  await clickTarget(page, locator, interaction.pointerSteps);
  if (interaction.typingDelayMs === 0) {
    await locator.fill(value);
    return;
  }
  await locator.pressSequentially(value, {delay: interaction.typingDelayMs});
}

async function selectDate(
  page: Page,
  label: string,
  date: {display: string},
  interaction: Interaction,
): Promise<void> {
  const trigger = page.getByLabel(label);
  await scrollTo(page, trigger, interaction.scrollDelayMs);
  await clickTarget(page, trigger, interaction.pointerSteps);
  await clickTarget(
    page,
    page.locator(`[data-day="${date.display}"]`),
    interaction.pointerSteps,
  );
}

async function selectEnum(
  page: Page,
  label: string,
  option: string,
  interaction: Interaction,
): Promise<void> {
  const trigger = page.getByLabel(label);
  await scrollTo(page, trigger, interaction.scrollDelayMs);
  await clickTarget(page, trigger, interaction.pointerSteps);
  await clickTarget(
    page,
    page.getByRole("option", {name: option, exact: true}),
    interaction.pointerSteps,
  );
}

async function scrollTo(
  page: Page,
  locator: Locator,
  scrollDelayMs: number,
): Promise<void> {
  if (scrollDelayMs === 0) {
    await locator.scrollIntoViewIfNeeded();
    return;
  }
  await locator.evaluate((element) => {
    element.scrollIntoView({behavior: "smooth", block: "center"});
  });
  await page.waitForTimeout(scrollDelayMs);
}

async function advance(page: Page, interaction: Interaction): Promise<void> {
  await clickTarget(
    page,
    page.getByRole("button", {name: "Avançar"}),
    interaction.pointerSteps,
  );
  await interaction.pause();
}

async function registerPatient(
  page: Page,
  interaction: Interaction,
): Promise<void> {
  const {patient} = demoScenario;

  await clickTarget(
    page,
    page.getByRole("button", {name: "+ Adicionar paciente"}),
    interaction.pointerSteps,
  );
  await page.getByRole("heading", {name: "Identidade"}).waitFor();
  await enterText(page, page.getByLabel("CNS"), patient.cns, interaction);
  await enterText(page, page.getByLabel("Nome completo"), patient.name, interaction);
  await advance(page, interaction);

  await page.getByRole("heading", {name: "Endereço"}).waitFor();
  await enterText(page, page.getByLabel("Rua"), patient.street, interaction);
  await enterText(page, page.getByLabel("Número"), patient.number, interaction);
  await enterText(page, page.getByLabel("Bairro"), patient.neighborhood, interaction);
  await enterText(
    page,
    page.getByLabel("Referência do endereço"),
    patient.reference,
    interaction,
  );
  const adjustPin = page.getByRole("button", {name: "Ajustar pino manualmente"});
  await adjustPin.waitFor();
  await clickTarget(page, adjustPin, interaction.pointerSteps);

  const addressStep = page.getByRole("dialog");
  const map = addressStep.locator(".leaflet-container");
  await map.waitFor();
  await scrollTo(page, map, interaction.scrollDelayMs);
  const box = await map.boundingBox();
  if (!box) throw new Error("Manual pin map is not visible.");
  const pinX = box.x + box.width * 0.62;
  const pinY = box.y + box.height * 0.45;
  const pointerDurationMs = Math.max(240, interaction.pointerSteps * 14);
  emitPointerAction(page, {
    type: "move",
    x: pinX,
    y: pinY,
    durationMs: pointerDurationMs,
  });
  await page.waitForTimeout(pointerDurationMs);
  await page.mouse.move(pinX, pinY);
  emitPointerAction(page, {type: "click", x: pinX, y: pinY, durationMs: 0});
  await page.mouse.click(pinX, pinY);
  await page.getByText("Pino posicionado manualmente").waitFor();
  await advance(page, interaction);

  await page.getByRole("heading", {name: "Condições"}).waitFor();
  await clickTarget(
    page,
    page.getByText("Gestante", {exact: true}),
    interaction.pointerSteps,
  );
  await advance(page, interaction);

  await page.getByRole("heading", {name: "Gestante"}).waitFor();
  const {pregnancy} = demoScenario;
  await selectDate(
    page,
    "Data da última menstruação",
    pregnancy.dum,
    interaction,
  );
  const highRisk = page.getByRole("radio", {name: "Alto risco"});
  await scrollTo(page, highRisk, interaction.scrollDelayMs);
  await clickTarget(page, highRisk, interaction.pointerSteps);
  await page.getByText("Regra de alerta ativada", {exact: false}).waitFor();
  await selectDate(
    page,
    "Data da última consulta",
    pregnancy.lastConsultation,
    interaction,
  );
  await selectDate(
    page,
    "Data da próxima consulta",
    pregnancy.nextConsultation,
    interaction,
  );
  await enterText(
    page,
    page.getByLabel("Número de consultas"),
    pregnancy.consultations,
    interaction,
  );
  await enterText(
    page,
    page.getByLabel("Pressão arterial"),
    pregnancy.bloodPressure,
    interaction,
  );

  const advancedFields = page.getByRole("button", {name: "Mostrar campos avançados"});
  await scrollTo(page, advancedFields, interaction.scrollDelayMs);
  await clickTarget(page, advancedFields, interaction.pointerSteps);
  await selectEnum(page, "Vacina DTPa", pregnancy.dtpa, interaction);
  await selectEnum(
    page,
    "IG na abertura do pré-natal",
    pregnancy.prenatalStart,
    interaction,
  );
  const homeVisits = page.getByLabel("Número de visitas domiciliares");
  await scrollTo(page, homeVisits, interaction.scrollDelayMs);
  await enterText(page, homeVisits, pregnancy.homeVisits, interaction);
  await selectEnum(
    page,
    "Acompanhamento peso/altura",
    pregnancy.weightFollowUp,
    interaction,
  );
  await selectEnum(
    page,
    "Avaliação odontológica",
    pregnancy.dentalEvaluation,
    interaction,
  );
  await selectEnum(
    page,
    "TR Sífilis/HIV 1º trimestre",
    pregnancy.firstTrimesterTest,
    interaction,
  );
  await selectEnum(
    page,
    "TR Sífilis/HIV 2º trimestre",
    pregnancy.secondTrimesterTest,
    interaction,
  );
  await selectEnum(
    page,
    "TR Sífilis/HIV 3º trimestre",
    pregnancy.thirdTrimesterTest,
    interaction,
  );
  await selectEnum(
    page,
    "Resultado do teste rápido",
    pregnancy.rapidTestResult,
    interaction,
  );
  await selectEnum(
    page,
    "TR ou avaliação Sífilis+HIV+HepB+HepC 1º trimestre",
    pregnancy.firstTrimesterExpandedTest,
    interaction,
  );
  await selectEnum(
    page,
    "TR ou avaliação Sífilis+HIV 3º trimestre",
    pregnancy.thirdTrimesterExpandedTest,
    interaction,
  );
  const previousHypertension = page.getByLabel("HAS prévia");
  await scrollTo(page, previousHypertension, interaction.scrollDelayMs);
  await enterText(
    page,
    previousHypertension,
    pregnancy.previousHypertension,
    interaction,
  );
  await enterText(
    page,
    page.getByLabel("Diabetes prévia"),
    pregnancy.previousDiabetes,
    interaction,
  );
  await advance(page, interaction);

  await page.getByRole("heading", {name: "Confirmar"}).waitFor();
  await clickTarget(
    page,
    page.getByRole("button", {name: "Finalizar"}),
    interaction.pointerSteps,
  );
  await page.getByRole("heading", {name: "Paciente cadastrado!"}).waitFor();
  await clickTarget(
    page,
    page.getByRole("button", {name: "Ver no mapa"}),
    interaction.pointerSteps,
  );
  await page.getByText("Detalhes do paciente").waitFor();
}

async function showPatientAlert(
  page: Page,
  interaction: Interaction,
): Promise<void> {
  await clickTarget(
    page,
    page.getByRole("button", {name: "Fechar painel"}),
    interaction.pointerSteps,
  );
  await clickTarget(
    page,
    page.getByRole("button", {name: /^Alertas \d+$/}),
    interaction.pointerSteps,
  );
  await enterText(
    page,
    page.getByPlaceholder("Buscar paciente ou endereço…"),
    demoScenario.patient.name,
    interaction,
  );
  await interaction.pause();
  const priorityRow = page.getByRole("button", {
    name: new RegExp(`^${demoScenario.patient.name} `),
  });
  const point = await movePointerTo(page, priorityRow, interaction.pointerSteps);
  emitPointerAction(page, {type: "click", ...point, durationMs: 0});
  await priorityRow.evaluate((button: HTMLButtonElement) => { button.click(); });
  await page.getByText("Detalhes do paciente").waitFor();
  await page.getByText("risco alto", {exact: false}).waitFor();
  await interaction.pause();
  await page.waitForTimeout(interaction.patientDetailHoldMs);
  await clickTarget(
    page,
    page.getByRole("button", {name: "Fechar painel"}),
    interaction.pointerSteps,
  );
}

async function suggestPlan(
  page: Page,
  interaction: Interaction,
): Promise<number> {
  await clickTarget(
    page,
    page.getByRole("button", {name: "Planejar visita"}),
    interaction.pointerSteps,
  );
  await page.getByRole("heading", {name: "Planejamento do dia"}).waitFor();
  await enterText(
    page,
    page.getByPlaceholder("Nome do ACS (opcional)"),
    demoScenario.planner.acsName,
    interaction,
  );
  await clickTarget(
    page,
    page.getByRole("button", {name: "Carro"}),
    interaction.pointerSteps,
  );
  const routeResponsePromise = page.waitForResponse((response) =>
    response.url().endsWith("/api/routes") && response.request().method() === "POST",
  );
  await clickTarget(
    page,
    page.getByRole("button", {name: /Sugerir plano para hoje/}),
    interaction.pointerSteps,
  );
  const routeResponse = await routeResponsePromise;
  if (!routeResponse.ok()) throw new Error("Routing service unavailable.");
  const count = page.getByText(/\d+ \/ 12 paradas?/);
  await count.waitFor();
  await scrollTo(page, page.getByText("Ordem da rota"), interaction.scrollDelayMs);
  await interaction.pause();
  return Number.parseInt((await count.textContent()) ?? "0", 10);
}

async function addManualStop(
  page: Page,
  previousCount: number,
  interaction: Interaction,
): Promise<number> {
  const planner = page.locator('[data-slot="sheet-content"]');
  const picker = planner.getByRole("combobox");
  await scrollTo(page, picker, interaction.scrollDelayMs);
  await clickTarget(page, picker, interaction.pointerSteps);
  const options = page.getByRole("option");
  const optionCount = await options.count();
  for (let index = 0; index < optionCount; index++) {
    const option = options.nth(index);
    if (await option.isEnabled()) {
      const routeResponsePromise = page.waitForResponse((response) =>
        response.url().endsWith("/api/routes") && response.request().method() === "POST",
      );
      await clickTarget(page, option, interaction.pointerSteps);
      const routeResponse = await routeResponsePromise;
      if (!routeResponse.ok()) throw new Error("Routing service unavailable.");
      const nextCount = previousCount + 1;
      await page.getByText(`${nextCount} / 12 paradas`).waitFor();
      await interaction.pause();
      return nextCount;
    }
  }
  throw new Error("No manual plan candidate is available.");
}

async function optimizeRoute(
  page: Page,
  interaction: Interaction,
): Promise<void> {
  const optimize = page.getByRole("button", {name: "Otimizar"});
  await scrollTo(page, optimize, interaction.scrollDelayMs);
  if (await optimize.isEnabled()) {
    const routeResponsePromise = page.waitForResponse((response) =>
      response.url().endsWith("/api/routes") && response.request().method() === "POST",
    );
    const [optimizeResponse] = await Promise.all([
      page.waitForResponse((response) => response.url().endsWith("/api/routes/optimize")),
      clickTarget(page, optimize, interaction.pointerSteps),
    ]);
    if (!optimizeResponse.ok()) throw new Error("Route optimization unavailable.");
    const routeResponse = await routeResponsePromise;
    if (!routeResponse.ok()) throw new Error("Routing service unavailable.");
    await interaction.pause();
  }
}

async function savePlan(page: Page, interaction: Interaction): Promise<void> {
  await clickTarget(
    page,
    page.getByRole("button", {name: "Salvar"}),
    interaction.pointerSteps,
  );
  const saveDialog = page.getByRole("dialog", {name: "Salvar plano do dia"});
  await saveDialog.getByRole("heading", {name: "Salvar plano do dia"}).waitFor();
  await saveDialog.getByLabel("Data").fill(demoScenario.planner.date);
  await Promise.all([
    page.waitForResponse((response) =>
      response.url().endsWith("/api/plans") && response.request().method() === "POST",
    ),
    clickTarget(
      page,
      saveDialog.getByRole("button", {name: "Salvar"}),
      interaction.pointerSteps,
    ),
  ]);
  await saveDialog.waitFor({state: "hidden"});
  await interaction.pause();
}

async function reloadPlan(
  page: Page,
  expectedStops: number,
  interaction: Interaction,
): Promise<void> {
  await clickTarget(
    page,
    page.getByRole("button", {name: "Limpar plano"}),
    interaction.pointerSteps,
  );
  await page.getByText("0 / 12 paradas").waitFor();
  await clickTarget(
    page,
    page.getByRole("button", {name: "Carregar"}),
    interaction.pointerSteps,
  );
  const loadDialog = page.getByRole("dialog", {name: "Carregar plano salvo"});
  await loadDialog.getByRole("heading", {name: "Carregar plano salvo"}).waitFor();
  const savedPlan = loadDialog
    .getByRole("button")
    .filter({hasText: demoScenario.planner.dateDisplay})
    .filter({hasText: demoScenario.planner.acsName});
  const routeResponsePromise = page.waitForResponse((response) =>
    response.url().endsWith("/api/routes") && response.request().method() === "POST",
  );
  await Promise.all([
    page.waitForResponse((response) => /\/api\/plans\/[0-9a-f-]+$/.test(response.url())),
    clickTarget(page, savedPlan, interaction.pointerSteps),
  ]);
  await loadDialog.waitFor({state: "hidden"});
  const routeResponse = await routeResponsePromise;
  if (!routeResponse.ok()) throw new Error("Routing service unavailable.");
  await page.getByText(`${expectedStops} / 12 paradas`).waitFor();
  await interaction.pause();
}

async function showFullRoute(page: Page, interaction: Interaction): Promise<void> {
  const zoomOut = page.locator(".leaflet-control-zoom-out");
  await zoomOut.waitFor();
  for (let step = 0; step < 2; step++) {
    await clickTarget(page, zoomOut, interaction.pointerSteps);
    await page.waitForTimeout(Math.max(250, interaction.scrollDelayMs));
  }
  await interaction.pause();
}

export async function runDemoFlow(
  page: Page,
  options: DemoFlowOptions,
): Promise<{stopCount: number}> {
  const pause = options.pause ?? noop;
  const stage = async (value: DemoStage) => {
    options.onStage?.(value);
    await pause();
  };

  pointerActionHandlers.set(page, options.onPointerAction ?? (() => undefined));
  if ((options.externalServices ?? "mocked") === "mocked") {
    await installDeterministicBoundaries(page);
  }
  await page.addInitScript(() => {
    localStorage.removeItem("saude-territorial-map");
    localStorage.removeItem("saude-territorial-planner");
  });

  await stage("authenticate");
  await page.goto(`${options.baseUrl}/api/auth/dev-session?redirect=/map`);
  await page.waitForURL(/\/map$/);
  await page.getByRole("heading", {name: "Saúde Territorial"}).waitFor();

  const interaction: Interaction = {
    patientDetailHoldMs: options.patientDetailHoldMs ?? 0,
    pause,
    pointerSteps: options.pointerSteps ?? 1,
    scrollDelayMs: options.scrollDelayMs ?? 0,
    typingDelayMs: options.typingDelayMs ?? 0,
  };

  await stage("register-patient");
  await registerPatient(page, interaction);

  await stage("show-alert");
  await showPatientAlert(page, interaction);

  await stage("suggest-plan");
  const suggestedStops = await suggestPlan(page, interaction);

  await stage("add-manual-stop");
  const totalStops = await addManualStop(page, suggestedStops, interaction);

  await stage("optimize-route");
  await optimizeRoute(page, interaction);

  await stage("save-plan");
  await savePlan(page, interaction);

  await stage("reload-plan");
  await reloadPlan(page, totalStops, interaction);

  await stage("show-full-route");
  await showFullRoute(page, interaction);

  await stage("complete");
  return {stopCount: totalStops};
}
