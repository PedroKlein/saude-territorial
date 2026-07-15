"use client";

import { useRoutePlannerStore } from "@/stores/routePlannerStore";
import { optimizeRoute } from "@/lib/routing/optimizer";
import { formatDistance, formatDuration } from "@/lib/routing/format";
import { US_MOAB_CALDAS } from "@/config/constants";
import { useState } from "react";

/**
 * Day planner panel — shows selected waypoints, optimizes route order.
 * Appears when planning mode is active and waypoints are selected.
 */
export function DayPlanner() {
  const waypoints = useRoutePlannerStore((s) => s.waypoints);
  const optimizedRoute = useRoutePlannerStore((s) => s.optimizedRoute);
  const removeWaypoint = useRoutePlannerStore((s) => s.removeWaypoint);
  const clearPlan = useRoutePlannerStore((s) => s.clearPlan);
  const setOptimizedRoute = useRoutePlannerStore((s) => s.setOptimizedRoute);

  const [isOptimizing, setIsOptimizing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleOptimize() {
    if (waypoints.length < 2) return;

    setIsOptimizing(true);
    setError(null);

    try {
      const result = await optimizeRoute(
        waypoints.map((w) => ({ lat: w.lat, lng: w.lng })),
        US_MOAB_CALDAS
      );

      setOptimizedRoute({
        distance: result.totalDistance,
        duration: result.totalDuration,
        geometry: result.geometry,
      });
    } catch {
      setError("Erro ao otimizar rota. Tente novamente.");
    } finally {
      setIsOptimizing(false);
    }
  }

  if (waypoints.length === 0) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        <p>Clique nos marcadores para adicionar paradas ao roteiro.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 p-4">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Roteiro de Visitas
      </h3>

      {/* Waypoint list */}
      <ol className="flex flex-col gap-1">
        {waypoints.map((wp, idx) => (
          <li
            key={wp.cns}
            className="flex items-center gap-2 rounded-md bg-gray-50 px-3 py-2 text-sm"
          >
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
              {idx + 1}
            </span>
            <span className="flex-1 truncate">{wp.name}</span>
            <button
              onClick={() => removeWaypoint(wp.cns)}
              className="text-xs text-red-500 hover:text-red-700"
              title="Remover"
            >
              ✕
            </button>
          </li>
        ))}
      </ol>

      {/* Optimized route summary */}
      {optimizedRoute && (
        <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm">
          <p className="font-medium text-green-800">Rota otimizada</p>
          <p className="text-green-700">
            {formatDistance(optimizedRoute.distance)} •{" "}
            {formatDuration(optimizedRoute.duration)}
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={handleOptimize}
          disabled={waypoints.length < 2 || isOptimizing}
          className="flex-1 rounded-md bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
        >
          {isOptimizing ? "Otimizando..." : "Otimizar rota"}
        </button>
        <button
          onClick={clearPlan}
          className="rounded-md border px-3 py-2 text-sm text-muted-foreground hover:bg-gray-50"
        >
          Limpar
        </button>
      </div>
    </div>
  );
}
