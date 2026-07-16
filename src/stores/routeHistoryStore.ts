"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { RouteResult, RouteProfile } from "@/types/routing";

export interface RouteHistoryEntry {
  id: string;
  patientName: string;
  patientCns: string;
  profile: RouteProfile;
  distance: number;
  duration: number;
  geometry: RouteResult["geometry"];
  timestamp: number;
}

interface RouteHistoryState {
  entries: RouteHistoryEntry[];
}

interface RouteHistoryActions {
  addEntry: (entry: Omit<RouteHistoryEntry, "id" | "timestamp">) => void;
  clearHistory: () => void;
}

type RouteHistoryStore = RouteHistoryState & RouteHistoryActions;

const MAX_ENTRIES = 10;

export const useRouteHistoryStore = create<RouteHistoryStore>()(persist(
  (set) => ({
    entries: [],

    addEntry: (entry) =>
      set((state) => {
        const newEntry: RouteHistoryEntry = {
          ...entry,
          id: crypto.randomUUID(),
          timestamp: Date.now(),
        };
        const updated = [newEntry, ...state.entries].slice(0, MAX_ENTRIES);
        return { entries: updated };
      }),

    clearHistory: () => set({ entries: [] }),
  }),
  { name: "saude-territorial-route-history" }
));
