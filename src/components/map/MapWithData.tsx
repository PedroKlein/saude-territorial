"use client";

import { useState } from "react";
import DynamicMap from "@/components/map/DynamicMap";
import { LayerSidebar } from "@/components/sidebar/LayerSidebar";
import { FilterPanel } from "@/components/sidebar/FilterPanel";
import { PatientDetailPanel } from "@/components/panels/PatientDetailPanel";
import { StatsDashboard } from "@/components/map/StatsDashboard";
import { PriorityList } from "@/components/map/PriorityList";
import { Legend } from "@/components/map/Legend";
import { MicroareaMetrics } from "@/components/sidebar/MicroareaMetrics";
import { DayPlanner } from "@/components/routes/DayPlanner";
import { ConflictPanel } from "@/components/panels/ConflictPanel";
import { deduplicatePatients } from "@/lib/sheets/dedup";
import { usePatientData } from "@/hooks/usePatientData";
import { useMapStore } from "@/stores/mapStore";
import { useRoutePlannerStore } from "@/stores/routePlannerStore";
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
  const isPlanning = useRoutePlannerStore((s) => s.isPlanning);
  const togglePlanningMode = useRoutePlannerStore((s) => s.togglePlanningMode);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showConflicts, setShowConflicts] = useState(false);

  // Detect CNS conflicts across layers
  const conflicts = useMemo(() => {
    if (!data) return [];
    const layerData: Record<string, Array<{ cns: string; nomeCompleto: string | null; lat: number; lng: number; [key: string]: unknown }>> = {};
    for (const [layerId, patients] of Object.entries(data)) {
      if (patients) layerData[layerId] = patients;
    }
    return deduplicatePatients(layerData).conflicts;
  }, [data]);

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
      {/* Mobile menu button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="fixed bottom-4 left-4 z-[1100] flex h-12 w-12 items-center justify-center rounded-full bg-primary text-white shadow-lg md:hidden"
        aria-label="Abrir menu"
      >
        ☰
      </button>

      {/* Left sidebar: layers + filters */}
      {/* Desktop: always visible. Mobile: slide-up drawer */}
      <div
        className={`fixed inset-x-0 bottom-0 z-[1050] max-h-[70vh] overflow-y-auto rounded-t-2xl border-t bg-white shadow-2xl transition-transform duration-300 md:static md:inset-auto md:z-auto md:max-h-none md:w-64 md:rounded-none md:border-r md:border-t-0 md:shadow-none md:translate-y-0 ${
          sidebarOpen ? "translate-y-0" : "translate-y-full md:translate-y-0"
        }`}
      >
        {/* Mobile drawer handle */}
        <div className="flex justify-center py-2 md:hidden">
          <button
            onClick={() => setSidebarOpen(false)}
            className="h-1.5 w-10 rounded-full bg-gray-300"
            aria-label="Fechar menu"
          />
        </div>
        <LayerSidebar data={data} />
        {showTerritories && enrichedPatients.length > 0 && (
          <div className="px-4">
            <MicroareaMetrics patients={enrichedPatients} />
          </div>
        )}
        <div className="px-4 pb-4">
          <FilterPanel />
        </div>

        {/* Day Planner section */}
        <div className="border-t px-4 py-3">
          <button
            onClick={togglePlanningMode}
            className={`w-full rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              isPlanning
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {isPlanning ? "✔ Selecionando visitas..." : "🗓️ Planejar visitas"}
          </button>
          {isPlanning && <DayPlanner />}
        </div>

        {/* Conflict badge + panel */}
        {conflicts.length > 0 && (
          <div className="border-t px-4 py-3">
            <button
              onClick={() => setShowConflicts(!showConflicts)}
              className="flex w-full items-center justify-between rounded-md bg-yellow-50 px-3 py-2 text-sm font-medium text-yellow-800 hover:bg-yellow-100"
            >
              <span>⚠ {conflicts.length} conflito{conflicts.length > 1 ? "s" : ""}</span>
              <span className="text-xs">{showConflicts ? "▲" : "▼"}</span>
            </button>
            {showConflicts && <ConflictPanel conflicts={conflicts} />}
          </div>
        )}
      </div>

      {/* Backdrop for mobile drawer */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-[1040] bg-black/30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Map area */}
      <div className="relative h-full flex-1">
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
