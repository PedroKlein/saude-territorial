"use client";

import { useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import type { Feature, FeatureCollection } from "geojson";
import { attachNonFocusableHandlers } from "./leafletPathFocus";

export type TerritoryVariant = "bairro" | "health-unit";

type GeoJsonTerritoryLayerProps = {
  geojson: FeatureCollection;
  variant: TerritoryVariant;
  paneName: string;
  paneZIndex: number;
};

const VARIANT_STYLE: Record<
  TerritoryVariant,
  {
    stroke: string;
    fill: string;
    dashArray?: string;
    weight: number;
    hoverWeight: number;
  }
> = {
  bairro: {
    stroke: "#475569",
    fill: "#64748b",
    dashArray: "5 5",
    weight: 1.5,
    hoverWeight: 2.5,
  },
  "health-unit": {
    stroke: "#2563eb",
    fill: "#3b82f6",
    weight: 2,
    hoverWeight: 3,
  },
};

function readString(val: unknown): string | null {
  if (typeof val !== "string") return null;
  const trimmed = val.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function getFeatureName(feature: Feature): string {
  const props = feature.properties ?? {};
  return (
    readString(props.nome) ??
    readString(props.Name) ??
    readString(props.id) ??
    "Território"
  );
}

function getFeatureSubtitle(feature: Feature): string | null {
  const props = feature.properties ?? {};
  const distrito = readString(props.Distrito_S);
  const coord = readString(props.Coordenado);
  if (distrito && coord) return `Distrito ${distrito} · ${coord}`;
  if (distrito) return `Distrito ${distrito}`;
  if (coord) return coord;
  return null;
}

function buildTooltipNode(
  name: string,
  subtitle: string | null,
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

  return root;
}

/**
 * Leaflet GeoJSON overlay for Porto Alegre bairros and health unit territories.
 */
export function GeoJsonTerritoryLayer({
  geojson,
  variant,
  paneName,
  paneZIndex,
}: GeoJsonTerritoryLayerProps) {
  const map = useMap();

  useEffect(() => {
    let pane = map.getPane(paneName);
    if (!pane) {
      pane = map.createPane(paneName);
      pane.style.zIndex = String(paneZIndex);
    }

    const palette = VARIANT_STYLE[variant];

    const layer = L.geoJSON(geojson, {
      pane: paneName,
      interactive: true,
      style: () => ({
        color: palette.stroke,
        fillColor: palette.fill,
        weight: palette.weight,
        opacity: 0.75,
        fillOpacity: 0.04,
        dashArray: palette.dashArray,
      }),
      onEachFeature: (feature: Feature, lyr: L.Layer) => {
        const pathLayer = lyr as L.Path;
        const name = getFeatureName(feature);
        const subtitle = getFeatureSubtitle(feature);

        pathLayer.bindTooltip(buildTooltipNode(name, subtitle, variant), {
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
              fillOpacity: 0.14,
            });
          },
          mouseout: (e: L.LeafletMouseEvent) => {
            layer.resetStyle(e.target as L.Layer);
          },
        });
      },
    }).addTo(map);

    return () => {
      layer.remove();
    };
  }, [map, geojson, paneName, paneZIndex, variant]);

  return null;
}
