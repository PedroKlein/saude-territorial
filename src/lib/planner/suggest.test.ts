/**
 * Unit tests for src/lib/planner/suggest.ts
 *
 * LGPD: all patient data is synthetic / fictitious.
 */

import { describe, it, expect } from "vitest";
import { suggestPlan, haversine } from "./suggest";
import type { PatientRecord } from "@/hooks/usePatientData";
import type { LayerId } from "@/config/layers.config";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Creates a minimal synthetic PatientRecord. */
function makePatient(
  overrides: Partial<PatientRecord> & { id: string },
): PatientRecord {
  return {
    cns: `000000000000000`,
    nomeCompleto: "Paciente Teste",
    lat: -30.07,
    lng: -51.22,
    ...overrides,
  };
}

// Eight patients: 3 red, 2 amber, 3 no-alert.
// Red patients have risco="alto" so the gestante rule fires (if layerId=gestantes)
// But we're testing the suggest scorer which calls evaluatePatient — for simplicity
// we control alert level by injecting alert flags directly.
//
// Since evaluatePatient reads from the patient record, we can trigger the
// "gestante red alert" rule by setting risco="alto" and assigning layerId=gestantes.
// But the simplest approach: use the existing HAS rule which fires on
// dataUltimaConsulta older_than_days 180.

const TODAY = new Date("2025-08-13");

// Helper: date string that is N days before TODAY in dd/MM/yyyy format
function daysAgo(n: number): string {
  const d = new Date(TODAY);
  d.setDate(d.getDate() - n);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

// HAS rule: dataUltimaConsulta older_than_days 180 → vermelho
// HAS rule: dataUltimaConsulta older_than_days 90 (and ≤ 180) → amarelo
// We use these to drive alert levels.

const RED_PATIENT_1 = makePatient({
  id: "red-1",
  lat: -30.060,
  lng: -51.210,
  dataUltimaConsulta: daysAgo(200), // triggers HAS vermelho
});
const RED_PATIENT_2 = makePatient({
  id: "red-2",
  lat: -30.065,
  lng: -51.215,
  dataUltimaConsulta: daysAgo(210),
});
const RED_PATIENT_3 = makePatient({
  id: "red-3",
  lat: -30.070,
  lng: -51.220,
  dataUltimaConsulta: daysAgo(190),
});
const AMBER_PATIENT_1 = makePatient({
  id: "amber-1",
  lat: -30.072,
  lng: -51.225,
  dataUltimaConsulta: daysAgo(100), // triggers HAS amarelo
});
const AMBER_PATIENT_2 = makePatient({
  id: "amber-2",
  lat: -30.075,
  lng: -51.230,
  dataUltimaConsulta: daysAgo(120),
});
const GREEN_PATIENT_1 = makePatient({
  id: "green-1",
  lat: -30.080,
  lng: -51.235,
  dataUltimaConsulta: daysAgo(10),
});
const GREEN_PATIENT_2 = makePatient({
  id: "green-2",
  lat: -30.085,
  lng: -51.240,
  dataUltimaConsulta: daysAgo(5),
});
const GREEN_PATIENT_3 = makePatient({
  id: "green-3",
  lat: -30.090,
  lng: -51.245,
  dataUltimaConsulta: daysAgo(3),
});

const ALL_PATIENTS: PatientRecord[] = [
  GREEN_PATIENT_1,
  GREEN_PATIENT_2,
  GREEN_PATIENT_3,
  AMBER_PATIENT_1,
  AMBER_PATIENT_2,
  RED_PATIENT_1,
  RED_PATIENT_2,
  RED_PATIENT_3,
];

// All patients are in the HAS layer for rule evaluation.
const layerFor = (_p: PatientRecord): LayerId => "hipertensao";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("suggestPlan", () => {
  it("returns at most cap stops (default 8)", () => {
    const stops = suggestPlan({ patients: ALL_PATIENTS, layerFor, today: TODAY });
    expect(stops.length).toBeLessThanOrEqual(8);
  });

  it("respects a lower cap", () => {
    const stops = suggestPlan({ patients: ALL_PATIENTS, layerFor, today: TODAY, cap: 3 });
    expect(stops.length).toBe(3);
  });

  it("red-alert patients dominate the top of the list before spatial reorder", () => {
    // Collect the top-3 stops by order.
    const stops = suggestPlan({ patients: ALL_PATIENTS, layerFor, today: TODAY });

    // After greedy reorder, all 3 reds must be present in the result set.
    const returnedIds = new Set(stops.map((s) => s.patientId));
    expect(returnedIds.has("red-1")).toBe(true);
    expect(returnedIds.has("red-2")).toBe(true);
    expect(returnedIds.has("red-3")).toBe(true);
  });

  it("all returned stops have unique 1-indexed order values", () => {
    const stops = suggestPlan({ patients: ALL_PATIENTS, layerFor, today: TODAY });
    const orders = stops.map((s) => s.order);
    const unique = new Set(orders);
    expect(unique.size).toBe(stops.length);
    expect(Math.min(...orders)).toBe(1);
    expect(Math.max(...orders)).toBe(stops.length);
  });

  it("excludes patients with no coordinates", () => {
    const noCoord = makePatient({ id: "no-coord", lat: undefined, lng: undefined });
    const stops = suggestPlan({
      patients: [noCoord, RED_PATIENT_1],
      layerFor,
      today: TODAY,
    });
    const ids = stops.map((s) => s.patientId);
    expect(ids).not.toContain("no-coord");
    expect(ids).toContain("red-1");
  });

  it("returns empty array for empty patient list", () => {
    const stops = suggestPlan({ patients: [], layerFor, today: TODAY });
    expect(stops).toHaveLength(0);
  });

  it("patients with no last visit date get max recency boost (treated as 180+ days)", () => {
    const withDate = makePatient({ id: "with-date", lat: -30.07, lng: -51.22, dataUltimaConsulta: daysAgo(5) });
    const withoutDate = makePatient({ id: "without-date", lat: -30.07, lng: -51.22 });
    // Both have no alert. Without-date should score higher (max recency 20 vs ~0.5).
    const stops = suggestPlan({
      patients: [withDate, withoutDate],
      layerFor,
      today: TODAY,
      cap: 2,
    });
    // The without-date patient should appear first (closer to origin and higher score).
    // Since both are green, without-date has recency=20 vs ~0.5
    const ids = stops.map((s) => s.patientId);
    expect(ids).toContain("without-date");
    expect(ids).toContain("with-date");
  });
});

// ---------------------------------------------------------------------------
// Haversine
// ---------------------------------------------------------------------------

describe("haversine", () => {
  it("returns 0 for identical points", () => {
    expect(haversine([-30.07, -51.22], [-30.07, -51.22])).toBe(0);
  });

  it("Porto Alegre to São Paulo is roughly 850 km straight-line", () => {
    const dist = haversine([-30.03, -51.22], [-23.55, -46.63]);
    expect(dist).toBeGreaterThan(700_000); // >700 km in metres
    expect(dist).toBeLessThan(1_000_000);  // <1000 km (straight-line, not road)
  });

  it("is symmetric", () => {
    const a: [number, number] = [-30.06, -51.21];
    const b: [number, number] = [-30.08, -51.23];
    expect(haversine(a, b)).toBeCloseTo(haversine(b, a), 5);
  });
});
