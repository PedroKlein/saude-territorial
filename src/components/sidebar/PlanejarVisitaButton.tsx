"use client";

import { Route } from "lucide-react";
import { usePlannerStore } from "@/stores/plannerStore";

export function PlanejarVisitaButton() {
  const setDrawerOpen = usePlannerStore((s) => s.setDrawerOpen);

  return (
    <button
      type="button"
      onClick={() => setDrawerOpen(true)}
      className="flex w-full items-center justify-center gap-2 rounded-md bg-brand py-2 text-sm font-medium text-white transition hover:bg-brand-hover active:opacity-90"
    >
      <Route className="h-4 w-4" />
      Planejar visita
    </button>
  );
}
