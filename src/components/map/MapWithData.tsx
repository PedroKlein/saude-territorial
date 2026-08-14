"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { X } from "lucide-react";
import DynamicMap from "@/components/map/DynamicMap";
import { LayerSidebar } from "@/components/sidebar/LayerSidebar";
import { FilterPanel } from "@/components/sidebar/FilterPanel";
import { PatientDetailPanel } from "@/components/panels/PatientDetailPanel";
import { StatsDashboard } from "@/components/map/StatsDashboard";
import { PriorityList } from "@/components/map/PriorityList";
import { Legend } from "@/components/map/Legend";
import { RailToggles } from "@/components/map/RailToggles";
import { MicroareaMetrics } from "@/components/sidebar/MicroareaMetrics";
import { UnresolvedList } from "@/components/sidebar/UnresolvedList";
import { SyncBadge } from "@/components/sidebar/SyncBadge";
import { RouteHistory } from "@/components/sidebar/RouteHistory";
import { DayPlanner } from "@/components/routes/DayPlanner";
import { usePatientData } from "@/hooks/usePatientData";
import { useMapStore } from "@/stores/mapStore";
import { useRoutePlannerStore } from "@/stores/routePlannerStore";
import { useUiStore } from "@/stores/uiStore";
import { useMemo } from "react";
import { evaluatePatient } from "@/lib/alerts/engine";
import { ALERT_RULES } from "@/config/alert-rules.config";
import type { LayerId } from "@/config/layers.config";
import type { AlertLevel } from "@/types/alerts";

/**
 * Client component that wires patient data into the map, sidebar, and panels.
 *
 * NOTE: Patient data currently comes from a temporary mock endpoint
 * (/api/patients). Will be wired to real Supabase reads (via Drizzle) during
 * pivot execution. Cross-tab CNS conflict detection was removed as part of
 * the Sheets pivot — with Supabase as source of truth, CNS is a UNIQUE
 * constraint at the DB level and conflicts are handled at write time via the
 * "add condition to existing patient" flow.
 */
export function MapWithData() {
  const { data, isLoading } = usePatientData();
  const showTerritories = useMapStore((s) => s.showTerritories);
  const isPlanning = useRoutePlannerStore((s) => s.isPlanning);
  const togglePlanningMode = useRoutePlannerStore((s) => s.togglePlanningMode);
  const { showSidebar, showPanel, showLegend, toggleLegend } = useUiStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Respect OS-level reduced-motion preference.
  const prefersReduced = useReducedMotion();
  const slideVariants = prefersReduced
    ? { hidden: { opacity: 0 }, visible: { opacity: 1 } }
    : {
        hidden: (dir: "left" | "right") => ({
          opacity: 0,
          x: dir === "left" ? -40 : 40,
        }),
        visible: { opacity: 1, x: 0 },
      };

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
          microarea: (p as Record<string, unknown>).microarea as
            | string
            | undefined,
          alertLevel: result.level as AlertLevel,
          dataUltimaAtualizacao: (p as Record<string, unknown>)
            .dataUltimaAtualizacao as string | null | undefined,
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

      {/* ------------------------------------------------------------------ */}
      {/* Left sidebar — collapses via uiStore.showSidebar                    */}
      {/* ------------------------------------------------------------------ */}
      <AnimatePresence initial={false}>
        {showSidebar && (
          <motion.div
            key="sidebar"
            custom="left"
            variants={slideVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className={`fixed inset-x-0 bottom-0 z-[1050] max-h-[70vh] overflow-y-auto rounded-t-2xl border-t bg-white shadow-2xl transition-transform duration-300 md:static md:inset-auto md:z-auto md:max-h-none md:w-64 md:rounded-none md:border-r md:border-t-0 md:shadow-none md:transition-none ${
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
            <UnresolvedList data={data} />
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
            <SyncBadge />
            <RouteHistory />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-[1040] bg-black/30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Map area                                                            */}
      {/* ------------------------------------------------------------------ */}
      <div className="relative h-full flex-1">
        {isLoading && (
          <div className="absolute top-2 left-1/2 z-[1000] -translate-x-1/2 rounded bg-white px-3 py-1 text-sm shadow">
            Carregando dados...
          </div>
        )}
        <DynamicMap />
        <PriorityList data={data} />

        {/* Legend — inline X button when visible, floating ? handled by RailToggles */}
        <AnimatePresence initial={false}>
          {showLegend && (
            <motion.div
              key="legend"
              variants={
                prefersReduced
                  ? { hidden: { opacity: 0 }, visible: { opacity: 1 } }
                  : {
                      hidden: { opacity: 0, y: 8 },
                      visible: { opacity: 1, y: 0 },
                    }
              }
              initial="hidden"
              animate="visible"
              exit="hidden"
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="absolute bottom-14 left-4 z-[1000]"
            >
              <div className="relative rounded-lg bg-white/90 px-3 py-2 shadow-md backdrop-blur-sm">
                <Legend />
                {/* Inline X to dismiss legend */}
                <button
                  onClick={toggleLegend}
                  className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-muted text-muted-foreground shadow-xs hover:bg-border"
                  aria-label="Ocultar legenda"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <StatsDashboard data={data} />

        {/* ---------------------------------------------------------------- */}
        {/* Right panel — collapses via uiStore.showPanel                    */}
        {/* ---------------------------------------------------------------- */}
        <AnimatePresence initial={false}>
          {showPanel && (
            <motion.div
              key="panel"
              custom="right"
              variants={slideVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="contents"
            >
              <PatientDetailPanel />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Pip toggles — appear when a rail is hidden */}
        <RailToggles />
      </div>
    </div>
  );
}
