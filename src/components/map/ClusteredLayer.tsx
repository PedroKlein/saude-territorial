"use client";

import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";
import { useMemo, type ReactNode } from "react";
import { worstAlertLevel } from "@/components/map/markerHelpers";
import type { AlertLevel } from "@/types/alerts";

// leaflet.markercluster types are not shipped with @types/leaflet; define the
// minimal interface we actually use so we stay type-safe without adding a dep.
type MarkerCluster = {
  getChildCount(): number;
  getAllChildMarkers(): L.Marker[];
}

type ClusteredLayerProps = {
  children: ReactNode;
}

/** DS-11 alert colors — hex fallbacks for Leaflet inline styles (no CSS vars). */
const CLUSTER_RING: Record<AlertLevel, string> = {
  vermelho: "oklch(58% 0.19 25)",
  amarelo: "oklch(75% 0.14 75)",
  verde: "oklch(80% 0 0)",
};

/**
 * Custom cluster icon: white circle, dark number, colored ring whose hue
 * reflects the worst alert level among child markers (DS-8).
 *
 * Each child `PatientMarker` stores its alert level in `marker.options.alt`,
 * making this read fully safe with no DOM parsing.
 */
function clusterIcon(cluster: MarkerCluster): L.DivIcon {
  const children = cluster.getAllChildMarkers();
  const levels = children
    .map((m) => m.options.alt as AlertLevel | undefined)
    .filter((l): l is AlertLevel => l === "vermelho" || l === "amarelo" || l === "verde");

  const worst = worstAlertLevel(levels);
  const ring = CLUSTER_RING[worst];
  const count = cluster.getChildCount();

  const html = `<div style="
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: white;
    box-shadow: 0 0 0 3px ${ring}, 0 2px 8px rgba(0,0,0,0.15);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    font-weight: 600;
    color: oklch(20% 0.02 260);
    cursor: pointer;
  ">${count}</div>`;

  return L.divIcon({
    className: "",
    html,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
}

export function ClusteredLayer({ children }: ClusteredLayerProps) {
  const clusterOptions = useMemo(
    () => ({
      chunkedLoading: true,
      maxClusterRadius: 60,
      disableClusteringAtZoom: 17,
      removeOutsideVisibleBounds: true,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      iconCreateFunction: clusterIcon,
    }),
    [],
  );

  return (
    <MarkerClusterGroup {...clusterOptions}>{children}</MarkerClusterGroup>
  );
}
