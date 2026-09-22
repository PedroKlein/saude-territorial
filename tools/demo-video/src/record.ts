import {mkdir, writeFile} from "node:fs/promises";
import {dirname, resolve} from "node:path";
import {chromium} from "playwright";
import {runDemoFlow, type DemoPointerAction, type DemoStage} from "./demoFlow";
import {demoViewport} from "./scenario";

const outputPath = resolve("public/capture.webm");
const eventPath = resolve("artifacts/capture-events.json");
const timelinePath = resolve("src/captureTimeline.generated.ts");
const demoUrl = process.env.DEMO_URL;

type CaptureEvent =
  | ({kind: "pointer"; atMs: number} & DemoPointerAction)
  | {kind: "stage"; atMs: number; stage: DemoStage};

const fixtureUrl = `data:text/html,${encodeURIComponent(`
<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8">
    <style>
      * { box-sizing: border-box; }
      body { margin: 0; font-family: system-ui, sans-serif; background: #f1f5f9; color: #0f172a; }
      main { min-height: 100vh; display: grid; place-items: center; }
      section { width: 780px; padding: 48px; border-radius: 24px; background: white; box-shadow: 0 20px 60px #0f172a20; }
      h1 { margin: 0 0 12px; font-size: 44px; }
      p { margin: 0 0 32px; color: #475569; font-size: 22px; }
      button { border: 0; border-radius: 12px; padding: 16px 24px; background: #166534; color: white; font: inherit; cursor: pointer; }
      output { display: block; margin-top: 24px; min-height: 28px; color: #166534; font-weight: 700; }
    </style>
  </head>
  <body>
    <main>
      <section>
        <h1>Saúde Territorial</h1>
        <p>Ambiente local para validar a gravação automatizada.</p>
        <button type="button">Mostrar resultado</button>
        <output></output>
      </section>
    </main>
    <script>
      document.querySelector('button').addEventListener('click', () => {
        document.querySelector('output').textContent = 'Interação capturada com sucesso';
      });
    </script>
  </body>
</html>
`)}`;

await mkdir(dirname(outputPath), {recursive: true});

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: demoViewport,
  recordVideo: {
    dir: resolve("artifacts"),
    size: demoViewport,
  },
});
const page = await context.newPage();
const video = page.video();
const startedAt = performance.now();
const events: CaptureEvent[] = [];
const atMs = () => Math.round(performance.now() - startedAt);

if (demoUrl) {
  await runDemoFlow(page, {
    baseUrl: demoUrl,
    externalServices: "live",
    onPointerAction: (action) => events.push({kind: "pointer", atMs: atMs(), ...action}),
    onStage: (stage) => {
      events.push({kind: "stage", atMs: atMs(), stage});
      console.log(`[demo-record] ${stage}`);
    },
    patientDetailHoldMs: 5000,
    pause: () => page.waitForTimeout(1000),
    pointerSteps: 24,
    scrollDelayMs: 750,
    typingDelayMs: 80,
  });
  await page.waitForTimeout(4000);
} else {
  await page.goto(fixtureUrl);
  await page.waitForTimeout(1000);
  await page.getByRole("button", {name: "Mostrar resultado"}).click();
  await page.waitForTimeout(7000);
}
await context.close();
await video?.saveAs(outputPath);
await writeFile(eventPath, `${JSON.stringify(events, null, 2)}\n`);
const pointerEvents = events
  .filter((event) => event.kind === "pointer")
  .map((event) => ({
    atFrame: Math.round(event.atMs * 30 / 1000),
    durationInFrames: Math.round(event.durationMs * 30 / 1000),
    type: event.type,
    x: event.x,
    y: event.y,
  }));
const timelineRows = pointerEvents.map((event) => `  ${JSON.stringify(event)},`).join("\n");
const timelineSource = `export type CapturedPointerEvent = {atFrame: number; durationInFrames: number; type: "move" | "click"; x: number; y: number};\n\nexport const capturedPointerEvents: CapturedPointerEvent[] = [\n${timelineRows}\n];\n`;
await writeFile(timelinePath, timelineSource);
await browser.close();
console.log(`[demo-record] video=${outputPath}`);
console.log(`[demo-record] events=${eventPath}`);
console.log(`[demo-record] timeline=${timelinePath}`);
