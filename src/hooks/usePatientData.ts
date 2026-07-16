import { useQuery } from "@tanstack/react-query";
import { create } from "zustand";
import type { LayerId } from "@/config/layers.config";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PatientRecord {
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
  bySheet: (spreadsheetId: string) =>
    [...patientKeys.all, spreadsheetId] as const,
};

// ---------------------------------------------------------------------------
// Fetcher
// ---------------------------------------------------------------------------

async function fetchPatientData(
  spreadsheetId: string
): Promise<LayeredPatientData> {
  // Demo mode: use synthetic data endpoint
  const isDemo = spreadsheetId === "demo";
  const url = isDemo
    ? "/api/sheets/demo"
    : `/api/sheets?spreadsheetId=${spreadsheetId}&mode=full`;

  const res = await fetch(url);
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
 * Pass spreadsheetId="demo" to use synthetic data without Google Sheets.
 */
export function usePatientData(spreadsheetId: string) {
  const setLastSync = useSyncStore((s) => s.setLastSync);
  const setIsSyncing = useSyncStore((s) => s.setIsSyncing);

  return useQuery({
    queryKey: patientKeys.bySheet(spreadsheetId),
    queryFn: async () => {
      setIsSyncing(true);
      try {
        const data = await fetchPatientData(spreadsheetId);
        setLastSync(Date.now());
        return data;
      } finally {
        setIsSyncing(false);
      }
    },
    enabled: !!spreadsheetId,
    staleTime: 5 * 60 * 1000, // 5 minutes — show cached instantly, refetch after
    gcTime: 30 * 60 * 1000, // 30 minutes — keep in cache for progressive UX
    refetchOnWindowFocus: true, // Background refresh when user returns to tab
  });
}
