/**
 * Alert rule engine — evaluates rules against patient data.
 *
 * Pure functions. No side effects. No patient data logging (LGPD).
 */

import type { AlertLevel, AlertResult, AlertRule } from "@/types/alerts";

/**
 * Parses a Brazilian date string (dd/MM/yyyy) into a Date object.
 * Returns null for invalid or empty input.
 */
export function parseBrazilianDate(dateStr: string): Date | null {
  if (!dateStr || typeof dateStr !== "string") return null;

  const trimmed = dateStr.trim();
  if (!trimmed) return null;

  const parts = trimmed.split("/");
  if (parts.length !== 3) return null;

  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; // 0-indexed
  const year = parseInt(parts[2], 10);

  if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
  if (day < 1 || day > 31 || month < 0 || month > 11 || year < 1900) return null;

  return new Date(year, month, day);
}

const LEVEL_PRIORITY: Record<AlertLevel, number> = {
  vermelho: 3,
  amarelo: 2,
  verde: 1,
};

export function getHighestAlert(a: AlertLevel, b: AlertLevel): AlertLevel {
  return LEVEL_PRIORITY[a] >= LEVEL_PRIORITY[b] ? a : b;
}

/** Missing field: rule doesn't trigger. */
export function evaluateRule(
  rule: AlertRule,
  patientData: Record<string, unknown>
): boolean {
  const fieldValue = patientData[rule.column];

  if (rule.operator === "is_empty") {
    return (
      fieldValue === null ||
      fieldValue === undefined ||
      fieldValue === ""
    );
  }

  if (fieldValue === null || fieldValue === undefined) return false;

  if (rule.operator === "older_than_days") {
    // Date fields from patient data are strings (dd/MM/yyyy format); other types cannot be parsed.
    if (typeof fieldValue !== "string") return false;
    const date = parseBrazilianDate(fieldValue);
    if (!date) return false;

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return diffDays > Number(rule.value);
  }

  const numericField = Number(fieldValue);
  const numericValue = Number(rule.value);
  const isNumericComparison = !isNaN(numericField) && !isNaN(numericValue);

  switch (rule.operator) {
    case ">":
      return isNumericComparison && numericField > numericValue;
    case "<":
      return isNumericComparison && numericField < numericValue;
    case ">=":
      return isNumericComparison && numericField >= numericValue;
    case "<=":
      return isNumericComparison && numericField <= numericValue;
    case "=":
      // Only primitives have a meaningful string form; objects would give [object Object].
      if (typeof fieldValue !== "string" && typeof fieldValue !== "number" && typeof fieldValue !== "boolean") return false;
      return String(fieldValue) === String(rule.value);
    case "!=":
      if (typeof fieldValue !== "string" && typeof fieldValue !== "number" && typeof fieldValue !== "boolean") return false;
      return String(fieldValue) !== String(rule.value);
    default:
      return false;
  }
}

export function evaluatePatient(
  rules: AlertRule[],
  patient: Record<string, unknown>,
  layerId: string
): AlertResult {
  const cns = typeof patient.cns === "string" ? patient.cns : "";
  const triggeredRules: AlertRule[] = [];
  let highestLevel: AlertLevel = "verde";

  for (const rule of rules) {
    if (rule.layer !== layerId) continue;

    if (evaluateRule(rule, patient)) {
      triggeredRules.push(rule);
      highestLevel = getHighestAlert(highestLevel, rule.level);
    }
  }

  return {
    patientCns: cns,
    level: highestLevel,
    triggeredRules,
  };
}
