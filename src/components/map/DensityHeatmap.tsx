"use client";

import { useMap } from "react-leaflet";
import { useEffect } from "react";
import type L from "leaflet";

// leaflet.heat augments L at runtime; mirror the shape used by HeatmapLayer.tsx.
type LeafletHeatMod = typeof L & {
  heatLayer: (
    latlngs: Array<[number, number, number]>,
    options?: {
      minOpacity?: number;
      maxZoom?: number;
      max?: number;
      radius?: number;
      blur?: number;
      gradient?: Record<number, string>;
    },
  ) => { addTo: (m: unknown) => unknown; remove(): void };
};

export interface DensityPoint {
  lat: number;
  lng: number;
  weight?: number;
}

interface DensityHeatmapProps {
  points: DensityPoint[];
}

/**
 * Leaflet heatmap overlay for the "Densidade" view mode.
 * Renders inside an existing MapContainer — purely a side-effect component.
 *
 * LGPD: only lat/lng coordinates are passed; no patient identifiers.
 */
export function DensityHeatmap({ points }: DensityHeatmapProps) {
  const map = useMap();

  useEffect(() => {
    let layer: { remove(): void } | null = null;
    let cancelled = false;

    void Promise.all([import("leaflet"), import("leaflet.heat")]).then(
      ([leafletMod]) => {
        if (cancelled) return;
        const LeafletHeat = leafletMod.default as LeafletHeatMod;
        const heatData: [number, number, number][] = points.map((p) => [
          p.lat,
          p.lng,
          p.weight ?? 1,
        ]);

        layer = LeafletHeat.heatLayer(heatData, {
          radius: 25,
          blur: 15,
          maxZoom: 17,
          gradient: {
            0.4: "oklch(65% 0.14 155)",
            0.7: "oklch(75% 0.14 75)",
            1.0: "oklch(58% 0.19 25)",
          },
        }).addTo(map) as { remove(): void };
      },
    );

    return () => {
      // Prevent the still-pending Promise.all resolver from adding a layer
      // after the component unmounts (or `points` change re-runs the effect).
      // Without the flag a leftover heat layer stays glued to the map when
      // the user switches away to Marcadores / Microárea.
      cancelled = true;
      layer?.remove();
    };
  }, [map, points]);

  return null;
}
