"use client";

import { CircleMarker, Popup } from "react-leaflet";
import { useMapStore } from "@/stores/mapStore";

interface PatientMarkerProps {
  cns: string;
  name: string | null;
  lat: number;
  lng: number;
  color: string;
}

export function PatientMarker({ cns, name, lat, lng, color }: PatientMarkerProps) {
  const setSelectedPatient = useMapStore((s) => s.setSelectedPatient);

  return (
    <CircleMarker
      center={[lat, lng]}
      radius={8}
      pathOptions={{
        fillColor: color,
        color: "#333",
        weight: 1,
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
      </Popup>
    </CircleMarker>
  );
}
