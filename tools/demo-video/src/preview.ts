import {chromium} from "playwright";
import {runDemoFlow} from "./demoFlow";
import {demoViewport} from "./scenario";

function readMilliseconds(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined) return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${name} must be a non-negative number.`);
  }
  return value;
}

const baseUrl = process.env.DEMO_URL ?? "http://localhost:3000";
const actionDelayMs = readMilliseconds("DEMO_ACTION_DELAY_MS", 250);
const patientDetailHoldMs = readMilliseconds("DEMO_PATIENT_DETAIL_HOLD_MS", 5000);
const finalHoldMs = readMilliseconds("DEMO_FINAL_HOLD_MS", 15000);
const browser = await chromium.launch({headless: false, slowMo: actionDelayMs});
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
  await runDemoFlow(page, {
    baseUrl,
    externalServices: "live",
    onStage: (stage) => console.log(`[demo-preview] ${stage}`),
    patientDetailHoldMs,
    pause: () => page.waitForTimeout(actionDelayMs * 4),
    pointerSteps: 24,
    scrollDelayMs: actionDelayMs * 3,
    typingDelayMs: Math.max(40, Math.round(actionDelayMs / 3)),
  });
  console.log(`[demo-preview] holding-final-state ms=${finalHoldMs}`);
  await page.waitForTimeout(finalHoldMs);
  if (browserErrorCount > 0) {
    console.warn(`[demo-preview] browser-error-events=${browserErrorCount}`);
  }
} finally {
  await browser.close();
}
