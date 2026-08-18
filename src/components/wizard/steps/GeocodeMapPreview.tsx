"use client";

/**
 * GeocodeMapPreview - tiny react-leaflet MapContainer used inside StepEndereco.
 * Dynamically imported to avoid SSR issues with leaflet.
 *
 * When `onPickCoords` is supplied the map becomes interactive: clicking drops
 * the pin and dragging the marker repositions it.
 */

import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default icon paths broken by bundlers
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

type Coords = { lat: number; lng: number }

/** Must render inside <MapContainer>. Fires onPickCoords on every map click. */
function PickHandler({ onPickCoords }: { onPickCoords: (c: Coords) => void }) {
  useMapEvents({
    click(e) {
      onPickCoords({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

export default function GeocodeMapPreview({
  lat,
  lng,
  onPickCoords,
}: {
  lat: number;
  lng: number;
  onPickCoords?: (c: Coords) => void;
}) {
  const interactive = Boolean(onPickCoords);
  return (
    <div
      className="h-[200px] overflow-hidden rounded-lg border border-neutral-200"
      style={interactive ? { cursor: "crosshair" } : undefined}
    >
      <MapContainer
        center={[lat, lng]}
        zoom={16}
        className="h-full w-full"
        zoomControl={false}
        dragging={interactive}
        scrollWheelZoom={interactive}
        doubleClickZoom={false}
        touchZoom={interactive}
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          subdomains="abcd"
        />
        {onPickCoords && <PickHandler onPickCoords={onPickCoords} />}
        <Marker
          position={[lat, lng]}
          draggable={interactive}
          eventHandlers={
            onPickCoords
              ? {
                  dragend(e) {
                    const marker = e.target as L.Marker;
                    const pos = marker.getLatLng();
                    onPickCoords({ lat: pos.lat, lng: pos.lng });
                  },
                }
              : {}
          }
        />
      </MapContainer>
    </div>
  );
}
