import { useQuery } from "@tanstack/react-query";
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
    : `/api/sheets?spreadsheetId=${spreadsheetId}`;

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
 * Fetches patient data grouped by layer.
 * Pass spreadsheetId="demo" to use synthetic data without Google Sheets.
 */
export function usePatientData(spreadsheetId: string) {
  return useQuery({
    queryKey: patientKeys.bySheet(spreadsheetId),
    queryFn: () => fetchPatientData(spreadsheetId),
    enabled: !!spreadsheetId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
