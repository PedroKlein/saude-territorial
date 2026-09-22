import {chromium} from "playwright";
import {runDemoFlow} from "./demoFlow";
import {demoViewport} from "./scenario";

const baseUrl = process.env.DEMO_URL ?? "http://localhost:3000";
const browser = await chromium.launch();
const context = await browser.newContext({viewport: demoViewport});
const page = await context.newPage();
let browserErrorCount = 0;
page.on("console", (message) => {
  if (message.type() === "error") browserErrorCount++;
});
page.on("pageerror", () => {
  browserErrorCount++;
});

try {
  const result = await runDemoFlow(page, {
    baseUrl,
    onStage: (stage) => console.log(`[demo] ${stage}`),
  });
  const [patientsResponse, plansResponse] = await Promise.all([
    page.request.get(`${baseUrl}/api/patients`),
    page.request.get(`${baseUrl}/api/plans`),
  ]);
  if (!patientsResponse.ok() || !plansResponse.ok()) {
    throw new Error("Aggregate API verification failed.");
  }
  const patientBody = (await patientsResponse.json()) as {
    layers?: Record<string, Array<{id: string}>>;
  };
  const planBody = (await plansResponse.json()) as {
    plans?: Array<{stopCount: number}>;
  };
  const uniquePatientIds = new Set(
    Object.values(patientBody.layers ?? {}).flatMap((patients) =>
      patients.map(({id}) => id),
    ),
  );
  if (
    uniquePatientIds.size !== 69 ||
    planBody.plans?.length !== 1 ||
    planBody.plans[0]?.stopCount !== result.stopCount
  ) {
    throw new Error("Unexpected aggregate demo state.");
  }
  await page.waitForTimeout(1000);
  if (browserErrorCount > 0) {
    throw new Error(`Browser emitted ${browserErrorCount} error event(s).`);
  }
  console.log(
    `[demo] verified patients=${uniquePatientIds.size} plans=1 stops=${result.stopCount}`,
  );
} finally {
  await browser.close();
}
