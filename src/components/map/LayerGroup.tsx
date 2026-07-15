"use client";

import { useMemo } from "react";
import { PatientMarker } from "./PatientMarker";
import { useMapStore } from "@/stores/mapStore";
import { useAlerts } from "@/hooks/useAlerts";
import { ALERT_RULES } from "@/config/alert-rules.config";
import type { PatientRecord } from "@/hooks/usePatientData";
import type { LayerId } from "@/config/layers.config";

interface LayerGroupProps {
  layerId: LayerId;
  patients: PatientRecord[];
}

export function LayerGroup({ layerId, patients }: LayerGroupProps) {
  const isActive = useMapStore((s) => s.activeLayers[layerId]);

  // Evaluate alert rules for all patients in this layer
  const alertResults = useAlerts(patients, ALERT_RULES, layerId);

  const markers = useMemo(
    () =>
      patients.map((p) => {
        const alertResult = alertResults.get(p.cns);
        const alertLevel = alertResult?.level ?? "verde";

        return (
          <PatientMarker
            key={p.cns}
            cns={p.cns}
            name={p.nomeCompleto}
            lat={p.lat}
            lng={p.lng}
            alertLevel={alertLevel}
          />
        );
      }),
    [patients, alertResults]
  );

  if (!isActive) return null;

  return <>{markers}</>;
}
