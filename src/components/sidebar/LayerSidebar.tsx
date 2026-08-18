"use client";

import { useMemo } from "react";
import { useUiStore } from "@/stores/uiStore";
import {
  Baby,
  Wind,
  HeartPulse,
  Layers,
  AlertTriangle,
  Droplets,
  BedSingle,
  School,
  Building2,
  ChevronDown,
  MapPin,
  Flame,
  Hexagon,
  UserRound,
  PanelLeftClose,
} from "lucide-react";
import { useMapStore } from "@/stores/mapStore";
import type { ViewMode } from "@/stores/mapStore";
import { LAYER_CONFIG, type LayerId } from "@/config/layers.config";
import type { LayeredPatientData } from "@/hooks/usePatientData";
import { evaluatePatient } from "@/lib/alerts/engine";
import { ALERT_RULES } from "@/config/alert-rules.config";
import { SearchInput } from "./SearchInput";
import { LayerToggleRow } from "./LayerToggleRow";
import { PriorityListSection } from "./PriorityListSection";
import { FilterPanel } from "./FilterPanel";
import { PlanejarVisitaButton } from "./PlanejarVisitaButton";
import type { LucideIcon } from "lucide-react";

const PRIMARY_LAYER_IDS: LayerId[] = ["gestantes", "tuberculose", "hipertensao", "sem-condicao"];
const DEFERRED_LAYER_IDS: LayerId[] = ["diabetes", "acamados", "pse", "ilpi"];

const LAYER_ICON: Record<LayerId, LucideIcon> = {
  gestantes: Baby,
  tuberculose: Wind,
  hipertensao: HeartPulse,
  diabetes: Droplets,
  acamados: BedSingle,
  pse: School,
  ilpi: Building2,
  "sem-condicao": UserRound,
};

const LAYER_COLOR_CLASS: Record<LayerId, string> = {
  gestantes: "bg-gestante",
  tuberculose: "bg-tuberculose",
  hipertensao: "bg-hipertensao",
  diabetes: "bg-diabetes",
  acamados: "bg-acamados",
  pse: "bg-pse",
  ilpi: "bg-ilpi",
  "sem-condicao": "bg-muted-foreground",
};

type LayerSidebarProps = {
  data?: LayeredPatientData;
}

/**
 * Left sidebar — rebuilt per the validated proto/map sketch.
 *
 * Sections (top → bottom):
 *   1. Search input row
 *   2. Alertas meta-filter (total alert count + alertsOnly toggle)
 *   3. Filtros — primary layers (GES/TB/HAS) + deferred subsection
 *   4. Precisam atenção — priority patient list (scrollable)
 *   5. Visualização — view mode toggle (markers / density / microarea)
 *   6. Filtros avançados — microárea + alert-level chip filters
 *   7. Footer — "Planejar visita" CTA
 */
export function LayerSidebar({ data }: LayerSidebarProps) {
  const activeLayers = useMapStore((s) => s.activeLayers);
  const toggleLayer = useMapStore((s) => s.toggleLayer);
  const alertsOnly = useMapStore((s) => s.alertsOnly);
  const setAlertsOnly = useMapStore((s) => s.setAlertsOnly);
  const viewMode = useMapStore((s) => s.viewMode);
  const setViewMode = useMapStore((s) => s.setViewMode);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);

  const layerIds = Object.keys(LAYER_CONFIG) as LayerId[];

  const alertCount = useMemo(() => {
    if (!data) return 0;
    let count = 0;
    for (const layerId of layerIds) {
      if (!activeLayers[layerId]) continue;
      const patients = data[layerId];
      if (!patients) continue;
      for (const p of patients) {
        const result = evaluatePatient(ALERT_RULES, p, layerId);
        const level = result.level;
        if (level === "vermelho" || level === "amarelo") count++;
      }
    }
    return count;
  }, [data, activeLayers, layerIds]);

  return (
    <aside className="flex h-full flex-col overflow-hidden border-r border-neutral-200 bg-white">
      <div className="flex items-center gap-1 border-b border-neutral-200 p-3">
        <div className="flex-1">
          <SearchInput />
        </div>
        <button
          type="button"
          onClick={toggleSidebar}
          title="Ocultar filtros"
          aria-label="Ocultar filtros"
          className="ml-1 flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition hover:bg-neutral-100 hover:text-foreground"
        >
          <PanelLeftClose className="size-4" />
        </button>
      </div>

      <div className="border-b border-neutral-200 px-3 py-2">
        <button
          type="button"
          onClick={() => { setAlertsOnly(!alertsOnly); }}
          className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm font-medium transition ${
            alertsOnly
              ? "bg-red-50 text-alert-red ring-1 ring-alert-red/30"
              : "text-neutral-700 hover:bg-neutral-50"
          }`}
        >
          <span className="flex items-center gap-2">
            <AlertTriangle
              className={`h-3.5 w-3.5 ${
                alertsOnly ? "text-alert-red" : "text-neutral-400"
              }`}
            />
            <span>Alertas</span>
          </span>
          <span
            className={`inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold ${
              alertsOnly
                ? "bg-alert-red text-white"
                : "bg-neutral-100 text-neutral-600"
            }`}
          >
            {alertCount}
          </span>
        </button>
      </div>

      <div className="border-b border-neutral-200 p-3">
        <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
          <Layers className="h-3 w-3" />
          Filtros
        </div>

        <div className="space-y-0.5">
          {PRIMARY_LAYER_IDS.map((id) => (
            <LayerToggleRow
              key={id}
              icon={LAYER_ICON[id]}
              colorClass={LAYER_COLOR_CLASS[id]}
              label={LAYER_CONFIG[id].label}
              count={data?.[id]?.length ?? 0}
              active={activeLayers[id]}
              onToggle={() => { toggleLayer(id); }}
            />
          ))}
        </div>

        {/* Deferred layers — muted, non-functional, collapsed by default */}
        <details className="mt-2 group">
          <summary className="flex cursor-pointer list-none items-center gap-1 py-1 text-xs text-neutral-400 hover:text-neutral-500">
            <ChevronDown className="h-3 w-3 transition-transform group-open:rotate-180" />
            Mais condições
          </summary>
          <div className="mt-1 space-y-0.5">
            {DEFERRED_LAYER_IDS.map((id) => (
              <LayerToggleRow
                key={id}
                icon={LAYER_ICON[id]}
                colorClass={LAYER_COLOR_CLASS[id]}
                label={LAYER_CONFIG[id].label}
                count={data?.[id]?.length ?? 0}
                active={activeLayers[id]}
                onToggle={() => { toggleLayer(id); }}
                muted
              />
            ))}
          </div>
        </details>
      </div>

      <PriorityListSection data={data} />

      <div className="border-t border-neutral-200 p-3">
        <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
          Visualização
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-neutral-200 bg-neutral-50 p-0.5">
          {(
            [
              { mode: "markers" as ViewMode, Icon: MapPin, label: "Marcadores" },
              { mode: "density" as ViewMode, Icon: Flame, label: "Densidade" },
              { mode: "microarea" as ViewMode, Icon: Hexagon, label: "Áreas" },
            ] as const
          ).map(({ mode, Icon, label }) => (
            <button
              key={mode}
              type="button"
              onClick={() => { setViewMode(mode); }}
              title={label}
              className={`flex flex-1 min-w-0 items-center justify-center gap-1 rounded-md px-1 py-1.5 text-[11px] font-medium transition ${
                viewMode === mode
                  ? "bg-white text-brand shadow-sm ring-1 ring-neutral-200"
                  : "text-neutral-500 hover:text-neutral-700"
              }`}
            >
              <Icon className="h-3 w-3 shrink-0" />
              <span className="truncate">{label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="border-t border-neutral-200 px-3 py-2">
        <FilterPanel />
      </div>

      <div className="border-t border-neutral-200 bg-neutral-50 p-3">
        <PlanejarVisitaButton />
      </div>
    </aside>
  );
}
