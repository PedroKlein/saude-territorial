"use client";

import { useMap } from "react-leaflet";
import { useEffect, useRef } from "react";
import { useMapStore } from "@/stores/mapStore";
import type { LayeredPatientData } from "@/hooks/usePatientData";

interface MapControllerProps {
  data: LayeredPatientData | undefined;
}

/**
 * Programmatic map control: flies to the selected patient's coordinates.
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

    // Only fly when selection changes (not on re-renders)
    if (selectedPatient === prevSelected.current) return;
    prevSelected.current = selectedPatient;

    // Find the patient's coordinates across all layers
    for (const patients of Object.values(data)) {
      if (!patients) continue;
      const patient = patients.find((p) => p.id === selectedPatient);
      if (patient) {
        // Only fly if the patient is not already visible in the current viewport
        const patientLatLng = { lat: patient.lat, lng: patient.lng };
        const bounds = map.getBounds();

        if (!bounds.contains(patientLatLng)) {
          map.flyTo([patient.lat, patient.lng], 17, { duration: 0.5 });
        }
        break;
      }
    }
  }, [selectedPatient, data, map]);

  return null;
}
