"use client";

import { useMemo } from "react";
import { PatientMarker } from "./PatientMarker";
import { useMapStore } from "@/stores/mapStore";
import type { PatientRecord } from "@/hooks/usePatientData";
import type { LayerId } from "@/config/layers.config";

// Layer colors — mapped from colorToken
const LAYER_COLORS: Record<LayerId, string> = {
  gestantes: "#E91E63",
  tuberculose: "#FF5722",
  diabetes: "#2196F3",
  hipertensao: "#9C27B0",
  acamados: "#795548",
  pse: "#4CAF50",
  ilpi: "#607D8B",
};

interface LayerGroupProps {
  layerId: LayerId;
  patients: PatientRecord[];
}

export function LayerGroup({ layerId, patients }: LayerGroupProps) {
  const isActive = useMapStore((s) => s.activeLayers[layerId]);

  const markers = useMemo(
    () =>
      patients.map((p) => (
        <PatientMarker
          key={p.cns}
          cns={p.cns}
          name={p.nomeCompleto}
          lat={p.lat}
          lng={p.lng}
          color={LAYER_COLORS[layerId]}
        />
      )),
    [patients, layerId]
  );

  if (!isActive) return null;

  return <>{markers}</>;
}
