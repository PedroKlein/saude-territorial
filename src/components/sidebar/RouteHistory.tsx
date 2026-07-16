"use client";

import { useRouteHistoryStore } from "@/stores/routeHistoryStore";
import { useMapStore } from "@/stores/mapStore";

/**
 * Sidebar section showing recent routes. Click to re-draw without recalculating.
 */
export function RouteHistory() {
  const entries = useRouteHistoryStore((s) => s.entries);
  const clearHistory = useRouteHistoryStore((s) => s.clearHistory);
  const setActiveRoute = useMapStore((s) => s.setActiveRoute);

  if (entries.length === 0) return null;

  return (
    <div className="border-t px-4 py-3">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Rotas recentes
        </h3>
        <button
          onClick={clearHistory}
          className="text-xs text-red-500 hover:text-red-700"
        >
          Limpar
        </button>
      </div>
      <div className="flex flex-col gap-1">
        {entries.map((entry) => {
          const distKm = (entry.distance / 1000).toFixed(1);
          const timeMin = Math.ceil(entry.duration / 60);
          const ago = formatTimeAgo(entry.timestamp);
          const icon = entry.profile === "foot" ? "🚶" : "🚗";

          return (
            <button
              key={entry.id}
              onClick={() =>
                setActiveRoute({
                  result: {
                    distance: entry.distance,
                    duration: entry.duration,
                    geometry: entry.geometry,
                  },
                  profile: entry.profile,
                })
              }
              className="flex items-center justify-between rounded px-2 py-1.5 text-left text-xs hover:bg-gray-50"
            >
              <span className="truncate font-medium">{entry.patientName}</span>
              <span className="shrink-0 text-muted-foreground">
                {icon} {distKm}km • {timeMin}min • {ago}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function formatTimeAgo(timestamp: number): string {
  const diffMin = Math.floor((Date.now() - timestamp) / 60000);
  if (diffMin < 1) return "agora";
  if (diffMin < 60) return `${diffMin}min`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h`;
  return `${Math.floor(diffHours / 24)}d`;
}
