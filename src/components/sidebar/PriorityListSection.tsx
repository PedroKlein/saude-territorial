"use client";

import { useMemo } from "react";
import { Baby, Wind, HeartPulse, ChevronRight } from "lucide-react";
import { evaluatePatient } from "@/lib/alerts/engine";
import { useFilterStore } from "@/stores/filterStore";
import { useMapStore } from "@/stores/mapStore";
import { ALERT_RULES } from "@/config/alert-rules.config";
import type { PatientRecord, LayeredPatientData } from "@/hooks/usePatientData";
import type { LayerId } from "@/config/layers.config";
import type { AlertLevel } from "@/types/alerts";
import type { LucideIcon } from "lucide-react";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const LAYER_ICON: Partial<Record<LayerId, LucideIcon>> = {
  gestantes: Baby,
  tuberculose: Wind,
  hipertensao: HeartPulse,
};

const LAYER_COLOR_CLASS: Partial<Record<LayerId, string>> = {
  gestantes: "bg-gestante",
  tuberculose: "bg-tuberculose",
  hipertensao: "bg-hipertensao",
};

const LAYER_ABBR: Partial<Record<LayerId, string>> = {
  gestantes: "GES",
  tuberculose: "TB",
  hipertensao: "HAS",
};

const ALERT_DOT_CLASS: Record<AlertLevel, string> = {
  vermelho: "bg-alert-red",
  amarelo: "bg-alert-amber",
  verde: "bg-ok-green",
};

const URGENCY_ORDER: Record<AlertLevel, number> = {
  vermelho: 0,
  amarelo: 1,
  verde: 2,
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PriorityItem {
  id: string;
  name: string | null;
  alertLevel: AlertLevel;
  triggeredCount: number;
  layerId: LayerId;
  microarea: string | null;
}

interface PriorityListSectionProps {
  data: LayeredPatientData | undefined;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Sidebar priority list: "Precisam atenção"
 *
 * Shows patients across active layers that have a vermelho or amarelo alert,
 * sorted by severity. Clicking a row selects the patient and opens the detail
 * panel. Microárea label and condition badge follow the proto/map sketch.
 */
export function PriorityListSection({ data }: PriorityListSectionProps) {
  const activeLayers = useMapStore((s) => s.activeLayers);
  const setSelectedPatient = useMapStore((s) => s.setSelectedPatient);
  const applyFilters = useFilterStore((s) => s.applyFilters);
  // Subscribe to filter state so the memo recomputes when filters change.
  const microareas = useFilterStore((s) => s.microareas);
  const alertLevels = useFilterStore((s) => s.alertLevels);
  const searchText = useFilterStore((s) => s.searchText);

  const items = useMemo((): PriorityItem[] => {
    if (!data) return [];

    type Enriched = PatientRecord & {
      alertLevel: AlertLevel;
      triggeredCount: number;
      layerId: LayerId;
    };

    let allEnriched: Enriched[] = [];

    for (const [rawId, patients] of Object.entries(data)) {
      const layerId = rawId as LayerId;
      if (!patients || patients.length === 0) continue;
      if (!activeLayers[layerId]) continue;

      const enriched = patients.map<Enriched>((p) => {
        const result = evaluatePatient(ALERT_RULES, p, layerId);
        return {
          ...p,
          alertLevel: result.level as AlertLevel,
          triggeredCount: result.triggeredRules.length,
          layerId,
        };
      });

      allEnriched = allEnriched.concat(enriched);
    }

    // Apply search / microarea / alert filters from filterStore.
    const filtered = applyFilters(allEnriched);

    return filtered
      .filter((p) => p.alertLevel === "vermelho" || p.alertLevel === "amarelo")
      .sort((a, b) => {
        const diff = URGENCY_ORDER[a.alertLevel] - URGENCY_ORDER[b.alertLevel];
        return diff !== 0 ? diff : b.triggeredCount - a.triggeredCount;
      })
      .map<PriorityItem>((p) => ({
        id: p.id,
        name: p.nomeCompleto,
        alertLevel: p.alertLevel,
        triggeredCount: p.triggeredCount,
        layerId: p.layerId,
        microarea:
          typeof p.microarea === "string" ? p.microarea : null,
      }));
    // `applyFilters` closes over Zustand filter state via get(); the
    // state slices below drive re-renders on filter change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, activeLayers, applyFilters, microareas, alertLevels, searchText]);

  if (!data) return null;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Section header */}
      <div className="flex items-center justify-between px-3 pt-3 pb-2">
        <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
          <span className="h-1.5 w-1.5 rounded-full bg-alert-red" aria-hidden />
          Precisam atenção
        </div>
        <span className="text-[11px] text-neutral-400">{items.length}</span>
      </div>

      {/* Scrollable list */}
      <ul className="flex-1 overflow-y-auto px-2 pb-2">
        {items.map((item) => {
          const Icon = LAYER_ICON[item.layerId];
          const colorClass = LAYER_COLOR_CLASS[item.layerId] ?? "bg-neutral-400";
          const abbr = LAYER_ABBR[item.layerId] ?? item.layerId.slice(0, 3).toUpperCase();

          return (
            <li key={item.id}>
              <button
                type="button"
                className="group flex w-full items-start gap-2.5 rounded-md px-2 py-2 text-left hover:bg-neutral-50"
                onClick={() => setSelectedPatient(item.id)}
              >
                {/* Condition icon circle */}
                <span
                  className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white ${colorClass}`}
                >
                  {Icon ? (
                    <Icon className="h-3 w-3" />
                  ) : (
                    <span className="text-[9px] font-bold">{abbr}</span>
                  )}
                </span>

                {/* Text block */}
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span
                      className={`h-1.5 w-1.5 shrink-0 rounded-full ${ALERT_DOT_CLASS[item.alertLevel]}`}
                      aria-hidden
                    />
                    <span className="truncate text-sm font-medium text-neutral-900">
                      {item.name ?? "Sem nome"}
                    </span>
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-neutral-500">
                    {abbr}
                    {item.triggeredCount > 0 &&
                      ` · ${item.triggeredCount} alerta${item.triggeredCount > 1 ? "s" : ""}`}
                    {item.microarea ? ` · ${item.microarea}` : ""}
                  </span>
                </span>

                <ChevronRight className="mt-1 h-3.5 w-3.5 shrink-0 text-neutral-300 group-hover:text-neutral-500" />
              </button>
            </li>
          );
        })}

        {items.length === 0 && (
          <li className="px-3 py-4 text-center text-xs text-neutral-400">
            Nenhum paciente em alerta
          </li>
        )}
      </ul>
    </div>
  );
}
