import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { LayerId } from "@/config/layers.config";
import type { AlertLevel } from "@/types/alerts";
import type { RouteResult } from "@/types/routing";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A single ordered stop in the daily plan. */
export interface Stop {
  patientId: string;
  order: number; // 1-indexed display order
}

export interface PlannerFilters {
  microarea: string[];
  conditions: LayerId[];
  alertLevels: AlertLevel[];
}

interface PlannerState {
  drawerOpen: boolean;
  stops: Stop[];
  profile: "foot" | "car";
  filters: PlannerFilters;
  route: RouteResult | null;
  /** Set when a saved plan is loaded from the API. */
  planId: string | null;
}

interface PlannerActions {
  setDrawerOpen(open: boolean): void;
  addStop(patientId: string): void;
  removeStop(patientId: string): void;
  reorderStops(fromIndex: number, toIndex: number): void;
  setStops(stops: Stop[]): void;
  setProfile(p: "foot" | "car"): void;
  setFilters(next: Partial<PlannerFilters>): void;
  setRoute(r: RouteResult | null): void;
  loadPlan(plan: { id: string; stops: Stop[]; profile: "foot" | "car" }): void;
  clear(): void;
}

type PlannerStore = PlannerState & PlannerActions;

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULT_FILTERS: PlannerFilters = {
  microarea: [],
  conditions: [],
  alertLevels: [],
};

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const usePlannerStore = create<PlannerStore>()(
  persist(
    (set) => ({
      // state
      drawerOpen: false,
      stops: [],
      profile: "foot",
      filters: DEFAULT_FILTERS,
      route: null,
      planId: null,

      // actions
      setDrawerOpen: (open) => set({ drawerOpen: open }),

      addStop: (patientId) =>
        set((s) => {
          if (s.stops.some((st) => st.patientId === patientId)) return s;
          const nextOrder = s.stops.length + 1;
          return { stops: [...s.stops, { patientId, order: nextOrder }], route: null };
        }),

      removeStop: (patientId) =>
        set((s) => {
          const updated = s.stops
            .filter((st) => st.patientId !== patientId)
            .map((st, i) => ({ ...st, order: i + 1 }));
          return { stops: updated, route: null };
        }),

      reorderStops: (fromIndex, toIndex) =>
        set((s) => {
          const updated = [...s.stops];
          const [moved] = updated.splice(fromIndex, 1);
          updated.splice(toIndex, 0, moved);
          return {
            stops: updated.map((st, i) => ({ ...st, order: i + 1 })),
            route: null,
          };
        }),

      setStops: (stops) => set({ stops, route: null, planId: null }),

      setProfile: (profile) => set({ profile, route: null }),

      setFilters: (next) =>
        set((s) => ({ filters: { ...s.filters, ...next } })),

      setRoute: (route) => set({ route }),

      loadPlan: ({ id, stops, profile }) =>
        set({ planId: id, stops, profile, route: null }),

      clear: () =>
        set({
          stops: [],
          route: null,
          planId: null,
          filters: DEFAULT_FILTERS,
        }),
    }),
    {
      name: "saude-territorial-planner",
      // drawerOpen is session-only — do NOT persist it.
      partialize: (s) => ({
        stops: s.stops,
        profile: s.profile,
        filters: s.filters,
      }),
    },
  ),
);
