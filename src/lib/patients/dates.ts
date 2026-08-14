/**
 * Date helpers for the gestante flow.
 *
 * `computeDpp` — Data Provável do Parto. Naegele's rule: DUM + 280 days.
 *   The obstetric convention adds 40 weeks (7 * 40 = 280 days) to the last
 *   menstrual period. Kept as a pure add — clinicians who prefer the more
 *   ornate variant (+7d, -3mo, +1y) will get an identical result modulo
 *   leap-year edge cases.
 *
 * `computeIg` — Idade Gestacional. Weeks + trailing days between the DUM
 *   and a reference date (default `today`). Weeks cap at 42 in obstetric
 *   practice; we do not cap here — the caller is free to render "post-42"
 *   as a warning if desired.
 *
 * Both functions accept `Date` objects. Callers holding ISO strings should
 * parse via `new Date(iso)` before calling; we avoid `date-fns/parseISO`
 * here to keep the surface tree-shakable.
 */

const MS_PER_DAY = 86_400_000;
const DPP_OFFSET_DAYS = 280;

/**
 * Data Provável do Parto = DUM + 280 days (40 weeks, Naegele).
 *
 * Returns a new `Date`; the input is not mutated. Time-of-day is copied
 * verbatim so callers can pass a midnight Date without accidental TZ drift.
 */
export function computeDpp(dum: Date): Date {
  return new Date(dum.getTime() + DPP_OFFSET_DAYS * MS_PER_DAY);
}

/**
 * Idade Gestacional between `dum` and `at` (default `new Date()`), expressed
 * as `weeks + days` — the format clinicians use ("38 sem + 4d").
 *
 * When `at < dum`, both fields are zero (pre-conception rather than
 * negative — the UI should treat that as "não iniciada" separately).
 */
export function computeIg(
  dum: Date,
  at: Date = new Date(),
): { weeks: number; days: number } {
  const diffMs = at.getTime() - dum.getTime();
  if (diffMs <= 0) return { weeks: 0, days: 0 };
  const totalDays = Math.floor(diffMs / MS_PER_DAY);
  return { weeks: Math.floor(totalDays / 7), days: totalDays % 7 };
}

/** Convenience formatter — `"38 sem + 4d"`. */
export function formatIg(ig: { weeks: number; days: number }): string {
  return `${ig.weeks} sem${ig.days ? ` + ${ig.days}d` : ""}`;
}
