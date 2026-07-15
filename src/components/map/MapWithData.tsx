"use client";

import DynamicMap from "@/components/map/DynamicMap";
import { LayerSidebar } from "@/components/sidebar/LayerSidebar";
import { FilterPanel } from "@/components/sidebar/FilterPanel";
import { PatientDetailPanel } from "@/components/panels/PatientDetailPanel";
import { StatsDashboard } from "@/components/map/StatsDashboard";
import { PriorityList } from "@/components/map/PriorityList";
import { Legend } from "@/components/map/Legend";
import { MicroareaMetrics } from "@/components/sidebar/MicroareaMetrics";
import { usePatientData } from "@/hooks/usePatientData";
import { useMapStore } from "@/stores/mapStore";
import { useMemo } from "react";
import { evaluatePatient } from "@/lib/alerts/engine";
import { ALERT_RULES } from "@/config/alert-rules.config";
import type { LayerId } from "@/config/layers.config";
import type { AlertLevel } from "@/types/alerts";

/**
 * Client component that wires patient data into the map, sidebar, and panels.
 * Uses "demo" as spreadsheetId in development for synthetic data.
 */
export function MapWithData() {
  const spreadsheetId = process.env.NODE_ENV === "development" ? "demo" : "";
  const { data, isLoading } = usePatientData(spreadsheetId);
  const showTerritories = useMapStore((s) => s.showTerritories);

  // Enrich patients with alertLevel for MicroareaMetrics
  const enrichedPatients = useMemo(() => {
    if (!data || !showTerritories) return [];
    const all: Array<{
      microarea?: string;
      alertLevel?: string;
      dataUltimaAtualizacao?: string | null;
    }> = [];
    for (const [layerId, patients] of Object.entries(data)) {
      if (!patients) continue;
      for (const p of patients) {
        const result = evaluatePatient(ALERT_RULES, p, layerId as LayerId);
        all.push({
          microarea: (p as Record<string, unknown>).microarea as string | undefined,
          alertLevel: result.level as AlertLevel,
          dataUltimaAtualizacao: (p as Record<string, unknown>).dataUltimaAtualizacao as string | null | undefined,
        });
      }
    }
    return all;
  }, [data, showTerritories]);

  return (
    <div className="flex h-full w-full">
      {/* Left sidebar: layers + filters */}
      <div className="flex w-64 flex-col overflow-y-auto border-r bg-white">
        <LayerSidebar data={data} />
        {showTerritories && enrichedPatients.length > 0 && (
          <div className="px-4">
            <MicroareaMetrics patients={enrichedPatients} />
          </div>
        )}
        <div className="px-4 pb-4">
          <FilterPanel />
        </div>
      </div>

      {/* Map area */}
      <div className="relative flex-1">
        {isLoading && (
          <div className="absolute top-2 left-1/2 z-[1000] -translate-x-1/2 rounded bg-white px-3 py-1 text-sm shadow">
            Carregando dados...
          </div>
        )}
        <DynamicMap />
        {/* Priority list (top-right over map) */}
        <PriorityList data={data} />
        {/* Legend (bottom-left) */}
        <Legend />
        {/* Stats dashboard (bottom center) */}
        <StatsDashboard data={data} />
        {/* Detail panel (right side, shows on marker click) */}
        <PatientDetailPanel layerData={data} />
      </div>
    </div>
  );
}
