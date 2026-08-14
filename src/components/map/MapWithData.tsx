"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { X } from "lucide-react";
import DynamicMap from "@/components/map/DynamicMap";
import { LayerSidebar } from "@/components/sidebar/LayerSidebar";
import { PatientDetailPanel } from "@/components/panels/PatientDetailPanel";
import { StatsDashboard } from "@/components/map/StatsDashboard";
import { Legend } from "@/components/map/Legend";
import { RailToggles } from "@/components/map/RailToggles";
import { usePatientData } from "@/hooks/usePatientData";
import { useUiStore } from "@/stores/uiStore";
import { usePlannerStore } from "@/stores/plannerStore";
import { PlannerDrawer } from "@/components/planner/PlannerDrawer";

/**
 * Client component that wires patient data into the map, sidebar, and panels.
 *
 * Sidebar rebuilt for UP-5 (proto/map sketch): Search → Alertas → Camadas →
 * Priority list → Filtros → Planejar visita.
 */
export function MapWithData() {
  const { data, isLoading } = usePatientData();
  const { showSidebar, showPanel, showLegend, toggleLegend } = useUiStore();
  const drawerOpen = usePlannerStore((s) => s.drawerOpen);
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
            className={`fixed inset-x-0 bottom-0 z-[1050] max-h-[70vh] overflow-y-auto rounded-t-2xl border-t bg-white shadow-2xl transition-transform duration-300 md:static md:inset-auto md:z-auto md:flex md:h-full md:w-72 md:flex-col md:overflow-hidden md:rounded-none md:border-r md:border-t-0 md:shadow-none md:transition-none ${
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

            {/* Refreshed sidebar — handles Search, Alertas, Camadas,
                PriorityList, Filtros, and Planejar visita CTA internally */}
            <LayerSidebar data={data} />
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
        {/* PlannerDrawer — right-side sheet; mounted here so the Sheet      */}
        {/* portal lands outside the map container correctly.               */}
        {/* ---------------------------------------------------------------- */}
        <PlannerDrawer />

        {/* Right panel — hidden when the planner drawer is open            */}
        <AnimatePresence initial={false}>
          {showPanel && !drawerOpen && (
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
