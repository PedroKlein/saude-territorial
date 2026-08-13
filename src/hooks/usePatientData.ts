import { useQuery } from "@tanstack/react-query";
import { create } from "zustand";
import type { LayerId } from "@/config/layers.config";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PatientRecord {
  /** Internal DB UUID (source of truth for mutations). */
  id: string;
  cns: string;
  nomeCompleto: string | null;
  lat: number;
  lng: number;
  /** Geocoding confidence 0-1 (1 = exact match, <0.5 = uncertain) */
  confidence?: number;
  [key: string]: unknown;
}

export type LayeredPatientData = Partial<Record<LayerId, PatientRecord[]>>;

// ---------------------------------------------------------------------------
// Sync metadata store (tracks last successful fetch time)
// ---------------------------------------------------------------------------

interface SyncState {
  lastSyncTime: number | null;
  isSyncing: boolean;
  setLastSync: (time: number) => void;
  setIsSyncing: (syncing: boolean) => void;
}

export const useSyncStore = create<SyncState>()((set) => ({
  lastSyncTime: null,
  isSyncing: false,
  setLastSync: (time) => set({ lastSyncTime: time }),
  setIsSyncing: (syncing) => set({ isSyncing: syncing }),
}));

// ---------------------------------------------------------------------------
// Query Key Factory
// ---------------------------------------------------------------------------

export const patientKeys = {
  all: ["patients"] as const,
};

// ---------------------------------------------------------------------------
// Fetcher
// ---------------------------------------------------------------------------

async function fetchPatientData(): Promise<LayeredPatientData> {
  const res = await fetch("/api/patients");
  if (!res.ok) {
    throw new Error(`Falha ao carregar dados: ${res.status}`);
  }
  const json = await res.json();
  return json.layers as LayeredPatientData;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Progressive-load patient data:
 * - Shows stale cached data immediately (placeholderData / gcTime)
 * - Refetches in background when stale (staleTime: 5min)
 * - Tracks sync time for freshness indicator
 *
 * Fetches from `GET /api/patients`, which returns Drizzle-joined patient
 * rows (base + condition extension) grouped by layer.
 */
export function usePatientData() {
  const setLastSync = useSyncStore((s) => s.setLastSync);
  const setIsSyncing = useSyncStore((s) => s.setIsSyncing);

  return useQuery({
    queryKey: patientKeys.all,
    queryFn: async () => {
      setIsSyncing(true);
      try {
        const data = await fetchPatientData();
        setLastSync(Date.now());
        return data;
      } finally {
        setIsSyncing(false);
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes — show cached instantly, refetch after
    gcTime: 30 * 60 * 1000, // 30 minutes — keep in cache for progressive UX
    refetchOnWindowFocus: true, // Background refresh when user returns to tab
  });
}
