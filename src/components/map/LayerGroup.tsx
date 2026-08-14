"use client";

import { useMemo } from "react";
import { PatientMarker } from "./PatientMarker";
import { useMapStore } from "@/stores/mapStore";
import { useFilterStore } from "@/stores/filterStore";
import { useAlerts } from "@/hooks/useAlerts";
import { ALERT_RULES } from "@/config/alert-rules.config";
import { coincidenceKey } from "@/components/map/markerHelpers";
import type { PatientRecord } from "@/hooks/usePatientData";
import type { LayerId } from "@/config/layers.config";
import type { AlertLevel } from "@/types/alerts";

interface LayerGroupProps {
  layerId: LayerId;
  patients: PatientRecord[];
  /** Cross-layer coincidence map (coord key → total count). */
  coincidenceMap: Map<string, number>;
}

export function LayerGroup({
  layerId,
  patients,
  coincidenceMap,
}: LayerGroupProps) {
  const isActive = useMapStore((s) => s.activeLayers[layerId]);
  const alertsOnly = useMapStore((s) => s.alertsOnly);

  // Subscribe to filter state so the component re-renders on changes.
  const microareas = useFilterStore((s) => s.microareas);
  const alertLevels = useFilterStore((s) => s.alertLevels);
  const searchText = useFilterStore((s) => s.searchText);
  const hideUncertain = useFilterStore((s) => s.hideUncertain);
  const applyFilters = useFilterStore((s) => s.applyFilters);

  const alertResults = useAlerts(patients, ALERT_RULES, layerId);

  const visibleMarkers = useMemo(() => {
    const enriched = patients.map((p) => ({
      ...p,
      alertLevel: (alertResults.get(p.cns)?.level ?? "verde") as AlertLevel,
    }));

    const alertFiltered = alertsOnly
      ? enriched.filter(
          (p) => p.alertLevel === "vermelho" || p.alertLevel === "amarelo",
        )
      : enriched;

    const filtered = applyFilters(alertFiltered);

    return filtered.map((p) => (
      <PatientMarker
        key={p.cns}
        id={p.id}
        name={p.nomeCompleto}
        lat={p.lat}
        lng={p.lng}
        alertLevel={p.alertLevel}
        layerId={layerId}
        coincidenceCount={coincidenceMap.get(coincidenceKey(p.lat, p.lng)) ?? 1}
        confidence={p.confidence}
      />
    ));
    // `applyFilters` closes over Zustand filter state via get(); the
    // state slices below drive re-renders on filter change even though
    // eslint can't see through the closure.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    patients,
    alertResults,
    applyFilters,
    coincidenceMap,
    layerId,
    microareas,
    alertLevels,
    searchText,
    hideUncertain,
    alertsOnly,
  ]);

  if (!isActive) return null;

  return <>{visibleMarkers}</>;
}
