export type RouteProfile = "foot" | "car";

export type RouteResult = {
  /** Total route distance in meters */
  distance: number;
  /** Total route duration in seconds */
  duration: number;
  geometry: {
    type: "LineString";
    coordinates: [number, number][];
  };
}
