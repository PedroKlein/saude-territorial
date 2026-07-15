/**
 * OSRM routing client.
 *
 * Uses the public OSRM demo server by default.
 * IMPORTANT: OSRM uses [longitude, latitude] order (GeoJSON convention),
 * NOT [lat, lng] (Leaflet convention).
 */

import type { RouteProfile, RouteResult } from "@/types/routing";

const OSRM_BASE_URL =
  process.env.OSRM_BASE_URL ?? "https://router.project-osrm.org";

/** Map our profile names to OSRM profile names */
const OSRM_PROFILE_MAP: Record<RouteProfile, string> = {
  foot: "foot",
  car: "driving",
};

interface Coord {
  lat: number;
  lng: number;
}

/**
 * Calculate a route between two points using OSRM.
 *
 * @param from - Origin coordinate (lat/lng)
 * @param to - Destination coordinate (lat/lng)
 * @param profile - Travel mode: 'foot' or 'car'
 * @returns Route result with distance (m), duration (s), and geometry
 */
export async function getRoute(
  from: Coord,
  to: Coord,
  profile: RouteProfile
): Promise<RouteResult> {
  const osrmProfile = OSRM_PROFILE_MAP[profile];

  // OSRM expects lng,lat order!
  const coordinates = `${from.lng},${from.lat};${to.lng},${to.lat}`;
  const url = `${OSRM_BASE_URL}/route/v1/${osrmProfile}/${coordinates}?overview=full&geometries=geojson`;

  const response = await fetch(url);
  const data = await response.json();

  if (data.code !== "Ok") {
    throw new Error(`OSRM error: ${data.code} — ${data.message ?? "unknown"}`);
  }

  const route = data.routes[0];

  return {
    distance: route.distance,
    duration: route.duration,
    geometry: route.geometry,
  };
}
