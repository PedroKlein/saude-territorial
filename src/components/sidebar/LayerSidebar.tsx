"use client";

import { useMapStore } from "@/stores/mapStore";
import { LAYER_CONFIG, type LayerId } from "@/config/layers.config";
import type { LayeredPatientData } from "@/hooks/usePatientData";

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

  const layerIds = Object.keys(LAYER_CONFIG) as LayerId[];

  return (
    <div className="p-4">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Camadas
      </h2>
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
    </div>
  );
}
