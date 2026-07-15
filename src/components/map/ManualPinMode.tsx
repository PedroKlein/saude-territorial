"use client";

import { useMapEvents } from "react-leaflet";
import { useState } from "react";

interface ManualPinModeProps {
  /** Whether pin placement mode is active */
  active: boolean;
  /** Called when user places a pin */
  onPinPlaced: (data: { lat: number; lng: number; reference_text: string }) => void;
  /** Called when mode is cancelled */
  onCancel: () => void;
}

/**
 * Manual pin placement mode.
 * When active, clicking the map captures coordinates for patients
 * whose addresses could not be geocoded.
 */
export function ManualPinMode({ active, onPinPlaced, onCancel }: ManualPinModeProps) {
  const [pendingCoords, setPendingCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [referenceText, setReferenceText] = useState("");

  useMapEvents({
    click: (e) => {
      if (!active) return;
      setPendingCoords({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });

  if (!active) return null;

  if (pendingCoords) {
    return (
      <div className="absolute bottom-4 left-1/2 z-[1000] -translate-x-1/2 rounded-lg border bg-white p-4 shadow-lg">
        <p className="mb-2 text-sm font-medium">Coordenadas selecionadas</p>
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
        <div className="flex gap-2">
          <button
            onClick={() => {
              onPinPlaced({ ...pendingCoords, reference_text: referenceText });
              setPendingCoords(null);
              setReferenceText("");
            }}
            className="rounded bg-primary px-3 py-1 text-xs text-white"
          >
            Salvar
          </button>
          <button
            onClick={() => {
              setPendingCoords(null);
              setReferenceText("");
              onCancel();
            }}
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
        Clique no mapa para posicionar o marcador
      </p>
    </div>
  );
}
