"use client";

import { CircleMarker, Tooltip } from "react-leaflet";
import { useMapStore } from "@/stores/mapStore";
import type { AlertLevel } from "@/types/alerts";
import { useRef, useEffect } from "react";
import type { CircleMarker as LeafletCircleMarker } from "leaflet";

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

/** Selected marker style constants (matches PoC) */
const SELECTED_BORDER_COLOR = "#1e3a8a";
const SELECTED_WEIGHT = 4;
const SELECTED_FILL_OPACITY = 1;
const SELECTED_RADIUS_BOOST = 4;

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
  const selectedPatient = useMapStore((s) => s.selectedPatient);
  const markerRef = useRef<LeafletCircleMarker>(null);

  const isSelected = selectedPatient === cns;
  const fillColor = URGENCY_COLORS[alertLevel];
  const baseRadius = URGENCY_RADIUS[alertLevel];
  const radius = isSelected ? baseRadius + SELECTED_RADIUS_BOOST : baseRadius;
  const emoji = alertLevel === "vermelho" ? "🔴" : alertLevel === "amarelo" ? "🟡" : "🟢";

  // Bring selected marker to front
  useEffect(() => {
    if (isSelected && markerRef.current) {
      markerRef.current.bringToFront();
    }
  }, [isSelected]);

  return (
    <CircleMarker
      ref={markerRef}
      center={[lat, lng]}
      radius={radius}
      pathOptions={{
        fillColor,
        color: isSelected ? SELECTED_BORDER_COLOR : "#ffffff",
        weight: isSelected ? SELECTED_WEIGHT : 2,
        fillOpacity: isSelected ? SELECTED_FILL_OPACITY : 0.85,
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
