"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, Tooltip } from "react-leaflet";
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

// US Moab Caldas location (verified via Nominatim/OSM)
export const US_MOAB_CALDAS: [number, number] = [-30.0692745, -51.2166063];
const DEFAULT_ZOOM = 15;

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
      <Marker position={US_MOAB_CALDAS} icon={US_ICON}>
        <Tooltip direction="top" offset={[0, -18]}>
          US Moab Caldas
        </Tooltip>
      </Marker>
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
