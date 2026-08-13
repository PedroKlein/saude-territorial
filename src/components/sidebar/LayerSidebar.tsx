"use client";

import { useMapStore } from "@/stores/mapStore";
import { LAYER_CONFIG, type LayerId } from "@/config/layers.config";
import type { LayeredPatientData } from "@/hooks/usePatientData";
import { useMemo } from "react";
import { evaluatePatient } from "@/lib/alerts/engine";
import { ALERT_RULES } from "@/config/alert-rules.config";
import type { AlertLevel } from "@/types/alerts";

// Layer colors for the visual dot indicator
const LAYER_COLORS: Record<LayerId, string> = {
  gestantes: "#E91E63",
  tuberculose: "#FF5722",
  diabetes: "#2196F3",
  hipertensao: "#9C27B0",
  acamados: "#795548",
  pse: "#4CAF50",
  ilpi: "#607D8B",
};

interface LayerSidebarProps {
  data?: LayeredPatientData;
}

export function LayerSidebar({ data }: LayerSidebarProps) {
  const activeLayers = useMapStore((s) => s.activeLayers);
  const toggleLayer = useMapStore((s) => s.toggleLayer);
  const showTerritories = useMapStore((s) => s.showTerritories);
  const setShowTerritories = useMapStore((s) => s.setShowTerritories);
  const vizMode = useMapStore((s) => s.vizMode);
  const setVizMode = useMapStore((s) => s.setVizMode);
  const alertsOnly = useMapStore((s) => s.alertsOnly);
  const setAlertsOnly = useMapStore((s) => s.setAlertsOnly);

  const layerIds = Object.keys(LAYER_CONFIG) as LayerId[];

  // Count urgent patients (vermelho + amarelo) across active layers
  const alertCount = useMemo(() => {
    if (!data) return 0;
    let count = 0;
    for (const layerId of layerIds) {
      if (!activeLayers[layerId]) continue;
      const patients = data[layerId];
      if (!patients) continue;
      for (const p of patients) {
        const result = evaluatePatient(ALERT_RULES, p, layerId);
        const level = result.level as AlertLevel;
        if (level === "vermelho" || level === "amarelo") count++;
      }
    }
    return count;
  }, [data, activeLayers, layerIds]);

  return (
    <div className="p-4">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Camadas
      </h2>

      {/* Alertas meta-filter */}
      <button
        onClick={() => setAlertsOnly(!alertsOnly)}
        className={`mb-3 flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors ${
          alertsOnly
            ? "bg-red-50 text-red-700 ring-1 ring-red-200"
            : "bg-gray-50 text-gray-700 hover:bg-gray-100"
        }`}
      >
        <span>🚨 Alertas</span>
        <span className={`inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold ${
          alertsOnly ? "bg-red-600 text-white" : "bg-gray-200 text-gray-600"
        }`}>
          {alertCount}
        </span>
      </button>

      <ul className="flex flex-col gap-1">
        {layerIds.map((id) => {
          const config = LAYER_CONFIG[id];
          const count = data?.[id]?.length ?? 0;
          const isActive = activeLayers[id];

          return (
            <li key={id}>
              <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={() => toggleLayer(id)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <span
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{ backgroundColor: LAYER_COLORS[id] }}
                />
                <span className="flex-1 text-sm">{config.label}</span>
                <span className="text-xs text-muted-foreground">{count}</span>
              </label>
            </li>
          );
        })}
      </ul>

      {/* Visualization mode toggle */}
      <div className="mt-4 border-t pt-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Visualização
        </p>
        <div className="flex gap-1 rounded-md bg-gray-100 p-1">
          <VizButton
            active={vizMode === "markers"}
            onClick={() => setVizMode("markers")}
            label="Marcadores"
          />
          <VizButton
            active={vizMode === "heatmap"}
            onClick={() => setVizMode("heatmap")}
            label="Heatmap"
          />
        </div>
      </div>

      {/* Territory layer toggle */}
      <div className="mt-4 border-t pt-4">
        <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-gray-50">
          <input
            type="checkbox"
            checked={showTerritories}
            onChange={() => setShowTerritories(!showTerritories)}
            className="h-4 w-4 rounded border-gray-300"
          />
          <span className="h-3 w-3 shrink-0 rounded-full border-2 border-purple-500 bg-purple-200" />
          <span className="flex-1 text-sm">Microáreas</span>
        </label>
      </div>
    </div>
  );
}

function VizButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 rounded px-3 py-1 text-xs font-medium transition-colors ${
        active
          ? "bg-white text-gray-800 shadow-sm"
          : "text-gray-500 hover:text-gray-700"
      }`}
    >
      {label}
    </button>
  );
}
