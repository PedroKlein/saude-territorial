"use client";

import { useMemo } from "react";
import { evaluatePatient } from "@/lib/alerts/engine";
import { useFilterStore } from "@/stores/filterStore";
import { useMapStore } from "@/stores/mapStore";
import { ALERT_RULES } from "@/config/alert-rules.config";
import type { PatientRecord, LayeredPatientData } from "@/hooks/usePatientData";
import type { LayerId } from "@/config/layers.config";
import type { AlertLevel } from "@/types/alerts";
import { AlertShape } from "@/components/ui/AlertShape";

interface StatsDashboardProps {
  data: LayeredPatientData | undefined;
}

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
    // `applyFilters` closes over the Zustand filter state via get(); the
    // state slices below are load-bearing (they drive re-renders on change)
    // even though eslint can't see through the closure.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, activeLayers, applyFilters, microareas, alertLevels, searchText]);

  if (!data) return null;

  return (
    <div className="absolute bottom-4 left-1/2 z-[1000] -translate-x-1/2 rounded-lg bg-white/90 px-4 py-2 shadow-lg backdrop-blur-sm">
      <div className="flex items-center gap-4 text-sm font-medium">
        <span className="text-gray-700">
          Total: <strong>{counts.total}</strong>
        </span>
        <span className="flex items-center gap-1">
          <AlertShape level="vermelho" size={12} />
          Críticas: <strong>{counts.vermelho}</strong>
        </span>
        <span className="flex items-center gap-1">
          <AlertShape level="amarelo" size={12} />
          Atenção: <strong>{counts.amarelo}</strong>
        </span>
        <span className="flex items-center gap-1">
          <AlertShape level="verde" size={12} />
          Normal: <strong>{counts.verde}</strong>
        </span>
      </div>
    </div>
  );
}
