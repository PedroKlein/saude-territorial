"use client";

/**
 * `EmptyMapOverlay` — centered card shown on the map when the patient dataset
 * loaded successfully but is empty across every layer. Gives fresh installs a
 * clear starting point instead of a silent Positron basemap.
 *
 * Renders nothing until `data` is defined (avoids flashing while loading) and
 * only when the total across all layers is zero.
 */

import { useState } from "react";
import { MapPinPlus } from "lucide-react";

import { PatientWizard } from "@/components/wizard/PatientWizard";
import type { LayeredPatientData } from "@/hooks/usePatientData";

type EmptyMapOverlayProps = {
  data: LayeredPatientData | undefined;
}

export function EmptyMapOverlay({ data }: EmptyMapOverlayProps) {
  const [wizardOpen, setWizardOpen] = useState(false);

  if (!data) return null;
  const totalPatients = Object.values(data).reduce(
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- Partial<Record<...>> values can be undefined at runtime; Object.values() types strip undefined
    (sum, list) => sum + (list?.length ?? 0),
    0,
  );
  if (totalPatients > 0) return null;

  return (
    <>
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none absolute inset-0 z-[1000] flex items-center justify-center"
      >
        <div className="pointer-events-auto max-w-sm rounded-xl border border-neutral-200 bg-white/95 px-6 py-5 text-center shadow-md backdrop-blur-sm">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-brand/10 text-brand">
            <MapPinPlus className="h-5 w-5" aria-hidden />
          </div>
          <h2 className="text-base font-semibold text-neutral-900">
            Nenhum paciente cadastrado
          </h2>
          <p className="mt-1 text-sm text-neutral-600">
            Cadastre o primeiro paciente para ver o mapa com marcadores,
            alertas e a lista de prioridades.
          </p>
          <button
            type="button"
            onClick={() => { setWizardOpen(true); }}
            className="mt-4 inline-flex items-center rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-brand/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            + Adicionar paciente
          </button>
        </div>
      </div>
      <PatientWizard
        open={wizardOpen}
        mode={{ kind: "new" }}
        onClose={() => { setWizardOpen(false); }}
      />
    </>
  );
}
