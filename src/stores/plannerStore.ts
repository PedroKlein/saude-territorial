import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { LayerId } from "@/config/layers.config";
import type { AlertLevel } from "@/types/alerts";
import type { RouteResult } from "@/types/routing";

// Max stops per plan — cognitive-load ceiling for ACS home visits + OSRM request-size safety
export const PLAN_LIMIT = 12;

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
  /** True while the user is picking stops directly on the map. Not persisted. */
  mapSelectMode: boolean;
  /** Show the over-limit alert banner in the drawer. Not persisted. */
  limitBannerVisible: boolean;
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
  /** Toggle map-select mode on/off. */
  setMapSelectMode(v: boolean): void;
  /** Toggle the over-limit alert banner. */
  setLimitBannerVisible(v: boolean): void;
  /**
   * Bulk-add up to `PLAN_LIMIT - stops.length` new ids (deduped).
   * Returns how many were actually appended.
   */
  addStopsUpTo(ids: string[]): number;
  /**
   * Add a single stop only if the plan is below PLAN_LIMIT.
   * Returns true when the stop was added, false when rejected.
   */
  addStopIfBelowLimit(id: string): boolean;
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
      mapSelectMode: false,
      limitBannerVisible: false,

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

      setMapSelectMode: (v) => set({ mapSelectMode: v }),

      setLimitBannerVisible: (v) => set({ limitBannerVisible: v }),

      addStopsUpTo: (ids) => {
        let added = 0;
        set((s) => {
          const remaining = PLAN_LIMIT - s.stops.length;
          if (remaining <= 0) return { limitBannerVisible: true };
          const existing = new Set(s.stops.map((st) => st.patientId));
          const newIds = ids.filter((id) => !existing.has(id)).slice(0, remaining);
          if (newIds.length === 0) return s;
          added = newIds.length;
          const newStops = [
            ...s.stops,
            ...newIds.map((id, i) => ({ patientId: id, order: s.stops.length + i + 1 })),
          ];
          return { stops: newStops, route: null };
        });
        return added;
      },

      addStopIfBelowLimit: (id) => {
        let wasAdded = false;
        set((s) => {
          if (s.stops.length >= PLAN_LIMIT) return { limitBannerVisible: true };
          if (s.stops.some((st) => st.patientId === id)) return s;
          wasAdded = true;
          return {
            stops: [...s.stops, { patientId: id, order: s.stops.length + 1 }],
            route: null,
          };
        });
        return wasAdded;
      },
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
