"use client";

import { useMemo, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { usePatientData, type PatientRecord } from "@/hooks/usePatientData";
import type { LayerId } from "@/config/layers.config";
import {
  PatientWizard,
  type PatientWizardMode,
} from "@/components/wizard/PatientWizard";
import { PatientTable } from "./PatientTable";
import { QualityView } from "./QualityView";

export type UnifiedPatient = {
  conditions: LayerId[];
  dataUltimaAtualizacao: string | null;
} & PatientRecord

export default function PacientesPage() {
  const { data, isLoading, isError } = usePatientData();
  const [wizardMode, setWizardMode] = useState<PatientWizardMode | null>(null);

  const patients = useMemo<UnifiedPatient[]>(() => {
    if (!data) return [];
    const map = new Map<string, UnifiedPatient>();

    for (const [layerId, records] of Object.entries(data) as [LayerId, PatientRecord[]][]) {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- cast as [LayerId, PatientRecord[]][] strips undefined but Partial<Record<...>> values can be undefined at runtime
      if (!records) continue;
      for (const p of records) {
        const existing = map.get(p.id);
        if (existing) {
          if (!existing.conditions.includes(layerId)) {
            existing.conditions.push(layerId);
          }
          // Keep the most recent dataUltimaAtualizacao
          const newDate = (p as Record<string, unknown>).dataUltimaAtualizacao as string | null | undefined;
          if (newDate && (!existing.dataUltimaAtualizacao || newDate > existing.dataUltimaAtualizacao)) {
            existing.dataUltimaAtualizacao = newDate;
          }
        } else {
          map.set(p.id, {
            ...p,
            conditions: [layerId],
            dataUltimaAtualizacao: ((p as Record<string, unknown>).dataUltimaAtualizacao as string | null) ?? null,
          });
        }
      }
    }

    return Array.from(map.values());
  }, [data]);

  return (
    <div className="h-full overflow-auto bg-gray-50">
      <div className="max-w-6xl mx-auto p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-foreground">Pacientes</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Visão completa dos cadastros.
          </p>
        </div>

        {isError && (
          <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            Falha ao carregar dados dos pacientes. Tente recarregar a página.
          </div>
        )}

        <Tabs defaultValue="lista">
          <TabsList className="mb-4">
            <TabsTrigger value="lista">Lista</TabsTrigger>
            <TabsTrigger value="qualidade">Qualidade dos dados</TabsTrigger>
          </TabsList>

          <TabsContent value="lista">
            <PatientTable
              patients={patients}
              isLoading={isLoading}
              onEdit={(p) =>
                { setWizardMode({ kind: "edit", patientId: p.id, patient: p }); }
              }
            />
          </TabsContent>

          <TabsContent value="qualidade">
            <QualityView
              patients={patients}
              isLoading={isLoading}
              onEdit={(patientId) => {
                const p = patients.find((pt) => pt.id === patientId);
                if (p) setWizardMode({ kind: "edit", patientId: p.id, patient: p });
              }}
            />
          </TabsContent>
        </Tabs>
      </div>

      {wizardMode && (
        <PatientWizard
          open
          mode={wizardMode}
          onClose={() => { setWizardMode(null); }}
        />
      )}
    </div>
  );
}
