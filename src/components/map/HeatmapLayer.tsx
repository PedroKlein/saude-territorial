"use client";

import { useMap } from "react-leaflet";
import { useEffect } from "react";
import type L from "leaflet";

type LeafletHeatMod = typeof L & {
  heatLayer: (
    data: [number, number, number][],
    opts: { radius?: number; blur?: number; maxZoom?: number },
  ) => { addTo: (m: unknown) => { remove: () => void }; remove: () => void };
};

type HeatmapPoint = {
  lat: number;
  lng: number;
  intensity: number;
}

type HeatmapLayerProps = {
  points: HeatmapPoint[];
  radius?: number;
  blur?: number;
  maxZoom?: number;
}

/**
 * Heatmap layer using leaflet.heat.
 * Dynamically imports leaflet.heat to avoid SSR issues.
 * Intensity is based on alert level: vermelho=1.0, amarelo=0.6, verde=0.3
 */
export function HeatmapLayer({
  points,
  radius = 25,
  blur = 15,
  maxZoom = 17,
}: HeatmapLayerProps) {
  const map = useMap();

  useEffect(() => {
    let heatLayer: { remove: () => void } | null = null;

    void Promise.all([import("leaflet"), import("leaflet.heat")]).then(
      ([leafletMod]) => {
        const heatData: [number, number, number][] = points.map((p) => [
          p.lat,
          p.lng,
          p.intensity,
        ]);

        // leaflet.heat augments the default export with `heatLayer` at runtime.
        const LeafletHeat = leafletMod.default as LeafletHeatMod;
        heatLayer = LeafletHeat.heatLayer(heatData, { radius, blur, maxZoom }).addTo(map);
      },
    );

    return () => {
      if (heatLayer) {
        heatLayer.remove();
      }
    };
  }, [map, points, radius, blur, maxZoom]);

  return null;
}
