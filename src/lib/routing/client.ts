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

export interface Coord {
  lat: number;
  lng: number;
}

/**
 * Calculate a route through an ordered list of waypoints using OSRM.
 *
 * @param waypoints - Ordered coordinates (min 2). Route follows the sequence.
 * @param profile - Travel mode: 'foot' or 'car'
 * @returns Route result with distance (m), duration (s), and geometry
 */
export async function getRoute(
  waypoints: Coord[],
  profile: RouteProfile,
): Promise<RouteResult> {
  if (waypoints.length < 2) {
    throw new Error("getRoute requires at least 2 waypoints");
  }

  const osrmProfile = OSRM_PROFILE_MAP[profile];

  // OSRM expects lng,lat order and semicolon-separated coordinates.
  const coordinates = waypoints
    .map((w) => `${w.lng},${w.lat}`)
    .join(";");
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
