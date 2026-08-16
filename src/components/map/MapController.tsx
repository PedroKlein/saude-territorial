"use client";

import { useMap } from "react-leaflet";
import { useEffect, useRef } from "react";
import { useMapStore } from "@/stores/mapStore";
import type { LayeredPatientData } from "@/hooks/usePatientData";

interface MapControllerProps {
  data: LayeredPatientData | undefined;
}

/**
 * Programmatic map control: flies to the selected patient's coordinates on
 * every selection change.
 *
 * When the user is already zoomed in tighter than the target zoom, the
 * current zoom is preserved so we don't zoom OUT on a nearby click. Any
 * cross-page transition (e.g. from `/pacientes` → `/map?patient=…`) lands
 * on the patient at zoom 17.
 *
 * Must be rendered inside <MapContainer>.
 */
export function MapController({ data }: MapControllerProps) {
  const map = useMap();
  const selectedPatient = useMapStore((s) => s.selectedPatient);
  const prevSelected = useRef<string | null>(null);

  useEffect(() => {
    if (!selectedPatient || !data) {
      prevSelected.current = selectedPatient;
      return;
    }

    // Only fly when the selection actually changes.
    if (selectedPatient === prevSelected.current) return;
    prevSelected.current = selectedPatient;

    for (const patients of Object.values(data)) {
      if (!patients) continue;
      const patient = patients.find((p) => p.id === selectedPatient);
      if (!patient) continue;
      const targetZoom = Math.max(map.getZoom(), 17);
      map.flyTo([patient.lat, patient.lng], targetZoom, { duration: 0.5 });
      break;
    }
  }, [selectedPatient, data, map]);

  return null;
}
