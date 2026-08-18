"use client";

import { GeoJSON } from "react-leaflet";
import type { Feature, FeatureCollection } from "geojson";
import { useMemo } from "react";
import type L from "leaflet";

type MicroareaOutlinesProps = {
  geojson: FeatureCollection;
  /** IDs of currently filtered microareas (from filterStore). */
  filteredIds: string[];
}

/**
 * Renders microárea polygon outlines as teal-dashed lines (DS-8 / UP-4.5).
 *
 * When exactly one MA is filtered:
 *   - that MA renders solid at full weight.
 *   - all others fade to opacity 0.25.
 * When no MA is filtered: all outlines render at default dashed style.
 *
 * Toggle visibility by mounting/unmounting (controlled by `showTerritories`
 * in mapStore — the parent MapView handles the conditional render).
 */
export function MicroareaOutlines({
  geojson,
  filteredIds,
}: MicroareaOutlinesProps) {
  const singleFilter = filteredIds.length === 1 ? filteredIds[0] : null;

  const styleFeature = useMemo(
    () =>
      (feature?: Feature): L.PathOptions => {
        const id: string = (feature?.properties?.id as string | undefined) ?? "";
        const isHighlighted = singleFilter === id;
        const isFaded = singleFilter !== null && !isHighlighted;

        return {
          color: "var(--color-brand)",
          weight: isHighlighted ? 3 : 1.5,
          dashArray: isHighlighted ? undefined : "4 6",
          fillOpacity: 0,
          opacity: isFaded ? 0.25 : 1,
        };
      },
    [singleFilter],
  );

  // Key on singleFilter so react-leaflet re-creates the GeoJSON layer
  // whenever the highlighted MA changes (GeoJSON layer doesn't re-style
  // in-place; re-mount is the simplest correct approach).
  return (
    <GeoJSON
      key={singleFilter ?? "all"}
      data={geojson}
      style={styleFeature}
    />
  );
}
