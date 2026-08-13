"use client";

import { useMapEvents } from "react-leaflet";
import { useState } from "react";

import { useUpdatePatient } from "@/hooks/useUpdatePatient";
import type { PinningTarget } from "@/stores/mapStore";

interface ManualPinModeProps {
  /** Target patient being pinned, or null when mode is inactive. */
  target: PinningTarget | null;
  /** Fired after a successful pin save. */
  onPinned: () => void;
  /** Fired when the user cancels out. */
  onCancel: () => void;
}

/**
 * Manual pin placement mode.
 *
 * When `target` is set, the map goes into pin-drop mode: clicking anywhere
 * captures coordinates for the target patient. The user can add an optional
 * reference note (e.g. "casa azul após a ponte") and save. Saving fires a
 * PATCH with `{ base: { lat, lng, geocodeReference } }`, which sets
 * `geocode_status='manual'` server-side.
 *
 * This is the recovery path for a failed geocode from the edit form (422 →
 * `requiresManualPin: true` → panel sets `pinningPatient`).
 */
export function ManualPinMode({ target, onPinned, onCancel }: ManualPinModeProps) {
  const [pendingCoords, setPendingCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [referenceText, setReferenceText] = useState("");
  const update = useUpdatePatient();

  useMapEvents({
    click: (e) => {
      if (!target) return;
      setPendingCoords({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });

  if (!target) return null;

  if (pendingCoords) {
    const savePin = () => {
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
            setPendingCoords(null);
            setReferenceText("");
            onPinned();
          },
          // On failure, keep the pending state so the user can retry.
        },
      );
    };

    return (
      <div className="absolute bottom-4 left-1/2 z-[1000] -translate-x-1/2 rounded-lg border bg-white p-4 shadow-lg">
        <p className="mb-2 text-sm font-medium">
          Coordenadas selecionadas para {target.nomeCompleto ?? "paciente"}
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
              setPendingCoords(null);
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
    );
  }

  return (
    <div className="absolute top-4 left-1/2 z-[1000] -translate-x-1/2 rounded-lg border bg-yellow-50 px-4 py-2 shadow">
      <p className="text-sm font-medium text-yellow-800">
        Clique no mapa para posicionar o pin de{" "}
        <strong>{target.nomeCompleto ?? "paciente"}</strong>
      </p>
      <button
        onClick={onCancel}
        className="mt-1 text-xs text-yellow-700 underline hover:text-yellow-900"
      >
        Cancelar
      </button>
    </div>
  );
}
