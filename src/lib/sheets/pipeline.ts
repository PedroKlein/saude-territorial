/**
 * Sheets → Parse → Geocode pipeline.
 *
 * Chains together:
 *  1. batchReadTabs (reads all rows from all tabs in one API call)
 *  2. parseSheetRows (maps Portuguese headers to English fields)
 *  3. geocode with cache (checks Supabase first, falls back to Nominatim)
 *
 * Returns LayeredPatientData ready for the map.
 *
 * LGPD: No patient data is logged. Only tab names and aggregate counts.
 */

import { batchReadTabs } from "@/lib/sheets/client";
import { parseSheetRows } from "@/lib/sheets/parser";
import { geocode } from "@/lib/geocoding/client";
import { getCachedCoordinates, upsertCachedCoordinates } from "@/lib/geocoding/cache";
import { LAYER_CONFIG, type LayerId } from "@/config/layers.config";
import type { NormalizedAddress } from "@/lib/geocoding/types";
import type { PatientRecord, LayeredPatientData } from "@/hooks/usePatientData";

// ---------------------------------------------------------------------------
// Tab name → LayerId mapping
// ---------------------------------------------------------------------------

/** Maps tab labels (from LAYER_CONFIG) to their LayerIds. */
function buildTabToLayerMap(): Map<string, LayerId> {
  const map = new Map<string, LayerId>();
  for (const [id, config] of Object.entries(LAYER_CONFIG)) {
    map.set(config.label.toLowerCase(), id as LayerId);
  }
  return map;
}

const TAB_TO_LAYER = buildTabToLayerMap();

/**
 * Resolves a tab title from Google Sheets to its LayerId.
 * Uses case-insensitive matching.
 */
export function resolveLayerId(tabTitle: string): LayerId | null {
  return TAB_TO_LAYER.get(tabTitle.toLowerCase()) ?? null;
}

// ---------------------------------------------------------------------------
// Geocoding helpers
// ---------------------------------------------------------------------------

/** Confidence string → numeric value for PatientRecord */
function confidenceToNumber(conf: "high" | "medium" | "low"): number {
  switch (conf) {
    case "high": return 0.9;
    case "medium": return 0.6;
    case "low": return 0.3;
  }
}

/**
 * Geocodes a patient's address. Checks Supabase cache first.
 * Returns coordinates or null if geocoding fails entirely.
 */
async function geocodePatient(
  patient: Record<string, unknown>
): Promise<{ lat: number; lng: number; confidence: number } | null> {
  const street = patient.rua as string | null;
  if (!street) return null;

  const addr: NormalizedAddress = {
    street,
    number: (patient.numero as string) ?? null,
    city: "Porto Alegre",
    state: "Rio Grande do Sul",
    country: "br",
  };

  // 1. Check cache
  const cached = await getCachedCoordinates(addr);
  if (cached) {
    return {
      lat: cached.lat,
      lng: cached.lng,
      confidence: confidenceToNumber(cached.confidence),
    };
  }

  // 2. Call Nominatim
  const result = await geocode(addr);
  if (!result) return null;

  // 3. Cache the result
  try {
    await upsertCachedCoordinates(addr, result);
  } catch {
    // Non-fatal: geocoding succeeded, cache write failed
  }

  return {
    lat: result.lat,
    lng: result.lng,
    confidence: confidenceToNumber(result.confidence),
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Runs the full Sheets → Parse → Geocode pipeline.
 *
 * @param auth          - Authenticated googleapis OAuth2 client
 * @param spreadsheetId - Google Sheets spreadsheet ID
 * @returns LayeredPatientData with geocoded coordinates
 */
export async function runSheetsPipeline(
  auth: unknown,
  spreadsheetId: string
): Promise<LayeredPatientData> {
  // 1. Read all tabs
  const layerIds = Object.keys(LAYER_CONFIG) as LayerId[];
  const tabNames = layerIds.map((id) => LAYER_CONFIG[id].label);

  const tabData = await batchReadTabs(auth, spreadsheetId, tabNames);

  // 2. Parse each tab and geocode patients
  const layers: LayeredPatientData = {};

  for (const [tabName, rows] of tabData) {
    const layerId = resolveLayerId(tabName);
    if (!layerId) continue;
    if (rows.length < 2) continue; // Need at least header + 1 data row

    const headers = rows[0];
    const dataRows = rows.slice(1);
    const parsed = parseSheetRows(headers, dataRows);

    // 3. Geocode all patients in this tab
    const patients: PatientRecord[] = [];

    for (const patient of parsed) {
      const cns = patient.cns as string | null;
      if (!cns) continue; // Skip rows without CNS

      const coords = await geocodePatient(patient);
      if (!coords) continue; // Skip patients we can't locate

      patients.push({
        cns,
        nomeCompleto: (patient.nomeCompleto as string) ?? null,
        lat: coords.lat,
        lng: coords.lng,
        confidence: coords.confidence,
        ...patient,
      });
    }

    layers[layerId] = patients;
  }

  return layers;
}
