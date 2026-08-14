"use client";

/**
 * PlannerDrawer — right-side Sheet replacing the patient detail panel
 * while planning mode is active.
 *
 * Sections (top to bottom):
 *   1. Header: title, date, ACS name input, close button
 *   2. Auto-suggest CTA
 *   3. Manual add: PatientPickerCombobox
 *   4. Filter chips (collapsible)
 *   5. Stop list (drag-to-reorder)
 *   6. Route stats + profile toggle
 *   7. Footer: save + load buttons
 */

import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { Sparkles, Route, Car, Footprints, Save, FolderOpen, ChevronDown, Filter, X } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { usePlannerStore } from "@/stores/plannerStore";
import type { Stop } from "@/stores/plannerStore";
import { usePatientData } from "@/hooks/usePatientData";
import { evaluatePatient } from "@/lib/alerts/engine";
import { ALERT_RULES } from "@/config/alert-rules.config";
import { suggestPlan } from "@/lib/planner/suggest";
import { FilterChips } from "./FilterChips";
import { PatientPickerCombobox } from "./PatientPickerCombobox";
import { StopList } from "./StopList";
import { PlanStats } from "./PlanStats";
import { PlanSaveDialog } from "./PlanSaveDialog";
import { PlanPickerDialog } from "./PlanPickerDialog";
import { useMapStore } from "@/stores/mapStore";
import type { PatientRecord } from "@/hooks/usePatientData";
import type { LayerId } from "@/config/layers.config";
import type { AlertLevel } from "@/types/alerts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function todayDisplay(): string {
  return new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

/** Build a flat Map of patientId → { record, layerId } from all layers. */
function buildPatientMap(
  data: Partial<Record<LayerId, PatientRecord[]>> | undefined,
): Map<string, { record: PatientRecord; layerId: LayerId }> {
  const map = new Map<string, { record: PatientRecord; layerId: LayerId }>();
  if (!data) return map;
  for (const [layerId, patients] of Object.entries(data)) {
    if (!patients) continue;
    for (const p of patients) {
      if (!map.has(p.id)) {
        map.set(p.id, { record: p, layerId: layerId as LayerId });
      }
    }
  }
  return map;
}

/** First layer that contains a given patient. */
function layerForPatient(
  p: PatientRecord,
  data: Partial<Record<LayerId, PatientRecord[]>> | undefined,
): LayerId {
  if (!data) return "gestantes";
  for (const [layerId, patients] of Object.entries(data)) {
    if (patients?.some((q) => q.id === p.id)) return layerId as LayerId;
  }
  return "gestantes";
}

// ---------------------------------------------------------------------------
// Route fetching (debounced 400 ms)
// ---------------------------------------------------------------------------

const ROUTE_DEBOUNCE_MS = 400;

function useOsrmRoute(
  stops: Stop[],
  patientMap: Map<string, { record: PatientRecord; layerId: LayerId }>,
  profile: "foot" | "car",
) {
  const setRoute = usePlannerStore((s) => s.setRoute);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchRoute = useCallback(async () => {
    if (stops.length < 2) {
      setRoute(null);
      return;
    }

    const coords: { lat: number; lng: number }[] = [];
    for (const stop of [...stops].sort((a, b) => a.order - b.order)) {
      const entry = patientMap.get(stop.patientId);
      if (entry?.record.lat && entry.record.lng) {
        coords.push({ lat: entry.record.lat, lng: entry.record.lng });
      }
    }
    if (coords.length < 2) {
      setRoute(null);
      return;
    }
    try {
      const res = await fetch("/api/routes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ waypoints: coords, profile }),
      });
      if (!res.ok) return;
      setRoute(await res.json());
    } catch {
      // Silent — route is non-blocking.
    }
  }, [stops, patientMap, profile, setRoute]);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(fetchRoute, ROUTE_DEBOUNCE_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [fetchRoute]);
}

// ---------------------------------------------------------------------------
// PlannerDrawer
// ---------------------------------------------------------------------------

export function PlannerDrawer() {
  const {
    drawerOpen,
    setDrawerOpen,
    stops,
    setStops,
    profile,
    setProfile,
    route,
    filters,
    clear,
  } = usePlannerStore();

  const setActiveRoute = useMapStore((s) => s.setActiveRoute);
  const { data } = usePatientData();

  const [acsName, setAcsName] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [pickDialogOpen, setPickDialogOpen] = useState(false);

  const patientMap = useMemo(() => buildPatientMap(data), [data]);

  const allPatients = useMemo((): PatientRecord[] => {
    const seen = new Set<string>();
    const list: PatientRecord[] = [];
    if (!data) return list;
    for (const patients of Object.values(data)) {
      if (!patients) continue;
      for (const p of patients) {
        if (!seen.has(p.id)) {
          seen.add(p.id);
          list.push(p);
        }
      }
    }
    return list;
  }, [data]);

  const filteredCandidates = useMemo((): PatientRecord[] => {
    return allPatients.filter((p) => {
      if (
        filters.microarea.length > 0 &&
        !filters.microarea.includes(p.microarea as string)
      ) {
        return false;
      }
      if (filters.conditions.length > 0) {
        const layerId = layerForPatient(p, data);
        if (!filters.conditions.includes(layerId)) return false;
      }
      if (filters.alertLevels.length > 0) {
        const layerId = layerForPatient(p, data);
        const result = evaluatePatient(ALERT_RULES, p, layerId);
        if (!filters.alertLevels.includes(result.level as AlertLevel)) return false;
      }
      return true;
    });
  }, [allPatients, filters, data]);

  // Sync planner route → map store so ActiveRouteLayer renders it.
  useEffect(() => {
    if (drawerOpen && route) {
      setActiveRoute({ result: route, profile });
    } else if (!drawerOpen) {
      setActiveRoute(null);
    }
  }, [drawerOpen, route, profile, setActiveRoute]);

  useOsrmRoute(stops, patientMap, profile);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  function handleSuggest() {
    if (!data) return;
    const pool = filteredCandidates.length > 0 ? filteredCandidates : allPatients;
    const suggested = suggestPlan({
      patients: pool,
      layerFor: (p) => layerForPatient(p, data),
      today: new Date(),
    });
    setStops(suggested);
  }

  function handleAddAll(patients: PatientRecord[]) {
    const next: Stop[] = [...stops];
    for (const p of patients) {
      if (!next.some((s) => s.patientId === p.id)) {
        next.push({ patientId: p.id, order: next.length + 1 });
      }
    }
    setStops(next.map((s, i) => ({ ...s, order: i + 1 })));
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <>
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent
          side="right"
          showCloseButton={false}
          className="flex w-[420px] max-w-full flex-col p-0"
        >
          {/* Header */}
          <SheetHeader className="border-b border-neutral-200 p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-brand text-white">
                  <Route className="h-4 w-4" />
                </span>
                <div>
                  <SheetTitle className="text-sm font-semibold text-neutral-900">
                    Planejamento do dia
                  </SheetTitle>
                  <div className="text-[11px] capitalize text-neutral-500">
                    {todayDisplay()}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
                aria-label="Fechar planejador"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <input
              type="text"
              placeholder="Nome do ACS (opcional)"
              value={acsName}
              onChange={(e) => setAcsName(e.target.value)}
              className="mt-2 w-full rounded-md border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-sm text-neutral-800 placeholder-neutral-400 focus:border-brand/50 focus:bg-white focus:outline-none"
            />

            <div className="mt-3">
              <PlanStats route={route} stopCount={stops.length} />
            </div>
          </SheetHeader>

          {/* Scrollable body */}
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
            {/* Auto-suggest */}
            <div className="border-b border-neutral-200 p-3">
              <button
                onClick={handleSuggest}
                className="flex w-full items-center justify-center gap-2 rounded-md border border-neutral-200 bg-gradient-to-br from-white to-neutral-50 px-3 py-2 text-sm font-medium text-neutral-800 shadow-sm transition hover:border-brand/40 hover:from-[oklch(97%_0.02_195)]"
              >
                <Sparkles className="h-4 w-4 text-brand" />
                Sugerir plano para hoje
                <span className="ml-auto text-[10px] font-normal text-neutral-400">
                  alertas + última visita
                </span>
              </button>
            </div>

            {/* Manual add */}
            <div className="border-b border-neutral-200 p-3">
              <PatientPickerCombobox patients={allPatients} />
            </div>

            {/* Filter chips (collapsible) */}
            <div className="border-b border-neutral-200">
              <button
                onClick={() => setFiltersOpen((v) => !v)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-neutral-50"
              >
                <Filter className="h-3.5 w-3.5 text-neutral-400" />
                <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-600">
                  Filtrar candidatos
                </span>
                <ChevronDown
                  className={`ml-auto h-4 w-4 text-neutral-400 transition-transform ${
                    filtersOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {filtersOpen && (
                <div className="border-t border-neutral-100 p-3">
                  <FilterChips
                    candidates={filteredCandidates}
                    onAddAll={handleAddAll}
                  />
                </div>
              )}
            </div>

            {/* Stop list */}
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="flex items-center justify-between px-3 pb-1 pt-3">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                  Ordem da rota
                </div>
                <span className="text-[11px] text-neutral-400">
                  {stops.length} parada{stops.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="flex-1 overflow-y-auto px-1 pb-2">
                <StopList patientMap={patientMap} />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-neutral-200 bg-neutral-50 p-3">
            {/* Profile toggle */}
            <div className="mb-2 flex items-center gap-1 rounded-md border border-neutral-200 bg-white p-0.5">
              {(["foot", "car"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setProfile(p)}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded px-2 py-1 text-xs font-medium transition ${
                    profile === p
                      ? "bg-neutral-900 text-white"
                      : "text-neutral-600 hover:text-neutral-900"
                  }`}
                >
                  {p === "foot" ? (
                    <Footprints className="h-3.5 w-3.5" />
                  ) : (
                    <Car className="h-3.5 w-3.5" />
                  )}
                  {p === "foot" ? "A pé" : "Carro"}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setPickDialogOpen(true)}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
              >
                <FolderOpen className="h-4 w-4" />
                Carregar
              </button>
              <button
                onClick={() => setSaveDialogOpen(true)}
                disabled={stops.length === 0}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                Salvar
              </button>
              <button
                onClick={clear}
                disabled={stops.length === 0}
                className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Limpar plano"
                title="Limpar plano"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <PlanSaveDialog
        open={saveDialogOpen}
        onClose={() => setSaveDialogOpen(false)}
      />
      <PlanPickerDialog
        open={pickDialogOpen}
        onClose={() => setPickDialogOpen(false)}
      />
    </>
  );
}
