"use client";

import { useMapStore } from "@/stores/mapStore";
import { useRouteHistoryStore } from "@/stores/routeHistoryStore";
import { LAYER_CONFIG, type LayerId } from "@/config/layers.config";
import { useState } from "react";
import { US_MOAB_CALDAS } from "@/config/geo.constants";
import type { RouteResult, RouteProfile } from "@/types/routing";

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
  // TODO(pivot-execution): patient editing will be restored via PATCH /api/patients/[id]
  // once the Drizzle-backed CRUD layer lands. See docs/adr/ADR-001-drop-sheets.md.
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const [routeProfile, setRouteProfile] = useState<RouteProfile>("foot");

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

  return (
    <aside className="absolute inset-x-0 bottom-0 z-[1000] max-h-[60vh] overflow-y-auto rounded-t-2xl border-t bg-white p-4 shadow-lg md:inset-x-auto md:right-0 md:top-0 md:h-full md:max-h-none md:w-80 md:rounded-none md:border-l md:border-t-0">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Detalhes do Paciente</h2>
        <button
          onClick={() => {
            setSelectedPatient(null);
            setActiveRoute(null);
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
              disabled
              title="Edição disponível na próxima versão (Drizzle CRUD em desenvolvimento)"
              className="rounded-md bg-gray-300 px-4 py-2 text-sm font-medium text-gray-500 cursor-not-allowed"
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

            {/* Manual pin button */}
            <button
              onClick={() => {
                setPinningPatient(selectedPatient);
                setSelectedPatient(null);
              }}
              className="w-full rounded-md border border-dashed px-3 py-1.5 text-xs text-muted-foreground hover:bg-gray-50"
            >
              📍 Posicionar no mapa
            </button>
          </div>
        </>
      )}
    </aside>
  );
}
