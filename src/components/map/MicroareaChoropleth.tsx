"use client";

import { useMemo } from "react";
import { GeoJSON } from "react-leaflet";
import type { Feature, FeatureCollection } from "geojson";
import type { PathOptions, Layer, FeatureGroup } from "leaflet";
import type { LayerId } from "@/config/layers.config";
import type { PatientRecord } from "@/hooks/usePatientData";
import {
  countPatientsInTerritories,
  getTerritoryId,
  getTerritoryName,
  type TerritoryPatientPoint,
} from "@/lib/territories/spatial";
import { attachNonFocusableHandlers } from "./leafletPathFocus";

type MicroareaChoroplethProps = {
  geojson: FeatureCollection;
  data?: Partial<Record<LayerId, PatientRecord[]>>;
  patients?: TerritoryPatientPoint[];
};

function countToStyle(count: number, max: number): PathOptions {
  if (count === 0) {
    return {
      fillOpacity: 0,
      color: "oklch(58% 0.10 195)",
      weight: 1,
      opacity: 0.25,
    };
  }
  const t = Math.min(1, count / max);
  // Interpolate opacity 0.15 → 0.55; color steps light → deep teal.
  const fillOpacity = 0.15 + t * 0.4;
  const fillColor =
    t < 0.34
      ? "oklch(94% 0.02 195)"
      : t < 0.67
        ? "oklch(76% 0.06 195)"
        : "oklch(58% 0.10 195)";
  return {
    fillColor,
    fillOpacity,
    color: "oklch(58% 0.10 195)",
    weight: 1.5,
    opacity: 0.7,
  };
}

/**
 * Choropleth overlay for the "Microárea" view mode.
 * Colours each microárea polygon by distinct patient count from the filtered pool.
 *
 * LGPD: only aggregate counts per polygon are derived; no individual fields rendered.
 */
export function MicroareaChoropleth({
  geojson,
  data,
  patients,
}: MicroareaChoroplethProps) {
  const patientPool = useMemo((): TerritoryPatientPoint[] => {
    if (patients) return patients;
    if (!data) return [];
    const list: TerritoryPatientPoint[] = [];
    for (const group of Object.values(data)) {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- Partial<Record<...>> values can be undefined at runtime even though Object.values() types them as PatientRecord[]
      if (!group) continue;
      for (const p of group) {
        list.push({
          id: p.id,
          lat: p.lat,
          lng: p.lng,
          microarea: typeof p.microarea === "string" ? p.microarea : null,
        });
      }
    }
    return list;
  }, [data, patients]);

  const countsByMicroarea = useMemo(
    () =>
      countPatientsInTerritories(geojson, patientPool, {
        matchProperty: "microarea",
      }),
    [geojson, patientPool],
  );

  const maxCount = Math.max(1, ...countsByMicroarea.values());

  // Stable key forces GeoJSON remount when counts change (react-leaflet
  // does not re-apply style after initial render).
  const stableKey = useMemo(
    () =>
      [...countsByMicroarea.entries()]
        .map(([k, v]) => `${k}:${v}`)
        .join(","),
    [countsByMicroarea],
  );

  function styleFeature(feature?: Feature): PathOptions {
    const id = feature ? getTerritoryId(feature) : "";
    const count = countsByMicroarea.get(id) ?? 0;
    return countToStyle(count, maxCount);
  }

  function onEachFeature(feature: Feature, layer: Layer) {
    const id = getTerritoryId(feature);
    const nome = getTerritoryName(feature);
    const count = countsByMicroarea.get(id) ?? 0;
    const label = `${nome} · ${count} paciente${count !== 1 ? "s" : ""}`;
    const fg = layer as FeatureGroup;
    fg.bindTooltip(label, { sticky: true });
    attachNonFocusableHandlers(fg);
  }

  return (
    <GeoJSON
      key={stableKey}
      data={geojson}
      style={styleFeature}
      onEachFeature={onEachFeature}
    />
  );
}
