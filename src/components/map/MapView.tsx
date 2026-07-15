"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, Tooltip } from "react-leaflet";
import { useRef, useCallback } from "react";
import type { Map as LeafletMap } from "leaflet";
import { LayerGroup } from "./LayerGroup";
import { ActiveRouteLayer } from "./ActiveRouteLayer";
import { MapController } from "./MapController";
import { ClusteredLayer } from "./ClusteredLayer";
import { TerritoryLayer } from "./TerritoryLayer";
import { MICROAREAS_GEOJSON } from "@/config/microareas.data";
import { usePatientData } from "@/hooks/usePatientData";
import { useMapStore } from "@/stores/mapStore";
import { useFilterStore } from "@/stores/filterStore";
import { LAYER_CONFIG, type LayerId } from "@/config/layers.config";

// Fix default marker icon paths broken by bundlers (webpack/turbopack)
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

import { US_MOAB_CALDAS, DEFAULT_ZOOM } from "@/config/geo.constants";

// US divIcon matching the PoC style
const US_ICON = L.divIcon({
  className: "",
  html: `<div style="display:flex;align-items:center;justify-content:center;width:36px;height:36px;background:#2563eb;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3)">
    <span style="color:white;font-size:10px;font-weight:bold">US</span>
  </div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

export default function MapView() {
  const mapRef = useRef<LeafletMap>(null);
  const spreadsheetId = process.env.NODE_ENV === "development" ? "demo" : "";
  const { data } = usePatientData(spreadsheetId);
  const activeRoute = useMapStore((s) => s.activeRoute);
  const showTerritories = useMapStore((s) => s.showTerritories);
  const setMicroareaFilter = useFilterStore((s) => s.setMicroareaFilter);
  const currentMicroareas = useFilterStore((s) => s.microareas);

  const handleMicroareaClick = useCallback(
    (id: string) => {
      // Toggle: if already filtered to this MA, clear; otherwise set filter
      if (currentMicroareas.length === 1 && currentMicroareas[0] === id) {
        setMicroareaFilter([]);
      } else {
        setMicroareaFilter([id]);
      }
    },
    [currentMicroareas, setMicroareaFilter]
  );

  const layerIds = Object.keys(LAYER_CONFIG) as LayerId[];

  return (
    <>
      <MapContainer
        ref={mapRef}
        center={US_MOAB_CALDAS}
        zoom={DEFAULT_ZOOM}
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={US_MOAB_CALDAS} icon={US_ICON}>
          <Tooltip direction="top" offset={[0, -18]}>
            US Moab Caldas
          </Tooltip>
        </Marker>
        <MapController data={data} />
        {showTerritories && (
          <TerritoryLayer
            geojson={MICROAREAS_GEOJSON}
            onMicroareaClick={handleMicroareaClick}
          />
        )}
        <ClusteredLayer>
          {data &&
            layerIds.map((layerId) => {
              const patients = data[layerId];
              if (!patients || patients.length === 0) return null;
              return (
                <LayerGroup
                  key={layerId}
                  layerId={layerId}
                  patients={patients}
                />
              );
            })}
        </ClusteredLayer>
      </MapContainer>
      <ActiveRouteLayer route={activeRoute} mapRef={mapRef} />
    </>
  );
}
