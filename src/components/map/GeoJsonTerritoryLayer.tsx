"use client";

import { useEffect, useMemo, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import type { Feature, FeatureCollection } from "geojson";
import {
  buildTerritoryIndex,
  countPatientsInTerritories,
  getTerritoryId,
  getTerritoryName,
  getTerritorySubtitle,
  type TerritoryPatientPoint,
} from "@/lib/territories/spatial";
import { attachNonFocusableHandlers } from "./leafletPathFocus";

export type TerritoryVariant = "bairro" | "health-unit";

type GeoJsonTerritoryLayerProps = {
  geojson: FeatureCollection;
  patients: TerritoryPatientPoint[];
  variant: TerritoryVariant;
  choropleth?: boolean;
  paneName: string;
  paneZIndex: number;
};

type SubLayerEntry = {
  id: string;
  name: string;
  subtitle: string | null;
  layer: L.Path;
};

const VARIANT_PALETTE: Record<
  TerritoryVariant,
  {
    stroke: string;
    fill: string;
    dashArray?: string;
    weight: number;
    hoverWeight: number;
    choroplethStops: [string, string, string];
  }
> = {
  bairro: {
    stroke: "#475569",
    fill: "#64748b",
    dashArray: "5 5",
    weight: 1.5,
    hoverWeight: 2.5,
    choroplethStops: ["#cbd5e1", "#64748b", "#334155"],
  },
  "health-unit": {
    stroke: "#2563eb",
    fill: "#3b82f6",
    weight: 2,
    hoverWeight: 3,
    choroplethStops: ["#bfdbfe", "#60a5fa", "#1d4ed8"],
  },
};

function computeTerritoryStyle(
  variant: TerritoryVariant,
  count: number,
  maxCount: number,
  choropleth: boolean,
): L.PathOptions {
  const palette = VARIANT_PALETTE[variant];

  if (!choropleth) {
    return {
      color: palette.stroke,
      fillColor: palette.fill,
      weight: palette.weight,
      opacity: 0.75,
      fillOpacity: 0.04,
      dashArray: palette.dashArray,
    };
  }

  if (count === 0) {
    return {
      color: palette.stroke,
      fillColor: palette.fill,
      weight: 1,
      opacity: 0.35,
      fillOpacity: 0.02,
      dashArray: palette.dashArray,
    };
  }

  const t = Math.min(1, count / Math.max(1, maxCount));
  const fillColor =
    t < 0.34
      ? palette.choroplethStops[0]
      : t < 0.67
        ? palette.choroplethStops[1]
        : palette.choroplethStops[2];

  return {
    color: palette.stroke,
    fillColor,
    weight: palette.weight,
    opacity: 0.85,
    fillOpacity: 0.18 + t * 0.42,
    dashArray: palette.dashArray,
  };
}

function buildTooltipNode(
  name: string,
  subtitle: string | null,
  count: number,
  variant: TerritoryVariant,
): HTMLElement {
  const root = document.createElement("div");
  root.className = "space-y-0.5 text-xs leading-snug";

  const titleEl = document.createElement("div");
  titleEl.className =
    variant === "health-unit"
      ? "font-semibold text-blue-900"
      : "font-semibold text-neutral-900";
  titleEl.textContent = name;
  root.appendChild(titleEl);

  if (subtitle) {
    const subEl = document.createElement("div");
    subEl.className = "text-[11px] text-neutral-500";
    subEl.textContent = subtitle;
    root.appendChild(subEl);
  }

  const countEl = document.createElement("div");
  countEl.className =
    count > 0
      ? "text-[11px] font-medium text-neutral-800"
      : "text-[11px] text-neutral-400";
  countEl.textContent = `${count} paciente${count !== 1 ? "s" : ""}`;
  root.appendChild(countEl);

  return root;
}

export function GeoJsonTerritoryLayer({
  geojson,
  patients,
  variant,
  choropleth = false,
  paneName,
  paneZIndex,
}: GeoJsonTerritoryLayerProps) {
  const map = useMap();

  const territoryIndex = useMemo(() => buildTerritoryIndex(geojson), [geojson]);
  const countsById = useMemo(
    () => countPatientsInTerritories(territoryIndex, patients),
    [territoryIndex, patients],
  );
  const maxCount = useMemo(
    () => Math.max(1, ...countsById.values()),
    [countsById],
  );

  const countsRef = useRef(countsById);
  const maxCountRef = useRef(maxCount);
  const choroplethRef = useRef(choropleth);
  const geoJsonLayerRef = useRef<L.GeoJSON | null>(null);
  const subLayersRef = useRef<SubLayerEntry[]>([]);

  useEffect(() => {
    let pane = map.getPane(paneName);
    if (!pane) {
      pane = map.createPane(paneName);
      pane.style.zIndex = String(paneZIndex);
    }

    const palette = VARIANT_PALETTE[variant];
    const subLayers: SubLayerEntry[] = [];
    let featureIdx = 0;

    const layer = L.geoJSON(geojson, {
      pane: paneName,
      interactive: true,
      style: (feature?: Feature) => {
        const id = feature ? getTerritoryId(feature) : "";
        const count = countsRef.current.get(id) ?? 0;
        return computeTerritoryStyle(
          variant,
          count,
          maxCountRef.current,
          choroplethRef.current,
        );
      },
      onEachFeature: (feature, lyr) => {
        const idx = featureIdx++;
        const id = getTerritoryId(feature, idx);
        const name = getTerritoryName(feature);
        const subtitle = getTerritorySubtitle(feature);
        const pathLayer = lyr as L.Path;
        const count = countsRef.current.get(id) ?? 0;

        pathLayer.bindTooltip(buildTooltipNode(name, subtitle, count, variant), {
          sticky: true,
          direction: "top",
          opacity: 0.96,
        });

        attachNonFocusableHandlers(pathLayer);
        pathLayer.on({
          mouseover: (e: L.LeafletMouseEvent) => {
            const target = e.target as L.Path;
            target.setStyle({
              weight: palette.hoverWeight,
              opacity: 1,
              fillOpacity: choroplethRef.current ? 0.55 : 0.14,
            });
          },
          mouseout: (e: L.LeafletMouseEvent) => {
            layer.resetStyle(e.target as L.Layer);
          },
        });

        subLayers.push({ id, name, subtitle, layer: pathLayer });
      },
    }).addTo(map);

    geoJsonLayerRef.current = layer;
    subLayersRef.current = subLayers;

    return () => {
      subLayersRef.current = [];
      geoJsonLayerRef.current = null;
      layer.remove();
    };
  }, [map, geojson, paneName, paneZIndex, variant]);

  useEffect(() => {
    countsRef.current = countsById;
    maxCountRef.current = maxCount;
    choroplethRef.current = choropleth;

    const layer = geoJsonLayerRef.current;
    if (!layer) return;

    layer.setStyle((feature?: Feature) => {
      const id = feature ? getTerritoryId(feature) : "";
      const count = countsById.get(id) ?? 0;
      return computeTerritoryStyle(variant, count, maxCount, choropleth);
    });

    for (const entry of subLayersRef.current) {
      const count = countsById.get(entry.id) ?? 0;
      entry.layer.setTooltipContent(
        buildTooltipNode(entry.name, entry.subtitle, count, variant),
      );
    }
  }, [countsById, maxCount, choropleth, variant]);

  return null;
}
