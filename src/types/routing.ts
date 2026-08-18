/**
 * Routing types for OSRM integration.
 */

/** Travel profile for route calculation */
export type RouteProfile = "foot" | "car";

/** Result from OSRM route calculation */
export type RouteResult = {
  /** Total route distance in meters */
  distance: number;
  /** Total route duration in seconds */
  duration: number;
  /** GeoJSON LineString geometry for rendering on map */
  geometry: {
    type: "LineString";
    coordinates: [number, number][];
  };
}
