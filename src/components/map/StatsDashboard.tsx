"use client";

import { useMemo } from "react";
import { evaluatePatient } from "@/lib/alerts/engine";
import { useFilterStore } from "@/stores/filterStore";
import { useMapStore } from "@/stores/mapStore";
import { ALERT_RULES } from "@/config/alert-rules.config";
import type { PatientRecord, LayeredPatientData } from "@/hooks/usePatientData";
import type { LayerId } from "@/config/layers.config";
import type { AlertLevel } from "@/types/alerts";

interface StatsDashboardProps {
  data: LayeredPatientData | undefined;
}

/**
 * Bottom stats bar showing patient counts by urgency category.
 * Updates live when filters or active layers change.
 */
export function StatsDashboard({ data }: StatsDashboardProps) {
  const activeLayers = useMapStore((s) => s.activeLayers);
  const microareas = useFilterStore((s) => s.microareas);
  const alertLevels = useFilterStore((s) => s.alertLevels);
  const searchText = useFilterStore((s) => s.searchText);
  const applyFilters = useFilterStore((s) => s.applyFilters);

  const counts = useMemo(() => {
    if (!data) return { total: 0, vermelho: 0, amarelo: 0, verde: 0 };

    let allEnriched: Array<PatientRecord & { alertLevel: AlertLevel }> = [];

    for (const [layerId, patients] of Object.entries(data)) {
      if (!patients || patients.length === 0) continue;
      if (!activeLayers[layerId as LayerId]) continue;

      const enriched = patients.map((p) => {
        const result = evaluatePatient(ALERT_RULES, p, layerId);
        return {
          ...p,
          alertLevel: result.level as AlertLevel,
        };
      });

      allEnriched = allEnriched.concat(enriched);
    }

    const filtered = applyFilters(allEnriched);

    return {
      total: filtered.length,
      vermelho: filtered.filter((p) => p.alertLevel === "vermelho").length,
      amarelo: filtered.filter((p) => p.alertLevel === "amarelo").length,
      verde: filtered.filter((p) => p.alertLevel === "verde").length,
    };
  }, [data, activeLayers, applyFilters, microareas, alertLevels, searchText]);

  if (!data) return null;

  return (
    <div className="absolute bottom-4 left-1/2 z-[1000] -translate-x-1/2 rounded-lg bg-white/90 px-4 py-2 shadow-lg backdrop-blur-sm">
      <div className="flex items-center gap-4 text-sm font-medium">
        <span className="text-gray-700">
          Total: <strong>{counts.total}</strong>
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded-full bg-[#dc2626]" />
          Críticas: <strong>{counts.vermelho}</strong>
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded-full bg-[#d97706]" />
          Atenção: <strong>{counts.amarelo}</strong>
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded-full bg-[#16a34a]" />
          Normal: <strong>{counts.verde}</strong>
        </span>
      </div>
    </div>
  );
}
