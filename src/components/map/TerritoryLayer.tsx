"use client";

import { GeoJSON } from "react-leaflet";
import type { Feature, FeatureCollection } from "geojson";
import { useMemo } from "react";
import type L from "leaflet";

const MICROAREA_COLORS: Record<string, string> = {
  MA1: "#E91E63",
  MA2: "#2196F3",
  MA3: "#4CAF50",
  MA4: "#FF9800",
  MA5: "#9C27B0",
};

interface TerritoryLayerProps {
  geojson: FeatureCollection;
  onMicroareaClick?: (id: string) => void;
}

export function TerritoryLayer({ geojson, onMicroareaClick }: TerritoryLayerProps) {
  const style = useMemo(
    () => (feature?: Feature) => ({
      fillColor: MICROAREA_COLORS[feature?.properties?.id] ?? "#666",
      weight: 2,
      opacity: 0.8,
      fillOpacity: 0.15,
      color: MICROAREA_COLORS[feature?.properties?.id] ?? "#666",
    }),
    []
  );

  const onEachFeature = useMemo(
    () => (feature: Feature, layer: L.Layer) => {
      if (feature.properties?.nome) {
        layer.bindTooltip(feature.properties.nome);
      }
      if (onMicroareaClick) {
        layer.on("click", () => {
          onMicroareaClick(feature.properties?.id);
        });
      }
    },
    [onMicroareaClick]
  );

  return <GeoJSON data={geojson} style={style} onEachFeature={onEachFeature} />;
}
