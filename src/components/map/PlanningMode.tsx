"use client";

import { useRoutePlannerStore } from "@/stores/routePlannerStore";
import { CircleMarker, Tooltip } from "react-leaflet";
import { useMemo } from "react";

/**
 * PlanningMode overlay — shows numbered badges on selected waypoints
 * when the route planner is active.
 */
export function PlanningMode() {
  const isPlanning = useRoutePlannerStore((s) => s.isPlanning);
  const waypoints = useRoutePlannerStore((s) => s.waypoints);

  const markers = useMemo(
    () =>
      waypoints.map((wp, idx) => (
        <CircleMarker
          key={`plan-${wp.cns}`}
          center={[wp.lat, wp.lng]}
          radius={14}
          pathOptions={{
            fillColor: "#1d4ed8",
            color: "#fff",
            weight: 3,
            fillOpacity: 0.9,
          }}
        >
          <Tooltip permanent direction="center" className="planning-badge">
            {String(idx + 1)}
          </Tooltip>
        </CircleMarker>
      )),
    [waypoints]
  );

  if (!isPlanning || waypoints.length === 0) return null;

  return <>{markers}</>;
}
