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
import { Sparkles, Route, Car, Footprints, Save, FolderOpen, ChevronDown, Filter, X, Trash2, Wand2, MousePointerClick } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { usePlannerStore, PLAN_LIMIT } from "@/stores/plannerStore";
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
import type { RouteResult } from "@/types/routing";
import { US_MOAB_CALDAS } from "@/config/geo.constants";

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
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- Object.entries on Partial<Record> can yield undefined values at runtime; TypeScript's Object.entries types omit this
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
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- patients from Object.entries on Partial<Record> can be undefined at runtime
    if (patients?.some((q) => q.id === p.id)) return layerId as LayerId;
  }
  return "gestantes";
}

const ROUTE_DEBOUNCE_MS = 400;

function useOsrmRoute(
  stops: Stop[],
  patientMap: Map<string, { record: PatientRecord; layerId: LayerId }>,
  profile: "foot" | "car",
) {
  const setRoute = usePlannerStore((s) => s.setRoute);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchRoute = useCallback(async () => {
    if (stops.length < 1) {
      setRoute(null);
      return;
    }

    // Route always departs from and returns to US Moab Caldas, so we prepend
    // and append its coordinates. With ≥ 1 stop that's ≥ 3 waypoints total —
    // OSRM's minimum. The polyline drawn on the map therefore includes the
    // US→first-stop and last-stop→US legs, matching how a real ACS day plays
    // out.
    const stopCoords: { lat: number; lng: number }[] = [];
    for (const stop of [...stops].sort((a, b) => a.order - b.order)) {
      const entry = patientMap.get(stop.patientId);
      if (entry?.record.lat && entry.record.lng) {
        stopCoords.push({ lat: entry.record.lat, lng: entry.record.lng });
      }
    }
    if (stopCoords.length < 1) {
      setRoute(null);
      return;
    }
    const [usLat, usLng] = US_MOAB_CALDAS;
    const coords = [
      { lat: usLat, lng: usLng },
      ...stopCoords,
      { lat: usLat, lng: usLng },
    ];
    try {
      const res = await fetch("/api/routes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ waypoints: coords, profile }),
      });
      if (!res.ok) return;
      setRoute((await res.json()) as RouteResult);
    } catch {
      // Silent — route is non-blocking.
    }
  }, [stops, patientMap, profile, setRoute]);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => { void fetchRoute(); }, ROUTE_DEBOUNCE_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [fetchRoute]);
}

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
    setMapSelectMode,
    limitBannerVisible,
    setLimitBannerVisible,
  } = usePlannerStore();

  const setActiveRoute = useMapStore((s) => s.setActiveRoute);
  const setViewMode = useMapStore((s) => s.setViewMode);
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
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- Object.values on Partial<Record> can yield undefined values at runtime
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
        if (!filters.alertLevels.includes(result.level)) return false;
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


  /**
   * Reorder stops via OSRM /trip anchored at US Moab Caldas.
   *
   * We prepend and append the US coordinate so the trip is
   * [US, s1, ..., sN, US]. On the server side we set
   * `source=first destination=last roundtrip=false`, so OSRM
   *  - starts at index 0 (US),
   *  - ends at index N+1 (US),
   *  - reshuffles only indices 1..N (the actual patient stops)
   *  to minimise total travel.
   *
   * The returned `order` is a permutation of [0..N+1]. Position 0 is
   * always 0 (US start) and the last position is always N+1 (US end).
   * We strip both and map the middle positions back to `stops`.
   *
   * With < 2 stops there is nothing to optimise (a single stop plus
   * the two US anchors has a fixed order), so we bail.
   */
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizeError, setOptimizeError] = useState<string | null>(null);

  const handleOptimize = useCallback(async () => {
    if (stops.length < 2) return;
    setOptimizeError(null);
    setIsOptimizing(true);

    // Build the coord list in the current visit order and anchor it at US.
    const ordered = [...stops].sort((a, b) => a.order - b.order);
    const stopCoords: { lat: number; lng: number }[] = [];
    for (const s of ordered) {
      const entry = patientMap.get(s.patientId);
      if (entry?.record.lat && entry.record.lng) {
        stopCoords.push({ lat: entry.record.lat, lng: entry.record.lng });
      } else {
        setIsOptimizing(false);
        setOptimizeError("Um paciente do plano está sem coordenadas.");
        return;
      }
    }
    const [usLat, usLng] = US_MOAB_CALDAS;
    const coords = [
      { lat: usLat, lng: usLng },
      ...stopCoords,
      { lat: usLat, lng: usLng },
    ];

    try {
      const res = await fetch("/api/routes/optimize", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ waypoints: coords, profile }),
      });
      if (!res.ok) {
        setOptimizeError("Falha ao otimizar rota.");
        return;
      }
      const body = (await res.json()) as { order: number[] };

      // Middle positions only — drop the US anchors at ends. Each middle
      // input index maps back to `ordered` by subtracting 1 (US = index 0).
      const middle = body.order.slice(1, -1);
      const reordered: Stop[] = middle.map((inputIdx, j) => ({
        patientId: ordered[inputIdx - 1].patientId,
        order: j + 1,
      }));
      setStops(reordered);
    } catch {
      setOptimizeError("Falha ao conectar ao servidor de rotas.");
    } finally {
      setIsOptimizing(false);
    }
  }, [stops, patientMap, profile, setStops]);

  return (
    <>
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen} modal={false}>
        <SheetContent
          side="right"
          showCloseButton={false}
          modal={false}
          className="flex w-[420px] max-w-full flex-col p-0 sm:max-w-[420px]"
          /* Non-modal drawer: no backdrop, no focus trap, map stays live.
           * Radix Dialog will still try to close on outside-pointer-down
           * (leftovers from Dialog root) — the map counts as "outside", so
           * we block those specific dismissals below and let the user close
           * via the explicit X, Esc, or the "Fechar" affordance. */
          onInteractOutside={(e) => { e.preventDefault(); }}
          onPointerDownOutside={(e) => { e.preventDefault(); }}
        >
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
                onClick={() => { setDrawerOpen(false); }}
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
              onChange={(e) => { setAcsName(e.target.value); }}
              className="mt-2 w-full rounded-md border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-sm text-neutral-800 placeholder-neutral-400 focus:border-brand/50 focus:bg-white focus:outline-none"
            />

            <div className="mt-3">
              <PlanStats route={route} stopCount={stops.length} />
            </div>
          </SheetHeader>

          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
            {limitBannerVisible && (
              <div
                role="alert"
                className="mx-3 mt-2 flex items-start gap-2 rounded border border-alert-amber/40 bg-alert-amber/10 px-3 py-2 text-[12px] text-amber-900"
              >
                <span className="flex-1">
                  Limite de {PLAN_LIMIT} pacientes por plano atingido. Remova algum para adicionar mais.
                </span>
                <button
                  onClick={() => { setLimitBannerVisible(false); }}
                  className="shrink-0 text-amber-700 hover:text-amber-900"
                  aria-label="Fechar aviso"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
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

            <div className="border-b border-neutral-200 p-3">
              <PatientPickerCombobox patients={allPatients} />
            </div>
            {/* Select from map — prominent trigger. Auto-switches viewMode
             * to "markers" so patient chips are actually clickable (density
             * and microárea views render no per-patient DOM). */}
            <div className="border-b border-neutral-200 p-3 pt-0">
              <button
                onClick={() => {
                  setViewMode("markers");
                  setMapSelectMode(true);
                  setDrawerOpen(false);
                }}
                className="flex w-full items-center justify-center gap-2 rounded-md border border-brand/30 bg-brand/5 px-3 py-2 text-sm font-medium text-brand transition hover:border-brand/50 hover:bg-brand/10"
              >
                <MousePointerClick className="h-4 w-4" />
                Selecionar do mapa
              </button>
            </div>

            <div className="border-b border-neutral-200">
              <button
                onClick={() => { setFiltersOpen((v) => !v); }}
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
                  />
                </div>
              )}
            </div>

            <div className="flex min-h-0 flex-1 flex-col">
              <div className="flex items-center justify-between gap-2 px-3 pb-1 pt-3">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                  Ordem da rota
                </div>
                <div className="flex items-center gap-2">
                  {/*
                   * Otimizar via OSRM /trip. Disabled when < 3 stops (first
                   * and last stay pinned, so 2 is a no-op) or while the
                   * request is in flight.
                   */}
                  <button
                    type="button"
                    onClick={() => void handleOptimize()}
                    disabled={stops.length < 3 || isOptimizing}
                    className="inline-flex items-center gap-1 rounded-md border border-brand/30 bg-white px-2 py-0.5 text-[11px] font-medium text-brand transition hover:bg-brand/5 disabled:cursor-not-allowed disabled:border-neutral-200 disabled:text-neutral-400 disabled:hover:bg-white"
                    title={
                      stops.length < 3
                        ? "Adicione ao menos 3 paradas para otimizar"
                        : "Reordena as paradas intermediárias para minimizar o trajeto"
                    }
                  >
                    <Wand2 className="h-3 w-3" />
                    {isOptimizing ? "Otimizando…" : "Otimizar"}
                  </button>
                  <span className={`text-[11px] font-medium ${stops.length >= PLAN_LIMIT ? "text-alert-amber" : "text-neutral-400"}`}>
                    {stops.length} / {PLAN_LIMIT} parada{stops.length !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>
              {optimizeError && (
                <div
                  role="alert"
                  className="mx-3 mb-1 rounded border border-alert-red/30 bg-alert-red/5 px-2 py-1 text-[11px] text-red-800"
                >
                  {optimizeError}
                </div>
              )}
              <div className="flex-1 overflow-y-auto px-1 pb-2">
                <StopList patientMap={patientMap} />
              </div>
            </div>
          </div>

          <div className="border-t border-neutral-200 bg-neutral-50 p-3">
            <div className="mb-2 flex items-center gap-1 rounded-md border border-neutral-200 bg-white p-0.5">
              {(["foot", "car"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => { setProfile(p); }}
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
                onClick={() => { setPickDialogOpen(true); }}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
              >
                <FolderOpen className="h-4 w-4" />
                Carregar
              </button>
              <button
                onClick={() => { setSaveDialogOpen(true); }}
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
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <PlanSaveDialog
        open={saveDialogOpen}
        onClose={() => { setSaveDialogOpen(false); }}
        acsName={acsName.trim() || null}
      />
      <PlanPickerDialog
        open={pickDialogOpen}
        onClose={() => { setPickDialogOpen(false); }}
      />
    </>
  );
}
