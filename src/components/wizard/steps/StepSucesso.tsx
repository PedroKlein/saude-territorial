"use client";

/**
 * StepSucesso — final step after successful patient/condition save.
 *
 * Renders a Lottie green-check animation with two CTAs:
 *  - "Ver no mapa" — closes the wizard and focuses the new patient on the map.
 *  - "Adicionar outra condição" — only in new-patient mode; re-opens the
 *    wizard in add-condition mode against the just-created patient.
 *
 * LGPD: no patient identifiers reach console.*.
 */

import Lottie from "lottie-react";
import { MapPin, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMapStore } from "@/stores/mapStore";
import type { PatientWizardMode } from "@/components/wizard/PatientWizard";
import successAnimation from "@/lottie-success.json";

type Props = {
  /** Mode active when sucesso was reached (for title + CTA logic). */
  resolvedMode: PatientWizardMode;
  /** DB id of the patient created/updated — for "Ver no mapa". */
  patientId: string | null;
  onClose: () => void;
  /**
   * Only shown in create mode: opens the wizard in add-condition mode
   * against the just-created patient.
   */
  onAddAnotherCondition?: () => void;
};

export function StepSucesso({
  resolvedMode,
  patientId,
  onClose,
  onAddAnotherCondition,
}: Props) {
  const setSelectedPatient = useMapStore((s) => s.setSelectedPatient);

  const isNew = resolvedMode.kind === "new";
  const isEdit = resolvedMode.kind === "edit";
  const title = isEdit
    ? "Paciente atualizado!"
    : isNew
      ? "Paciente cadastrado!"
      : "Condição adicionada!";
  const subtitle = isEdit
    ? "As alterações foram salvas."
    : isNew
      ? "O novo paciente já está disponível no mapa."
      : "A condição foi vinculada com sucesso ao paciente.";

  const handleViewOnMap = () => {
    if (patientId) setSelectedPatient(patientId);
    onClose();
  };

  return (
    <div className="flex flex-col items-center gap-6 py-8 text-center">
      <div role="img" aria-label="Animação de sucesso" className="size-32">
        <Lottie
          animationData={successAnimation}
          loop={false}
          className="size-full"
        />
      </div>

      <div className="space-y-1">
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          type="button"
          onClick={handleViewOnMap}
          className="bg-brand text-white hover:bg-brand/80"
        >
          <MapPin className="mr-1.5 size-4" />
          Ver no mapa
        </Button>

        {isNew && onAddAnotherCondition && (
          <Button
            type="button"
            variant="outline"
            onClick={onAddAnotherCondition}
          >
            <PlusCircle className="mr-1.5 size-4" />
            Adicionar outra condição
          </Button>
        )}
      </div>
    </div>
  );
}
