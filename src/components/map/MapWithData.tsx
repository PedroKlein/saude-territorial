"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { HelpCircle } from "lucide-react";
import DynamicMap from "@/components/map/DynamicMap";
import { EmptyMapOverlay } from "@/components/map/EmptyMapOverlay";
import { LayerSidebar } from "@/components/sidebar/LayerSidebar";
import { PatientDetailPanel } from "@/components/panels/PatientDetailPanel";
import { StatsDashboard } from "@/components/map/StatsDashboard";
import { Legend } from "@/components/map/Legend";
import { RailToggles } from "@/components/map/RailToggles";
import { usePatientData } from "@/hooks/usePatientData";
import { useUiStore } from "@/stores/uiStore";
import { usePlannerStore, PLAN_LIMIT } from "@/stores/plannerStore";
import { PlannerDrawer } from "@/components/planner/PlannerDrawer";

export function MapWithData() {
  const { data, isLoading } = usePatientData();
  const { showSidebar, showPanel, showLegend, toggleLegend } = useUiStore();
  const drawerOpen = usePlannerStore((s) => s.drawerOpen);
  const mapSelectMode = usePlannerStore((s) => s.mapSelectMode);
  const plannerStopsCount = usePlannerStore((s) => s.stops.length);
   
  const setMapSelectMode = usePlannerStore((s) => s.setMapSelectMode);
   
  const setDrawerOpen = usePlannerStore((s) => s.setDrawerOpen);
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
      <button
        onClick={() => { setSidebarOpen(!sidebarOpen); }}
        className="fixed bottom-4 left-4 z-[1100] flex h-12 w-12 items-center justify-center rounded-full bg-primary text-white shadow-lg md:hidden"
        aria-label="Abrir menu"
      >
        ☰
      </button>

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
            <div className="flex justify-center py-2 md:hidden">
              <button
                onClick={() => { setSidebarOpen(false); }}
                className="h-1.5 w-10 rounded-full bg-gray-300"
                aria-label="Fechar menu"
              />
            </div>

            <LayerSidebar data={data} />
          </motion.div>
        )}
      </AnimatePresence>

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-[1040] bg-black/30 md:hidden"
          onClick={() => { setSidebarOpen(false); }}
        />
      )}

      <div className="relative h-full flex-1">
        {/* Sidebar toggle when hidden is handled by RailToggles (left-edge pip).
            Sidebar close-when-shown is handled inside LayerSidebar itself. */}

        {isLoading && (
          <div className="absolute top-2 left-1/2 z-[1000] -translate-x-1/2 rounded bg-white px-3 py-1 text-sm shadow">
            Carregando dados...
          </div>
        )}
        {mapSelectMode && (
          <div className="absolute top-4 left-1/2 z-[500] -translate-x-1/2 flex items-center gap-3 rounded-lg bg-brand/95 px-4 py-2 text-white shadow-lg">
            <span className="text-sm font-medium">
              {plannerStopsCount}/{PLAN_LIMIT} selecionados
            </span>
            <button
              onClick={() => { setMapSelectMode(false); setDrawerOpen(true); }}
              className="rounded px-2 py-0.5 text-sm font-semibold underline hover:no-underline"
            >
              Concluir
            </button>
            <button
              onClick={() => { setMapSelectMode(false); }}
              className="text-sm text-white/80 hover:text-white"
            >
              Cancelar
            </button>
          </div>
        )}
        <DynamicMap />
        <EmptyMapOverlay data={data} />

        <AnimatePresence initial={false} mode="wait">
          {showLegend ? (
            <motion.div
              key="legend-full"
              variants={
                prefersReduced
                  ? { hidden: { opacity: 0 }, visible: { opacity: 1 } }
                  : { hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0 } }
              }
              initial="hidden"
              animate="visible"
              exit="hidden"
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="absolute bottom-14 left-4 z-[1000]"
            >
              <Legend onClose={toggleLegend} />
            </motion.div>
          ) : (
            <motion.div
              key="legend-chip"
              variants={
                prefersReduced
                  ? { hidden: { opacity: 0 }, visible: { opacity: 1 } }
                  : { hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0 } }
              }
              initial="hidden"
              animate="visible"
              exit="hidden"
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="absolute bottom-14 left-4 z-[1000]"
            >
              <button
                onClick={toggleLegend}
                title="Mostrar legenda"
                aria-label="Mostrar legenda"
                className="flex size-8 items-center justify-center rounded-full border bg-white/90 shadow-sm hover:bg-white"
              >
                <HelpCircle className="size-4 text-muted-foreground" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <StatsDashboard data={data} />

        <PlannerDrawer />

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

        <RailToggles />
      </div>
    </div>
  );
}
