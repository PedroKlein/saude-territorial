"use client";

import { useMapStore } from "@/stores/mapStore";
import type { PatientRecord, LayeredPatientData } from "@/hooks/usePatientData";

interface UnresolvedListProps {
  data: LayeredPatientData | undefined;
}

/**
 * Sidebar section showing patients whose addresses could not be geocoded.
 * Each entry has a "Posicionar" button to enter manual pin mode.
 */
export function UnresolvedList({ data }: UnresolvedListProps) {
  const setPinningPatient = useMapStore((s) => s.setPinningPatient);

  if (!data) return null;

  // Find patients with lat=0, lng=0 (failed geocoding placeholder)
  const unresolved: Array<PatientRecord & { layerId: string }> = [];
  for (const [layerId, patients] of Object.entries(data)) {
    if (!patients) continue;
    for (const p of patients) {
      if (p.lat === 0 && p.lng === 0) {
        unresolved.push({ ...p, layerId });
      }
    }
  }

  if (unresolved.length === 0) return null;

  return (
    <div className="border-t px-4 py-3">
      <h3 className="mb-2 text-sm font-semibold text-muted-foreground">
        📍 Não localizados ({unresolved.length})
      </h3>
      <div className="flex flex-col gap-1">
        {unresolved.map((p) => (
          <div
            key={p.cns}
            className="flex items-center justify-between rounded bg-gray-50 px-2 py-1.5"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium">
                {p.nomeCompleto ?? "Sem nome"}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {(p as Record<string, unknown>).rua as string ?? "Endereço não informado"}
              </p>
            </div>
            <button
              onClick={() =>
                setPinningPatient({ id: p.id, cns: p.cns, nomeCompleto: p.nomeCompleto })
              }
              className="ml-2 shrink-0 rounded bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-800 hover:bg-yellow-200"
            >
              Posicionar
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
