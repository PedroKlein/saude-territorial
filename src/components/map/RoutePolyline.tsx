"use client";

import { Polyline } from "react-leaflet";
import type { RouteResult, RouteProfile } from "@/types/routing";
import type { LatLngExpression } from "leaflet";

interface RoutePolylineProps {
  geometry: RouteResult["geometry"];
  profile: RouteProfile;
}

export function RoutePolyline({ geometry, profile }: RoutePolylineProps) {
  // Convert GeoJSON [lng, lat] to Leaflet [lat, lng]
  const positions: LatLngExpression[] = geometry.coordinates.map(
    ([lng, lat]) => [lat, lng] as LatLngExpression
  );

  const isDashed = profile === "foot";

  return (
    <Polyline
      positions={positions}
      pathOptions={{
        color: "#2563eb",
        weight: 4,
        opacity: 0.8,
        dashArray: isDashed ? "10 6" : undefined,
      }}
    />
  );
}
