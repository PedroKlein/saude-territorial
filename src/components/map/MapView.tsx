"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { MapContainer, TileLayer } from "react-leaflet";
import { useRef } from "react";
import type { Map as LeafletMap } from "leaflet";

// Fix default marker icon paths broken by bundlers (webpack/turbopack)
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const PORTO_ALEGRE_CENTER: [number, number] = [-30.0346, -51.2177];
const DEFAULT_ZOOM = 14;

export default function MapView() {
  const mapRef = useRef<LeafletMap>(null);

  return (
    <MapContainer
      ref={mapRef}
      center={PORTO_ALEGRE_CENTER}
      zoom={DEFAULT_ZOOM}
      className="h-full w-full"
      key="main-map"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
    </MapContainer>
  );
}
