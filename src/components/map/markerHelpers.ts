import type { AlertLevel } from "@/types/alerts";

/** Coordinate key used for coincidence counting. */
export function coincidenceKey(lat: number, lng: number): string {
  return `${lat.toFixed(6)},${lng.toFixed(6)}`;
}

/**
 * Build a map from coordinate key → count of patient markers at that position.
 * Used to render the coincidence badge when N > 1 patients share coordinates.
 */
export function buildCoincidenceMap(
  patients: ReadonlyArray<{ lat: number; lng: number }>,
): Map<string, number> {
  const map = new Map<string, number>();
  for (const p of patients) {
    const k = coincidenceKey(p.lat, p.lng);
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  return map;
}

/** Alert severity rank — higher number = worse. */
const ALERT_RANK: Record<AlertLevel, number> = {
  vermelho: 2,
  amarelo: 1,
  verde: 0,
};

/**
 * Returns the highest-severity alert level from a list.
 * Falls back to "verde" for an empty array.
 */
export function worstAlertLevel(levels: AlertLevel[]): AlertLevel {
  let worst: AlertLevel = "verde";
  for (const level of levels) {
    if (ALERT_RANK[level] > ALERT_RANK[worst]) {
      worst = level;
    }
  }
  return worst;
}
