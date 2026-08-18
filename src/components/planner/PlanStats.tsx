"use client";

import type { RouteResult } from "@/types/routing";

type PlanStatsProps = {
  route: RouteResult | null;
  stopCount: number;
}

export function PlanStats({ route, stopCount }: PlanStatsProps) {
  const distLabel = route
    ? `${(route.distance / 1000).toFixed(1)} km`
    : "—";

  const timeLabel = route
    ? `${Math.ceil(route.duration / 60)} min`
    : "—";

  return (
    <div className="grid grid-cols-3 gap-2 text-center">
      <div className="rounded-md bg-neutral-50 px-2 py-1.5">
        <div className="text-lg font-semibold text-neutral-900">{stopCount}</div>
        <div className="text-[10px] uppercase tracking-wider text-neutral-500">Visitas</div>
      </div>
      <div className="rounded-md bg-neutral-50 px-2 py-1.5">
        <div className="text-lg font-semibold text-neutral-900">{distLabel}</div>
        <div className="text-[10px] uppercase tracking-wider text-neutral-500">Distância</div>
      </div>
      <div className="rounded-md bg-neutral-50 px-2 py-1.5">
        <div className="text-lg font-semibold text-neutral-900">{timeLabel}</div>
        <div className="text-[10px] uppercase tracking-wider text-neutral-500">Tempo</div>
      </div>
    </div>
  );
}
