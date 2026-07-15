"use client";

import { CircleMarker, Popup } from "react-leaflet";
import { useMapStore } from "@/stores/mapStore";
import type { AlertLevel } from "@/types/alerts";

const ALERT_COLORS: Record<AlertLevel, string> = {
  vermelho: "#EF4444",
  amarelo: "#F59E0B",
  verde: "#22C55E",
};

interface PatientMarkerProps {
  cns: string;
  name: string | null;
  lat: number;
  lng: number;
  color: string;
  alertLevel?: AlertLevel;
}

export function PatientMarker({
  cns,
  name,
  lat,
  lng,
  color,
  alertLevel,
}: PatientMarkerProps) {
  const setSelectedPatient = useMapStore((s) => s.setSelectedPatient);

  // Use alert color for the border if an alert is active
  const borderColor = alertLevel ? ALERT_COLORS[alertLevel] : "#333";
  const borderWeight = alertLevel && alertLevel !== "verde" ? 3 : 1;

  return (
    <CircleMarker
      center={[lat, lng]}
      radius={8}
      pathOptions={{
        fillColor: color,
        color: borderColor,
        weight: borderWeight,
        fillOpacity: 0.8,
      }}
      eventHandlers={{
        click: () => setSelectedPatient(cns),
      }}
    >
      <Popup>
        <strong>{name ?? "Sem nome"}</strong>
        <br />
        <span className="text-xs text-muted-foreground">CNS: {cns}</span>
        {alertLevel && alertLevel !== "verde" && (
          <>
            <br />
            <span
              className="text-xs font-semibold"
              style={{ color: ALERT_COLORS[alertLevel] }}
            >
              {alertLevel === "vermelho" ? "⚠ Crítico" : "⚡ Atenção"}
            </span>
          </>
        )}
      </Popup>
    </CircleMarker>
  );
}
