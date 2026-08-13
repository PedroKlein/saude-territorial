"use client";

import { useMemo } from "react";
import { PatientMarker } from "./PatientMarker";
import { useMapStore } from "@/stores/mapStore";
import { useFilterStore } from "@/stores/filterStore";
import { useAlerts } from "@/hooks/useAlerts";
import { ALERT_RULES } from "@/config/alert-rules.config";
import type { PatientRecord } from "@/hooks/usePatientData";
import type { LayerId } from "@/config/layers.config";
import type { AlertLevel } from "@/types/alerts";

interface LayerGroupProps {
  layerId: LayerId;
  patients: PatientRecord[];
}

export function LayerGroup({ layerId, patients }: LayerGroupProps) {
  const isActive = useMapStore((s) => s.activeLayers[layerId]);
  const alertsOnly = useMapStore((s) => s.alertsOnly);

  // Subscribe to filter state so component re-renders on changes
  const microareas = useFilterStore((s) => s.microareas);
  const alertLevels = useFilterStore((s) => s.alertLevels);
  const searchText = useFilterStore((s) => s.searchText);
  const hideUncertain = useFilterStore((s) => s.hideUncertain);
  const applyFilters = useFilterStore((s) => s.applyFilters);

  // Evaluate alert rules for all patients in this layer
  const alertResults = useAlerts(patients, ALERT_RULES, layerId);

  // Enrich patients with alertLevel then apply filters
  const visibleMarkers = useMemo(() => {
    const enriched = patients.map((p) => ({
      ...p,
      alertLevel: (alertResults.get(p.cns)?.level ?? "verde") as AlertLevel,
    }));

    // Apply alertsOnly meta-filter before regular filters
    const alertFiltered = alertsOnly
      ? enriched.filter((p) => p.alertLevel === "vermelho" || p.alertLevel === "amarelo")
      : enriched;

    const filtered = applyFilters(alertFiltered);

    return filtered.map((p) => (
      <PatientMarker
        key={p.cns}
        id={p.id}
        cns={p.cns}
        name={p.nomeCompleto}
        lat={p.lat}
        lng={p.lng}
        alertLevel={p.alertLevel}
        confidence={p.confidence}
      />
    ));
  }, [patients, alertResults, applyFilters, microareas, alertLevels, searchText, hideUncertain, alertsOnly]);

  if (!isActive) return null;

  return <>{visibleMarkers}</>;
}
