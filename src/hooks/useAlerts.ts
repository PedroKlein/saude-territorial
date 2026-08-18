import { useMemo } from "react";
import { evaluatePatient } from "@/lib/alerts/engine";
import type { AlertRule, AlertResult } from "@/types/alerts";

export function useAlerts(
  patients: Record<string, unknown>[],
  rules: AlertRule[],
  layerId: string
): Map<string, AlertResult> {
  return useMemo(() => {
    const results = new Map<string, AlertResult>();

    for (const patient of patients) {
      const cns = typeof patient.cns === "string" ? patient.cns : "";
      if (!cns) continue;

      const result = evaluatePatient(rules, patient, layerId);
      results.set(cns, result);
    }

    return results;
  }, [patients, rules, layerId]);
}
