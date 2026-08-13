"use client";

import { useState } from "react";
import type { ExtensionLayer } from "@/lib/patients/schemas";
import { useDeletePatient, useDeleteCondition } from "@/hooks/useDeletePatient";
import { ConfirmDialog } from "@/components/panels/ConfirmDialog";

import { LAYER_CONFIG, type LayerId } from "@/config/layers.config";
import { useMapStore } from "@/stores/mapStore";
import { useRouteHistoryStore } from "@/stores/routeHistoryStore";
import { US_MOAB_CALDAS } from "@/config/geo.constants";
import type { RouteResult, RouteProfile } from "@/types/routing";
import { PatientEditForm } from "@/components/panels/PatientEditForm";

interface PatientDetailPanelProps {
  /** Patient data grouped by layer */
  layerData?: Partial<Record<LayerId, Array<Record<string, unknown>>>>;
}

export function PatientDetailPanel({ layerData }: PatientDetailPanelProps) {
  const selectedPatient = useMapStore((s) => s.selectedPatient);
  const setSelectedPatient = useMapStore((s) => s.setSelectedPatient);
  const setActiveRoute = useMapStore((s) => s.setActiveRoute);
  const setPinningPatient = useMapStore((s) => s.setPinningPatient);
  const addRouteEntry = useRouteHistoryStore((s) => s.addEntry);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const [routeProfile, setRouteProfile] = useState<RouteProfile>("foot");
  const [isEditing, setIsEditing] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState<"patient" | "condition" | null>(null);
  const deletePatient = useDeletePatient();
  const deleteCondition = useDeleteCondition();

  if (!selectedPatient) return null;

  // Find patient data across all layers. A patient may appear in more than
  // one layer (multi-condition); the first hit wins for detail rendering.
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

  const patientId = (patientData?.id as string | undefined) ?? null;
  const nomeCompleto = (patientData?.nomeCompleto as string | null | undefined) ?? null;
  const canEdit =
    patientId != null &&
    patientLayer != null &&
    (patientLayer === "gestantes" ||
      patientLayer === "tuberculose" ||
      patientLayer === "hipertensao");

  // Count how many layers this patient appears in (used to gate per-condition delete).
  const conditionCount = layerData
    ? (Object.entries(layerData) as Array<[string, Array<Record<string, unknown>> | undefined]>)
        .filter(([, pats]) => pats?.some((p) => p.cns === selectedPatient))
        .length
    : 0;

  const canDeleteCondition =
    conditionCount > 1 &&
    patientId != null &&
    (patientLayer === "gestantes" ||
      patientLayer === "tuberculose" ||
      patientLayer === "hipertensao");

  return (
    <aside className="absolute inset-x-0 bottom-0 z-[1000] max-h-[60vh] overflow-y-auto rounded-t-2xl border-t bg-white p-4 shadow-lg md:inset-x-auto md:right-0 md:top-0 md:h-full md:max-h-none md:w-80 md:rounded-none md:border-l md:border-t-0">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          {isEditing ? "Editar paciente" : "Detalhes do paciente"}
        </h2>
        <button
          onClick={() => {
            setSelectedPatient(null);
            setActiveRoute(null);
            setIsEditing(false);
          }}
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
      ) : isEditing && patientId && patientLayer ? (
        <PatientEditForm
          patientId={patientId}
          cns={selectedPatient}
          nomeCompleto={nomeCompleto}
          layer={patientLayer}
          record={patientData}
          onDone={() => setIsEditing(false)}
        />
      ) : (
        <>
          <dl className="space-y-2">
            {visibleColumns.map((col) => {
              const value = patientData[col];
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

          <div className="mt-6 flex flex-col gap-3">
            {/* Route profile toggle */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Perfil:</span>
              <div className="flex gap-1 rounded-md bg-gray-100 p-0.5">
                <button
                  onClick={() => setRouteProfile("foot")}
                  className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
                    routeProfile === "foot"
                      ? "bg-white text-gray-800 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  🚶 Pé
                </button>
                <button
                  onClick={() => setRouteProfile("car")}
                  className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
                    routeProfile === "car"
                      ? "bg-white text-gray-800 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  🚗 Carro
                </button>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                disabled={!canEdit}
                onClick={() => setIsEditing(true)}
                title={
                  canEdit
                    ? "Editar campos deste paciente"
                    : "Edição disponível apenas para Gestantes, Tuberculose e Hipertensão"
                }
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500"
              >
                Editar
              </button>
              <button
                className="rounded-md border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-gray-50 disabled:opacity-50"
                disabled={isLoadingRoute}
                onClick={async () => {
                  if (!patientData) return;
                  const lat = Number(patientData.lat);
                  const lng = Number(patientData.lng);
                  if (!lat || !lng) return;

                  setIsLoadingRoute(true);
                  try {
                    const res = await fetch("/api/routes", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        fromLat: US_MOAB_CALDAS[0],
                        fromLng: US_MOAB_CALDAS[1],
                        toLat: lat,
                        toLng: lng,
                        profile: routeProfile,
                      }),
                    });
                    if (res.ok) {
                      const result: RouteResult = await res.json();
                      setActiveRoute({ result, profile: routeProfile });
                      addRouteEntry({
                        patientName: String(patientData.nomeCompleto ?? "Sem nome"),
                        patientCns: selectedPatient,
                        profile: routeProfile,
                        distance: result.distance,
                        duration: result.duration,
                        geometry: result.geometry,
                      });
                    }
                  } finally {
                    setIsLoadingRoute(false);
                  }
                }}
              >
                {isLoadingRoute ? "Calculando..." : "Traçar rota"}
              </button>
            </div>

            {/*
              Reposition button — opens explicit "reposition" mode. In this
              mode the patient's marker becomes draggable AND clicks on the
              map re-place the pin. Selection is preserved so the panel
              stays visible while the user drags/clicks.
            */}
            <button
              onClick={() => {
                if (!patientId) return;
                setPinningPatient({
                  id: patientId,
                  cns: selectedPatient,
                  nomeCompleto,
                });
              }}
              disabled={!patientId}
              className="w-full rounded-md border border-dashed px-3 py-1.5 text-xs text-muted-foreground hover:bg-gray-50 disabled:opacity-50"
            >
              📍 Reposicionar no mapa
            </button>

            {/* Condition-only delete — only when patient has 2+ conditions */}
            {canDeleteCondition && patientLayer && (
              <button
                onClick={() => setConfirmOpen("condition")}
                disabled={deleteCondition.isPending}
                className="w-full rounded-md border border-orange-300 px-3 py-1.5 text-xs text-orange-700 hover:bg-orange-50 disabled:opacity-50"
              >
                Remover apenas{" "}
                {LAYER_CONFIG[patientLayer].label}
              </button>
            )}

            {/* Hard delete — always visible in detail view when patientId is known */}
            {patientId && (
              <button
                onClick={() => setConfirmOpen("patient")}
                disabled={deletePatient.isPending}
                className="w-full rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                Excluir paciente
              </button>
            )}
          </div>
        </>
      )}

      {/* Confirm: delete entire patient */}
      {confirmOpen === "patient" && patientId && (
        <ConfirmDialog
          title="Excluir paciente"
          body={`Excluir paciente ${nomeCompleto ?? ""} permanentemente? Esta ação não pode ser desfeita.`}
          confirmLabel="Excluir"
          destructive
          isPending={deletePatient.isPending}
          onConfirm={() => {
            deletePatient.mutate({ id: patientId }, {
              onSuccess: () => setConfirmOpen(null),
            });
          }}
          onCancel={() => setConfirmOpen(null)}
        />
      )}

      {/* Confirm: remove one condition from patient */}
      {confirmOpen === "condition" && patientId && canDeleteCondition && patientLayer && (
        <ConfirmDialog
          title={`Remover ${LAYER_CONFIG[patientLayer].label}`}
          body={`Remover ${LAYER_CONFIG[patientLayer].label} deste paciente? O paciente continuará cadastrado nas outras camadas.`}
          confirmLabel="Remover"
          destructive
          isPending={deleteCondition.isPending}
          onConfirm={() => {
            deleteCondition.mutate(
              { id: patientId, condicao: patientLayer as ExtensionLayer },
              { onSuccess: () => setConfirmOpen(null) },
            );
          }}
          onCancel={() => setConfirmOpen(null)}
        />
      )}
    </aside>
  );
}
