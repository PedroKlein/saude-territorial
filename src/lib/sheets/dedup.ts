/**
 * CNS deduplication across sheet layers.
 *
 * Patients may appear in multiple tabs (e.g. a pregnant woman who also
 * has diabetes). This module merges them by CNS and surfaces conflicts
 * when the same field has different values across tabs.
 *
 * LGPD: This runs client-side on already-fetched data. No logging of PII.
 */

import type { PatientRecord } from "@/hooks/usePatientData";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MergedPatient extends PatientRecord {
  /** Which layers (tabs) this patient appears in */
  layers: string[];
}

export interface DetectedConflict {
  /** Patient CNS */
  cns: string;
  /** Field name with conflicting values */
  field: string;
  /** Layer → value mapping for the conflicting field */
  values: Record<string, unknown>;
}

export interface DeduplicationResult {
  merged: MergedPatient[];
  conflicts: DetectedConflict[];
}

// Fields to check for conflicts (skip lat/lng/layers as those can reasonably differ)
const CONFLICT_CHECK_FIELDS = ["nomeCompleto", "dataNascimento", "telefone"];

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

/**
 * Deduplicate patients across layers by CNS.
 *
 * @param layers - Record of layerId → PatientRecord[] (from usePatientData)
 * @returns Merged patients and any detected conflicts
 */
export function deduplicatePatients(
  layers: Record<string, PatientRecord[]>
): DeduplicationResult {
  // Group all patient records by CNS
  const byCns = new Map<string, { layerId: string; record: PatientRecord }[]>();

  for (const [layerId, patients] of Object.entries(layers)) {
    for (const patient of patients) {
      if (!patient.cns) continue;
      const existing = byCns.get(patient.cns) ?? [];
      existing.push({ layerId, record: patient });
      byCns.set(patient.cns, existing);
    }
  }

  const merged: MergedPatient[] = [];
  const conflicts: DetectedConflict[] = [];

  for (const [cns, entries] of byCns) {
    // Use the first entry as the base data
    const base = entries[0].record;
    const layerIds = entries.map((e) => e.layerId);

    const mergedPatient: MergedPatient = {
      ...base,
      layers: layerIds,
    };
    merged.push(mergedPatient);

    // Check for conflicts across entries
    if (entries.length > 1) {
      for (const field of CONFLICT_CHECK_FIELDS) {
        const valuesByLayer: Record<string, unknown> = {};
        let hasConflict = false;
        let firstValue: unknown = undefined;
        let firstSeen = false;

        for (const entry of entries) {
          const val = entry.record[field] ?? null;
          valuesByLayer[entry.layerId] = val;

          if (!firstSeen) {
            firstValue = val;
            firstSeen = true;
          } else if (String(val) !== String(firstValue)) {
            hasConflict = true;
          }
        }

        if (hasConflict) {
          conflicts.push({ cns, field, values: valuesByLayer });
        }
      }
    }
  }

  return { merged, conflicts };
}
