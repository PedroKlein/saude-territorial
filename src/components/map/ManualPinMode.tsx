"use client";

import { useMapEvents } from "react-leaflet";
import { useEffect, useRef, useState } from "react";
import L from "leaflet";

import { useUpdatePatient } from "@/hooks/useUpdatePatient";
import type { PinningTarget } from "@/stores/mapStore";

/**
 * ManualPinMode is split into two pieces:
 *
 *  1. `PinClickCatcher` (this file) — a `useMapEvents` child of
 *     `<MapContainer>` that captures raw Leaflet clicks and hands the
 *     coordinates back to the parent. It renders nothing.
 *
 *  2. `ManualPinOverlay` — the UI banner + confirmation card. Rendered
 *     OUTSIDE `<MapContainer>` so its DOM clicks never bubble into the
 *     Leaflet event system, and belt-and-braces
 *     `L.DomEvent.disableClickPropagation` on the ref guards against any
 *     tree-portal surprises.
 *
 * This is the recovery path for a failed geocode from the edit form
 * (422 → `requiresManualPin: true` → panel sets `pinningPatient`), and
 * the explicit "Reposicionar no mapa" flow from the detail panel.
 * `PATCH /api/patients/[id]` with `{ base: { lat, lng, geocodeReference } }`
 * sets `geocode_status='manual'` server-side.
 */
interface PinClickCatcherProps {
  active: boolean;
  onPick: (coords: { lat: number; lng: number }) => void;
}

/** Renders nothing. Captures Leaflet map clicks while `active`. */
export function PinClickCatcher({ active, onPick }: PinClickCatcherProps) {
  useMapEvents({
    click: (e) => {
      if (!active) return;
      onPick({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

interface ManualPinOverlayProps {
  target: PinningTarget | null;
  pendingCoords: { lat: number; lng: number } | null;
  clearPendingCoords: () => void;
  onPinned: () => void;
  onCancel: () => void;
}

export function ManualPinOverlay({
  target,
  pendingCoords,
  clearPendingCoords,
  onPinned,
  onCancel,
}: ManualPinOverlayProps) {
  const [referenceText, setReferenceText] = useState("");
  const update = useUpdatePatient();
  const rootRef = useRef<HTMLDivElement>(null);

  // Belt-and-braces: even outside MapContainer, if any part of the DOM
  // tree ever gets portaled back inside a Leaflet container, this guard
  // makes sure a click on the banner/card never reaches Leaflet.
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    L.DomEvent.disableClickPropagation(el);
    L.DomEvent.disableScrollPropagation(el);
  }, []);

  if (!target) return null;

  const savePin = () => {
    if (!pendingCoords) return;
    update.mutate(
      {
        id: target.id,
        body: {
          base: {
            lat: pendingCoords.lat,
            lng: pendingCoords.lng,
            geocodeReference: referenceText || null,
          },
        },
        optimisticPatch: {
          lat: pendingCoords.lat,
          lng: pendingCoords.lng,
          geocodeStatus: "manual",
          geocodeReference: referenceText || null,
        },
      },
      {
        onSuccess: () => {
          clearPendingCoords();
          setReferenceText("");
          onPinned();
        },
        // On failure, keep pending state so the user can retry.
      },
    );
  };

  return (
    <div ref={rootRef}>
      {pendingCoords ? (
        <div className="absolute bottom-4 left-1/2 z-[1000] -translate-x-1/2 rounded-lg border bg-white p-4 shadow-lg">
          <p className="mb-2 text-sm font-medium">
            Coordenadas selecionadas para{" "}
            {target.nomeCompleto ?? "paciente"}
          </p>
          <p className="mb-2 text-xs text-muted-foreground">
            {pendingCoords.lat.toFixed(5)}, {pendingCoords.lng.toFixed(5)}
          </p>
          <input
            type="text"
            placeholder="Referência (ex: próximo ao mercado)"
            value={referenceText}
            onChange={(e) => setReferenceText(e.target.value)}
            className="mb-2 w-full rounded border px-2 py-1 text-sm"
          />
          {update.isError && (
            <p className="mb-2 text-xs text-red-700">
              {update.error?.body?.error ?? "Erro ao salvar. Tente novamente."}
            </p>
          )}
          <div className="flex gap-2">
            <button
              onClick={savePin}
              disabled={update.isPending}
              className="rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white disabled:bg-gray-400"
            >
              {update.isPending ? "Salvando..." : "Salvar"}
            </button>
            <button
              onClick={() => {
                clearPendingCoords();
                setReferenceText("");
                onCancel();
              }}
              disabled={update.isPending}
              className="rounded border px-3 py-1 text-xs"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <div className="absolute top-4 left-1/2 z-[1000] -translate-x-1/2 rounded-lg border bg-yellow-50 px-4 py-2 shadow">
          <p className="text-sm font-medium text-yellow-800">
            Clique no mapa ou arraste o marcador de{" "}
            <strong>{target.nomeCompleto ?? "paciente"}</strong>
          </p>
          <button
            onClick={onCancel}
            className="mt-1 text-xs text-yellow-700 underline hover:text-yellow-900"
          >
            Cancelar
          </button>
        </div>
      )}
    </div>
  );
}
