"use client";

import { GeoJSON } from "react-leaflet";
import type { Feature, FeatureCollection } from "geojson";
import { useMemo } from "react";
import type L from "leaflet";
import {
  countPatientsInTerritories,
  getTerritoryId,
  getTerritoryName,
  getTerritorySubtitle,
  type TerritoryPatientPoint,
} from "@/lib/territories/spatial";
import { attachNonFocusableHandlers } from "./leafletPathFocus";

const MICROAREA_COLORS: Partial<Record<string, string>> = {
  MA1: "#E91E63",
  MA2: "#2196F3",
  MA3: "#4CAF50",
  MA4: "#FF9800",
  MA5: "#9C27B0",
};

type TerritoryLayerProps = {
  geojson: FeatureCollection;
  patients?: TerritoryPatientPoint[];
  onMicroareaClick?: (id: string) => void;
};

export function TerritoryLayer({
  geojson,
  patients,
  onMicroareaClick,
}: TerritoryLayerProps) {
  const countsById = useMemo(
    () =>
      patients
        ? countPatientsInTerritories(geojson, patients, {
            matchProperty: "microarea",
          })
        : null,
    [geojson, patients],
  );

  const stableKey = useMemo(() => {
    if (!countsById) return "static";
    return [...countsById.entries()].map(([k, v]) => `${k}:${v}`).join(",");
  }, [countsById]);

  const style = useMemo(
    () => (feature?: Feature) => {
      const id = feature ? getTerritoryId(feature) : "";
      const color = MICROAREA_COLORS[id] ?? "#666";
      return {
        fillColor: color,
        weight: 2,
        opacity: 0.8,
        fillOpacity: 0.15,
        color,
      };
    },
    [],
  );

  const onEachFeature = useMemo(
    () => (feature: Feature, layer: L.Layer) => {
      const id = getTerritoryId(feature);
      const nome = getTerritoryName(feature);
      const subtitle = getTerritorySubtitle(feature);
      const parts = [subtitle ? `${nome} (${subtitle})` : nome];
      if (countsById) {
        const count = countsById.get(id) ?? 0;
        parts.push(`${count} paciente${count !== 1 ? "s" : ""}`);
      }
      layer.bindTooltip(parts.join(" · "), { sticky: true });
      attachNonFocusableHandlers(layer);
      if (onMicroareaClick) {
        layer.on("click", () => {
          onMicroareaClick(id);
        });
      }
    },
    [countsById, onMicroareaClick],
  );

  return (
    <GeoJSON
      key={stableKey}
      data={geojson}
      style={style}
      onEachFeature={onEachFeature}
    />
  );
}
