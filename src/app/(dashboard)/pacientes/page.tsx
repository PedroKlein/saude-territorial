"use client";

import { useMemo } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { usePatientData, type PatientRecord } from "@/hooks/usePatientData";
import type { LayerId } from "@/config/layers.config";
import { PatientTable } from "./PatientTable";
import { QualityView } from "./QualityView";

// ---------------------------------------------------------------------------
// Unified patient: one row per unique id, conditions = all layers it appears in.
// ---------------------------------------------------------------------------

export interface UnifiedPatient extends PatientRecord {
  conditions: LayerId[];
  dataUltimaAtualizacao: string | null;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function PacientesPage() {
  const { data, isLoading, isError } = usePatientData();

  const patients = useMemo<UnifiedPatient[]>(() => {
    if (!data) return [];
    const map = new Map<string, UnifiedPatient>();

    for (const [layerId, records] of Object.entries(data) as [LayerId, PatientRecord[]][]) {
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
            <PatientTable patients={patients} isLoading={isLoading} />
          </TabsContent>

          <TabsContent value="qualidade">
            <QualityView patients={patients} isLoading={isLoading} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
