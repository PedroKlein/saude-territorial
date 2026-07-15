import { create } from "zustand";
import type { RouteResult } from "@/types/routing";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Waypoint {
  cns: string;
  lat: number;
  lng: number;
  name: string;
}

interface RoutePlannerState {
  waypoints: Waypoint[];
  optimizedRoute: RouteResult | null;
  isPlanning: boolean;
}

interface RoutePlannerActions {
  addWaypoint: (wp: Waypoint) => void;
  removeWaypoint: (cns: string) => void;
  reorderWaypoints: (fromIndex: number, toIndex: number) => void;
  clearPlan: () => void;
  setOptimizedRoute: (route: RouteResult | null) => void;
  togglePlanningMode: () => void;
}

type RoutePlannerStore = RoutePlannerState & RoutePlannerActions;

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useRoutePlannerStore = create<RoutePlannerStore>()((set) => ({
  waypoints: [],
  optimizedRoute: null,
  isPlanning: false,

  addWaypoint: (wp) =>
    set((state) => {
      // Prevent duplicates
      if (state.waypoints.some((w) => w.cns === wp.cns)) return state;
      return { waypoints: [...state.waypoints, wp], optimizedRoute: null };
    }),

  removeWaypoint: (cns) =>
    set((state) => ({
      waypoints: state.waypoints.filter((w) => w.cns !== cns),
      optimizedRoute: null,
    })),

  reorderWaypoints: (fromIndex, toIndex) =>
    set((state) => {
      const updated = [...state.waypoints];
      const [moved] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, moved);
      return { waypoints: updated, optimizedRoute: null };
    }),

  clearPlan: () => set({ waypoints: [], optimizedRoute: null }),

  setOptimizedRoute: (route) => set({ optimizedRoute: route }),

  togglePlanningMode: () =>
    set((state) => ({ isPlanning: !state.isPlanning })),
}));
