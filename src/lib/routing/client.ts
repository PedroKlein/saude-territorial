/**
 * OSRM routing client.
 *
 * Uses the public OSRM demo server by default.
 * IMPORTANT: OSRM uses [longitude, latitude] order (GeoJSON convention),
 * NOT [lat, lng] (Leaflet convention).
 */

import type { RouteProfile, RouteResult } from "@/types/routing";

/** Minimal OSRM response shapes for the route and trip endpoints. */
type OsrmRoute = {
  distance: number;
  duration: number;
  geometry: RouteResult["geometry"];
};

type OsrmRouteResponse = {
  code: string;
  message?: string;
  routes: OsrmRoute[];
};

type OsrmWaypoint = {
  waypoint_index: number;
  name: string;
  location: [number, number];
  trips_index: number;
};

type OsrmTripRoute = {
  distance: number;
  duration: number;
  geometry: RouteResult["geometry"];
};

type OsrmTripResponse = {
  code: string;
  message?: string;
  trips: OsrmTripRoute[];
  waypoints: OsrmWaypoint[];
};

const OSRM_BASE_URL =
  process.env.OSRM_BASE_URL ?? "https://router.project-osrm.org";

const OSRM_PROFILE_MAP: Record<RouteProfile, string> = {
  foot: "foot",
  car: "driving",
};

export type Coord = {
  lat: number;
  lng: number;
}

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
  const data = (await response.json() as unknown) as OsrmRouteResponse;

  if (data.code !== "Ok") {
    throw new Error(`OSRM error: ${data.code} — ${data.message ?? "unknown"}`);
  }

  const route = data.routes[0];

  // OSRM demo server (router.project-osrm.org) only runs the driving
  // profile; a `foot` request URL returns driving-time results verbatim.
  // Verified by hand: same distance/duration for both. When our caller
  // asked for foot, override the duration using a realistic walking
  // speed so the UI reflects the profile choice.
  //
  // 4.5 km/h assumes flat-ish urban terrain with occasional stops at
  // doors/gates during ACS visits. If we later host our own OSRM with
  // the foot profile enabled, drop the override and trust the response.
  const WALKING_SPEED_MPS = 4500 / 3600; // 1.25 m/s
  const duration =
    profile === "foot" ? route.distance / WALKING_SPEED_MPS : route.duration;

  return {
    distance: route.distance,
    duration,
    geometry: route.geometry,
  };
}

/**
 * Result of an OSRM /trip call: the input-order indices in the OPTIMIZED
 * visit order. Callers should reorder their stop list by `order[i]`.
 *
 * The trip service is a heuristic TSP solver — good for <= ~25 stops which
 * is well within ACS-visit-plan scale.
 */
export type TripResult = {
  /**
   * Permutation of input indices in optimized order. `order[0]` = index of
   * the stop that should be visited first, etc.
   */
  order: number[];
  /** Total optimized distance in meters. */
  distance: number;
  /** Total optimized duration in seconds (recomputed for foot below). */
  duration: number;
  /** GeoJSON LineString for the whole optimized trip. */
  geometry: RouteResult["geometry"];
}

/**
 * Ask OSRM to reorder waypoints for minimum travel time. Uses
 * `roundtrip=false` with source=first and destination=last so the caller's
 * first stop stays first and the last stays last — the middle is optimized.
 * If callers want a fully-free permutation, swap to `source=any&destination=any`.
 */
export async function getTrip(
  waypoints: Coord[],
  profile: RouteProfile,
): Promise<TripResult> {
  if (waypoints.length < 3) {
    // Nothing to optimize with < 3 stops (first and last are fixed).
    throw new Error("getTrip requires at least 3 waypoints");
  }

  const osrmProfile = OSRM_PROFILE_MAP[profile];
  const coordinates = waypoints.map((w) => `${w.lng},${w.lat}`).join(";");
  const url =
    `${OSRM_BASE_URL}/trip/v1/${osrmProfile}/${coordinates}` +
    `?source=first&destination=last&roundtrip=false&overview=full&geometries=geojson`;

  const response = await fetch(url);
  const data = (await response.json() as unknown) as OsrmTripResponse;

  if (data.code !== "Ok") {
    throw new Error(`OSRM trip error: ${data.code} — ${data.message ?? "unknown"}`);
  }

  // `waypoints[i].waypoint_index` = the position in the optimized order for
  // the INPUT-order coordinate i. Invert to `order[j] = i` where the j-th
  // stop to visit is input index i.
  const wps = data.waypoints;
  const order = new Array<number>(wps.length).fill(0);
  wps.forEach((wp, inputIdx) => {
    order[wp.waypoint_index] = inputIdx;
  });

  const trip = data.trips[0];

  // Same foot-profile override as getRoute: the demo OSRM ignores `foot`.
  const WALKING_SPEED_MPS = 4500 / 3600;
  const duration =
    profile === "foot" ? trip.distance / WALKING_SPEED_MPS : trip.duration;

  return {
    order,
    distance: trip.distance,
    duration,
    geometry: trip.geometry,
  };
}
