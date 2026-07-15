/**
 * OSRM Trip endpoint wrapper for multi-stop route optimization (TSP).
 *
 * Uses /trip/v1/driving/ to find optimal visit order.
 * Origin is always the health unit (US Moab Caldas).
 */

import type { RouteResult } from "@/types/routing";
import { OSRM_BASE_URL } from "@/config/constants";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Coord {
  lat: number;
  lng: number;
}

export interface OptimizedRoute {
  /** Indices of waypoints in optimized order (0-based, excludes origin) */
  optimizedOrder: number[];
  /** Total distance in meters */
  totalDistance: number;
  /** Total duration in seconds */
  totalDuration: number;
  /** GeoJSON geometry for the full optimized route */
  geometry: RouteResult["geometry"];
}

// ---------------------------------------------------------------------------
// Optimizer
// ---------------------------------------------------------------------------

/**
 * Optimize visit order for multiple waypoints using OSRM Trip (TSP solver).
 *
 * @param waypoints - Patient locations to visit
 * @param origin - Starting point (US Moab Caldas)
 * @returns Optimized route with order, distance, duration, geometry
 */
export async function optimizeRoute(
  waypoints: Coord[],
  origin: Coord
): Promise<OptimizedRoute> {
  // Build coordinates: origin first, then all waypoints
  // OSRM expects lng,lat order
  const allCoords = [origin, ...waypoints];
  const coordString = allCoords
    .map((c) => `${c.lng},${c.lat}`)
    .join(";");

  const url = `${OSRM_BASE_URL}/trip/v1/driving/${coordString}?roundtrip=false&source=first&geometries=geojson&overview=full`;

  const response = await fetch(url);
  const data = await response.json();

  if (data.code !== "Ok") {
    throw new Error(`OSRM trip error: ${data.code} — ${data.message ?? "unknown"}`);
  }

  const trip = data.trips[0];

  // Extract optimized order (waypoint_index values, excluding origin at 0)
  const optimizedOrder = data.waypoints
    .map((wp: { waypoint_index: number }) => wp.waypoint_index)
    .filter((idx: number) => idx !== 0);

  return {
    optimizedOrder,
    totalDistance: trip.distance,
    totalDuration: trip.duration,
    geometry: trip.geometry,
  };
}
