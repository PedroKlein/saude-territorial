"use client";

import DynamicMap from "@/components/map/DynamicMap";
import { LayerSidebar } from "@/components/sidebar/LayerSidebar";
import { usePatientData } from "@/hooks/usePatientData";

/**
 * Client component that wires patient data into the map and sidebar.
 * Uses "demo" as spreadsheetId in development when no sheet is configured.
 */
export function MapWithData() {
  // In dev: always load demo data so the map has markers to show
  // In prod: this would come from user preferences / settings
  const spreadsheetId = process.env.NODE_ENV === "development" ? "demo" : "";

  const { data, isLoading } = usePatientData(spreadsheetId);

  return (
    <div className="flex h-full w-full">
      <LayerSidebar data={data} />
      <div className="relative flex-1">
        {isLoading && (
          <div className="absolute top-2 left-1/2 z-[1000] -translate-x-1/2 rounded bg-white px-3 py-1 text-sm shadow">
            Carregando dados...
          </div>
        )}
        <DynamicMap />
      </div>
    </div>
  );
}
