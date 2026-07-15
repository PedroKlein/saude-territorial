"use client";

import { CircleMarker, Tooltip } from "react-leaflet";
import { useMapStore } from "@/stores/mapStore";
import type { AlertLevel } from "@/types/alerts";

/** PoC-matching urgency colors */
export const URGENCY_COLORS: Record<AlertLevel, string> = {
  vermelho: "#dc2626",
  amarelo: "#d97706",
  verde: "#16a34a",
};

/** PoC-matching urgency radii */
const URGENCY_RADIUS: Record<AlertLevel, number> = {
  vermelho: 10,
  amarelo: 8,
  verde: 6,
};

interface PatientMarkerProps {
  cns: string;
  name: string | null;
  lat: number;
  lng: number;
  alertLevel: AlertLevel;
}

export function PatientMarker({
  cns,
  name,
  lat,
  lng,
  alertLevel,
}: PatientMarkerProps) {
  const setSelectedPatient = useMapStore((s) => s.setSelectedPatient);

  const fillColor = URGENCY_COLORS[alertLevel];
  const radius = URGENCY_RADIUS[alertLevel];
  const emoji = alertLevel === "vermelho" ? "🔴" : alertLevel === "amarelo" ? "🟡" : "🟢";

  return (
    <CircleMarker
      center={[lat, lng]}
      radius={radius}
      pathOptions={{
        fillColor,
        color: "#ffffff",
        weight: 2,
        fillOpacity: 0.85,
        opacity: 1,
      }}
      eventHandlers={{
        click: () => setSelectedPatient(cns),
      }}
    >
      <Tooltip direction="top" offset={[0, -8]}>
        <strong>{name ?? "Sem nome"}</strong>
        <br />
        <span style={{ fontSize: "11px" }}>
          {emoji} {alertLevel === "vermelho" ? "Crítico" : alertLevel === "amarelo" ? "Atenção" : "Normal"}
        </span>
      </Tooltip>
    </CircleMarker>
  );
}
