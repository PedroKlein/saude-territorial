"use client";

import { useMap } from "react-leaflet";
import { useEffect } from "react";
import type L from "leaflet";

interface HeatmapPoint {
  lat: number;
  lng: number;
  intensity: number;
}

interface HeatmapLayerProps {
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let heatLayer: any = null;

    import("leaflet.heat").then(() => {
      const heatData: [number, number, number][] = points.map((p) => [
        p.lat,
        p.lng,
        p.intensity,
      ]);

      // leaflet.heat adds L.heatLayer to the L namespace
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const L = require("leaflet") as typeof import("leaflet") & { heatLayer: any };
      heatLayer = L.heatLayer(heatData, {
        radius,
        blur,
        maxZoom,
      }).addTo(map);
    });

    return () => {
      if (heatLayer) {
        heatLayer.remove();
      }
    };
  }, [map, points, radius, blur, maxZoom]);

  // This component only produces side effects on the map
  return null;
}
