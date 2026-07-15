"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { MapContainer, TileLayer } from "react-leaflet";
import { useRef } from "react";
import type { Map as LeafletMap } from "leaflet";
import { LayerGroup } from "./LayerGroup";
import { usePatientData } from "@/hooks/usePatientData";
import { LAYER_CONFIG, type LayerId } from "@/config/layers.config";

// Fix default marker icon paths broken by bundlers (webpack/turbopack)
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Center on US Moab Caldas area (where demo patients are)
const US_MOAB_CALDAS: [number, number] = [-30.0730, -51.2200];
const DEFAULT_ZOOM = 15;

export default function MapView() {
  const mapRef = useRef<LeafletMap>(null);
  const spreadsheetId = process.env.NODE_ENV === "development" ? "demo" : "";
  const { data } = usePatientData(spreadsheetId);

  const layerIds = Object.keys(LAYER_CONFIG) as LayerId[];

  return (
    <MapContainer
      ref={mapRef}
      center={US_MOAB_CALDAS}
      zoom={DEFAULT_ZOOM}
      className="h-full w-full"
      key="main-map"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
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
    </MapContainer>
  );
}
