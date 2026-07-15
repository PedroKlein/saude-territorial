"use client";

import { useMapStore } from "@/stores/mapStore";
import { LAYER_CONFIG, type LayerId } from "@/config/layers.config";
import { useState } from "react";
import { PatientEditPanel } from "./PatientEditPanel";

interface PatientDetailPanelProps {
  /** Patient data grouped by layer */
  layerData?: Partial<Record<LayerId, Array<Record<string, unknown>>>>;
}

export function PatientDetailPanel({ layerData }: PatientDetailPanelProps) {
  const selectedPatient = useMapStore((s) => s.selectedPatient);
  const setSelectedPatient = useMapStore((s) => s.setSelectedPatient);
  const [isEditing, setIsEditing] = useState(false);

  if (!selectedPatient) return null;

  // Find patient data across all layers
  let patientData: Record<string, unknown> | null = null;
  let patientLayer: LayerId | null = null;

  if (layerData) {
    for (const [layerId, patients] of Object.entries(layerData)) {
      const found = patients?.find((p) => p.cns === selectedPatient);
      if (found) {
        patientData = found;
        patientLayer = layerId as LayerId;
        break;
      }
    }
  }

  const visibleColumns = patientLayer
    ? LAYER_CONFIG[patientLayer].visibleColumns
    : [];

  if (isEditing && patientData) {
    return (
      <PatientEditPanel
        patient={patientData}
        columns={visibleColumns}
        onCancel={() => setIsEditing(false)}
        onSaved={() => setIsEditing(false)}
      />
    );
  }

  return (
    <aside className="absolute right-0 top-0 z-[1000] h-full w-80 overflow-y-auto border-l bg-white p-4 shadow-lg">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Detalhes do Paciente</h2>
        <button
          onClick={() => setSelectedPatient(null)}
          className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
          aria-label="Fechar"
        >
          ✕
        </button>
      </div>

      {!patientData ? (
        <p className="text-sm text-muted-foreground">
          Dados não encontrados para CNS: {selectedPatient}
        </p>
      ) : (
        <>
          <dl className="space-y-2">
            {visibleColumns.map((col) => {
              const value = patientData![col];
              return (
                <div key={col}>
                  <dt className="text-xs font-medium uppercase text-muted-foreground">
                    {col}
                  </dt>
                  <dd className="text-sm">
                    {value != null ? String(value) : "—"}
                  </dd>
                </div>
              );
            })}
          </dl>

          <div className="mt-6 flex gap-2">
            <button
              onClick={() => setIsEditing(true)}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
            >
              Editar
            </button>
            <button
              className="rounded-md border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-gray-50"
              disabled
              title="Disponível na próxima versão"
            >
              Traçar rota
            </button>
          </div>
        </>
      )}
    </aside>
  );
}
