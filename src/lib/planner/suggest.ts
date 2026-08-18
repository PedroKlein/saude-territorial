/**
 * Auto-suggest and spatial-reorder for the daily visit planner.
 *
 * Pure functions — no side effects, no patient-field logging (LGPD).
 */

import { evaluatePatient } from "@/lib/alerts/engine";
import { ALERT_RULES } from "@/config/alert-rules.config";
import { parseBrazilianDate } from "@/lib/alerts/engine";
import { US_MOAB_CALDAS } from "@/config/geo.constants";
import type { PatientRecord } from "@/hooks/usePatientData";
import type { LayerId } from "@/config/layers.config";
import type { Stop } from "@/stores/plannerStore";

export type SuggestInput = {
  patients: PatientRecord[];
  /** Maps each patient to the layer it lives in, used for rule evaluation. */
  layerFor: (p: PatientRecord) => LayerId;
  today: Date;
  /** Maximum number of stops to return (default 8). */
  cap?: number;
}

const ALERT_WEIGHT: Record<string, number> = {
  vermelho: 100,
  amarelo: 50,
  verde: 0,
};

/**
 * Returns the most recent `dataUltimaConsulta`-style date found in the
 * patient record, or null when none exists.
 *
 * The API emits dates as `dd/MM/yyyy`; we parse with `parseBrazilianDate`
 * from the alert engine.
 */
function lastVisitDate(p: PatientRecord): Date | null {
  // Fields that represent the most recent clinical contact, in precedence order.
  const candidates = [
    "dataUltimaConsulta",
    "dataUltimaAfericaoPA",
    "dataProximaConsulta", // fallback if that's all we have
  ] as const;
  for (const key of candidates) {
    const raw = p[key];
    if (typeof raw === "string" && raw) {
      const parsed = parseBrazilianDate(raw);
      if (parsed) return parsed;
    }
  }
  return null;
}

function recencyScore(p: PatientRecord, today: Date): number {
  const last = lastVisitDate(p);
  if (!last) {
    // No visit recorded — treat as if it were 180 days ago (max recency boost).
    return 20;
  }
  const ms = today.getTime() - last.getTime();
  const days = Math.max(0, ms / (1000 * 60 * 60 * 24));
  return Math.min(days / 180, 1) * 20;
}

function alertScore(p: PatientRecord, layerId: LayerId): number {
  const result = evaluatePatient(ALERT_RULES, p, layerId);
  return ALERT_WEIGHT[result.level] ?? 0;
}

const R = 6_371_000; // Earth radius in metres

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Haversine distance between two [lat, lng] points in metres.
 */
export function haversine(
  [lat1, lng1]: [number, number],
  [lat2, lng2]: [number, number],
): number {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/**
 * Reorders `patients` using a greedy nearest-neighbour heuristic, starting
 * from `origin`. Mutates nothing; returns a new ordered array.
 */
function greedyReorder(
  patients: PatientRecord[],
  origin: [number, number],
): PatientRecord[] {
  const remaining = [...patients];
  const ordered: PatientRecord[] = [];
  let current = origin;

  while (remaining.length > 0) {
    let bestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const p = remaining[i];
      if (p === undefined) continue;
      const d = haversine(current, [p.lat, p.lng]);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }
    const spliced = remaining.splice(bestIdx, 1);
    const next = spliced[0];
    if (next === undefined) break;
    ordered.push(next);
    current = [next.lat, next.lng];
  }

  return ordered;
}

/**
 * Suggests a daily visit plan:
 * 1. Score each patient by alert severity + recency.
 * 2. Sort descending, cap at `input.cap ?? 8`.
 * 3. Greedy nearest-neighbour reorder from US Moab Caldas for spatial locality.
 * 4. Return `Stop[]` with 1-indexed order.
 */
export function suggestPlan(input: SuggestInput): Stop[] {
  const { patients, layerFor, today, cap = 8 } = input;

  const geocoded = patients.filter(
    (p) => typeof p.lat === "number" && typeof p.lng === "number",
  );

  const scored = geocoded
    .map((p) => ({
      p,
      score: alertScore(p, layerFor(p)) + recencyScore(p, today),
    }))
    .sort((a, b) => b.score - a.score);

  const top = scored.slice(0, cap).map((s) => s.p);

  const ordered = greedyReorder(top, US_MOAB_CALDAS);

  return ordered.map((p, i) => ({ patientId: p.id, order: i + 1 }));
}
