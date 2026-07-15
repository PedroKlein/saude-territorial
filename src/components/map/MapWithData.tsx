"use client";

import DynamicMap from "@/components/map/DynamicMap";
import { LayerSidebar } from "@/components/sidebar/LayerSidebar";
import { FilterPanel } from "@/components/sidebar/FilterPanel";
import { PatientDetailPanel } from "@/components/panels/PatientDetailPanel";
import { StatsDashboard } from "@/components/map/StatsDashboard";
import { usePatientData } from "@/hooks/usePatientData";

/**
 * Client component that wires patient data into the map, sidebar, and panels.
 * Uses "demo" as spreadsheetId in development for synthetic data.
 */
export function MapWithData() {
  const spreadsheetId = process.env.NODE_ENV === "development" ? "demo" : "";
  const { data, isLoading } = usePatientData(spreadsheetId);

  return (
    <div className="flex h-full w-full">
      {/* Left sidebar: layers + filters */}
      <div className="flex w-64 flex-col overflow-y-auto border-r bg-white">
        <LayerSidebar data={data} />
        <div className="px-4 pb-4">
          <FilterPanel />
        </div>
      </div>

      {/* Map area */}
      <div className="relative flex-1">
        {isLoading && (
          <div className="absolute top-2 left-1/2 z-[1000] -translate-x-1/2 rounded bg-white px-3 py-1 text-sm shadow">
            Carregando dados...
          </div>
        )}
        <DynamicMap />
        {/* Stats dashboard (bottom center) */}
        <StatsDashboard data={data} />
        {/* Detail panel (right side, shows on marker click) */}
        <PatientDetailPanel layerData={data} />
      </div>
    </div>
  );
}
