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

  // Subscribe to filter state so component re-renders on changes
  const microareas = useFilterStore((s) => s.microareas);
  const alertLevels = useFilterStore((s) => s.alertLevels);
  const searchText = useFilterStore((s) => s.searchText);
  const applyFilters = useFilterStore((s) => s.applyFilters);

  // Evaluate alert rules for all patients in this layer
  const alertResults = useAlerts(patients, ALERT_RULES, layerId);

  // Enrich patients with alertLevel then apply filters
  const visibleMarkers = useMemo(() => {
    const enriched = patients.map((p) => ({
      ...p,
      alertLevel: (alertResults.get(p.cns)?.level ?? "verde") as AlertLevel,
    }));

    const filtered = applyFilters(enriched);

    return filtered.map((p) => (
      <PatientMarker
        key={p.cns}
        cns={p.cns}
        name={p.nomeCompleto}
        lat={p.lat}
        lng={p.lng}
        alertLevel={p.alertLevel}
      />
    ));
  }, [patients, alertResults, applyFilters, microareas, alertLevels, searchText]);

  if (!isActive) return null;

  return <>{visibleMarkers}</>;
}
