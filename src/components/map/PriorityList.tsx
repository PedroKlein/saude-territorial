"use client";

import { useMemo, useState } from "react";
import { evaluatePatient } from "@/lib/alerts/engine";
import { useFilterStore } from "@/stores/filterStore";
import { useMapStore } from "@/stores/mapStore";
import { ALERT_RULES } from "@/config/alert-rules.config";
import type { PatientRecord, LayeredPatientData } from "@/hooks/usePatientData";
import type { LayerId } from "@/config/layers.config";
import type { AlertLevel } from "@/types/alerts";

const URGENCY_ICONS: Record<AlertLevel, string> = {
  vermelho: "🔴",
  amarelo: "🟡",
  verde: "🟢",
};

const URGENCY_SORT_ORDER: Record<AlertLevel, number> = {
  vermelho: 0,
  amarelo: 1,
  verde: 2,
};

const URGENCY_BORDER_COLORS: Record<AlertLevel, string> = {
  vermelho: "#dc2626",
  amarelo: "#d97706",
  verde: "#16a34a",
};

interface PriorityListProps {
  data: LayeredPatientData | undefined;
}

interface PriorityItem {
  cns: string;
  name: string | null;
  alertLevel: AlertLevel;
  triggeredCount: number;
  lat: number;
  lng: number;
}

/**
 * Collapsible priority list showing patients ranked by urgency.
 * Click an item → fly to marker + open detail panel.
 */
export function PriorityList({ data }: PriorityListProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const activeLayers = useMapStore((s) => s.activeLayers);
  const setSelectedPatient = useMapStore((s) => s.setSelectedPatient);
  const microareas = useFilterStore((s) => s.microareas);
  const alertLevels = useFilterStore((s) => s.alertLevels);
  const searchText = useFilterStore((s) => s.searchText);
  const applyFilters = useFilterStore((s) => s.applyFilters);

  const items = useMemo((): PriorityItem[] => {
    if (!data) return [];

    let allEnriched: Array<PatientRecord & { alertLevel: AlertLevel; triggeredCount: number }> = [];

    for (const [layerId, patients] of Object.entries(data)) {
      if (!patients || patients.length === 0) continue;
      if (!activeLayers[layerId as LayerId]) continue;

      const enriched = patients.map((p) => {
        const result = evaluatePatient(ALERT_RULES, p, layerId);
        return {
          ...p,
          alertLevel: result.level as AlertLevel,
          triggeredCount: result.triggeredRules.length,
        };
      });

      allEnriched = allEnriched.concat(enriched);
    }

    const filtered = applyFilters(allEnriched);

    // Sort by severity (vermelho first), then by triggered rule count desc
    return filtered
      .sort((a, b) => {
        const levelDiff = URGENCY_SORT_ORDER[a.alertLevel] - URGENCY_SORT_ORDER[b.alertLevel];
        if (levelDiff !== 0) return levelDiff;
        return b.triggeredCount - a.triggeredCount;
      })
      .map((p) => ({
        cns: p.cns,
        name: p.nomeCompleto,
        alertLevel: p.alertLevel,
        triggeredCount: p.triggeredCount,
        lat: p.lat,
        lng: p.lng,
      }));
  }, [data, activeLayers, applyFilters, microareas, alertLevels, searchText]);

  if (!data) return null;

  return (
    <div className="absolute top-4 right-4 z-[900] flex w-72 flex-col overflow-hidden rounded-lg bg-white shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-3 py-2">
        <div>
          <h3 className="text-sm font-bold text-gray-800">📋 Prioridades</h3>
          <p className="text-xs text-gray-500">{items.length} pacientes</p>
        </div>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="text-lg text-gray-400 hover:text-gray-600"
        >
          {isCollapsed ? "▶" : "▼"}
        </button>
      </div>

      {/* List items */}
      {!isCollapsed && (
        <div className="max-h-[50vh] overflow-y-auto">
          {items.map((item) => (
            <button
              key={item.cns}
              onClick={() => setSelectedPatient(item.cns)}
              className="flex w-full cursor-pointer items-start gap-2 border-b border-gray-50 px-3 py-2 text-left transition-colors hover:bg-blue-50"
              style={{ borderLeft: `3px solid ${URGENCY_BORDER_COLORS[item.alertLevel]}` }}
            >
              <span className="mt-0.5 flex-shrink-0 text-sm">
                {URGENCY_ICONS[item.alertLevel]}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-gray-800">
                  {item.name ?? "Sem nome"}
                </p>
                <p className="text-xs text-gray-500">
                  CNS: {item.cns}
                  {item.triggeredCount > 0 && (
                    <span className="ml-1 text-red-600">
                      • {item.triggeredCount} alerta{item.triggeredCount > 1 ? "s" : ""}
                    </span>
                  )}
                </p>
              </div>
            </button>
          ))}
          {items.length === 0 && (
            <p className="px-3 py-4 text-center text-xs text-gray-400">
              Nenhum paciente encontrado
            </p>
          )}
        </div>
      )}
    </div>
  );
}
