"use client";

/**
 * GeocodeMapPreview — tiny react-leaflet MapContainer used inside StepEndereco.
 * Dynamically imported to avoid SSR issues with leaflet.
 */

import { MapContainer, TileLayer, Marker } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default icon paths broken by bundlers
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

export default function GeocodeMapPreview({
  lat,
  lng,
}: {
  lat: number;
  lng: number;
}) {
  return (
    <div className="h-[200px] overflow-hidden rounded-lg border border-neutral-200">
      <MapContainer
        center={[lat, lng]}
        zoom={16}
        className="h-full w-full"
        zoomControl={false}
        dragging={false}
        scrollWheelZoom={false}
        doubleClickZoom={false}
        touchZoom={false}
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          subdomains="abcd"
        />
        <Marker position={[lat, lng]} />
      </MapContainer>
    </div>
  );
}
