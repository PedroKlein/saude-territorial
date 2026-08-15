"use client";

import { useMemo } from "react";
import { GeoJSON } from "react-leaflet";
import type { Feature } from "geojson";
import type { PathOptions, Layer, FeatureGroup } from "leaflet";
import { MICROAREAS_GEOJSON } from "@/config/microareas.data";
import type { LayerId } from "@/config/layers.config";
import type { PatientRecord } from "@/hooks/usePatientData";

interface MicroareaChoroplethProps {
  data: Partial<Record<LayerId, PatientRecord[]>>;
}

/** Linear fill style scaled by patient count within a microárea. */
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
export function MicroareaChoropleth({ data }: MicroareaChoroplethProps) {
  // Count distinct patient ids per microárea.
  const countsByMicroarea = useMemo(() => {
    const seenIds = new Map<string, Set<string>>();
    for (const patients of Object.values(data)) {
      if (!patients) continue;
      for (const p of patients) {
        const ma = p.microarea as string | undefined;
        if (!ma) continue;
        let bucket = seenIds.get(ma);
        if (!bucket) {
          bucket = new Set<string>();
          seenIds.set(ma, bucket);
        }
        bucket.add(p.id);
      }
    }
    const counts = new Map<string, number>();
    for (const [ma, ids] of seenIds) {
      counts.set(ma, ids.size);
    }
    return counts;
  }, [data]);

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
    const id = feature?.properties?.id as string | undefined;
    const count = id ? (countsByMicroarea.get(id) ?? 0) : 0;
    return countToStyle(count, maxCount);
  }

  function onEachFeature(feature: Feature, layer: Layer) {
    const id = feature?.properties?.id as string | undefined;
    const nome = (feature?.properties?.nome as string | undefined) ?? id ?? "Microárea";
    const count = id ? (countsByMicroarea.get(id) ?? 0) : 0;
    const label = `${nome} · ${count} paciente${count !== 1 ? "s" : ""}`;
    (layer as FeatureGroup).bindTooltip(label);
  }

  return (
    <GeoJSON
      key={stableKey}
      data={MICROAREAS_GEOJSON}
      style={styleFeature}
      onEachFeature={onEachFeature}
    />
  );
}
