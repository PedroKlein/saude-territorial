"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import type { RouteResult, RouteProfile } from "@/types/routing";

interface ActiveRouteLayerProps {
  route: { result: RouteResult; profile: RouteProfile } | null;
  mapRef: React.RefObject<L.Map | null>;
}

/**
 * Renders the active route polyline on the map.
 * Uses a direct mapRef to access the Leaflet map instance.
 */
export function ActiveRouteLayer({ route, mapRef }: ActiveRouteLayerProps) {
  const polylineRef = useRef<L.Polyline | null>(null);

  useEffect(() => {
    // Always clear previous polyline first
    if (polylineRef.current) {
      polylineRef.current.remove();
      polylineRef.current = null;
    }

    const map = mapRef.current;
    if (!route || !map) return;

    // Convert GeoJSON [lng, lat] to Leaflet [lat, lng]
    const positions: L.LatLngExpression[] = route.result.geometry.coordinates.map(
      ([lng, lat]) => [lat, lng] as L.LatLngExpression
    );

    const isDashed = route.profile === "foot";
    const polyline = L.polyline(positions, {
      color: "#2563eb",
      weight: 4,
      opacity: 0.8,
      dashArray: isDashed ? "10 6" : undefined,
    }).addTo(map);

    // Distance/duration tooltip
    const distKm = (route.result.distance / 1000).toFixed(1);
    const timeMin = Math.ceil(route.result.duration / 60);
    const profileIcon = route.profile === "foot" ? "🚶" : "🚗";
    polyline.bindTooltip(`${profileIcon} ${distKm} km • ~${timeMin} min`, {
      permanent: true,
      direction: "center",
      className: "route-label",
    });

    polylineRef.current = polyline;
  }, [route, mapRef]);

  return null;
}
