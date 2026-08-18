"use client";

/**
 * `CnsCollisionDialog` — shown when POST /api/patients returns 409 (cns_exists).
 *
 * Offers two choices:
 *  1. "Adicionar condição" — calls `useAttachCondition` on the existing patient.
 *  2. "Cancelar" — closes the dialog and returns focus to the CNS field.
 */

import type { ConditionAttach } from "@/lib/patients/schemas";
import { useAttachCondition } from "@/hooks/useCreatePatient";

type CnsCollisionDialogProps = {
  /** Existing patient info returned in the 409 body. */
  existing: {
    id: string;
    cns: string;
    nomeCompleto: string | null;
  };
  /** The condition the user was trying to add. */
  condicao: "gestantes" | "tuberculose" | "hipertensao";
  /** Extension data the user filled in (will be sent as-is to the conditions endpoint). */
  extensionData: ConditionAttach["data"];
  /** Called after a successful attach. Closes both dialog and create form. */
  onSuccess: () => void;
  /** Called on cancel — returns to the form so the user can edit the CNS. */
  onCancel: () => void;
}

const CONDICAO_LABEL: Record<
  "gestantes" | "tuberculose" | "hipertensao",
  string
> = {
  gestantes: "Gestantes",
  tuberculose: "Tuberculose",
  hipertensao: "Hipertensão",
};

export function CnsCollisionDialog({
  existing,
  condicao,
  extensionData,
  onSuccess,
  onCancel,
}: CnsCollisionDialogProps) {
  const attach = useAttachCondition();

  const handleAttach = () => {
    attach.mutate(
      {
        patientId: existing.id,
        body: { condicao, data: extensionData } as ConditionAttach,
      },
      { onSuccess },
    );
  };

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cns-collision-title"
    >
      <div className="mx-4 w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h2
          id="cns-collision-title"
          className="mb-3 text-base font-semibold text-gray-900"
        >
          CNS já cadastrado
        </h2>

        <p className="mb-5 text-sm text-gray-700">
          Este CNS já pertence a{" "}
          <span className="font-medium">
            {existing.nomeCompleto ?? "(nome não informado)"}
          </span>
          . Deseja adicionar a condição{" "}
          <span className="font-medium">{CONDICAO_LABEL[condicao]}</span> ao
          paciente existente?
        </p>

        {attach.isError && (
          <p className="mb-3 text-xs text-red-700">
         {attach.error.body.error === "condition_exists"
              ? "Este paciente já possui essa condição."
           : attach.error.body.error ?? "Erro ao adicionar condição."}
          </p>
        )}

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={attach.isPending}
            className="rounded-md border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleAttach}
            disabled={attach.isPending}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-gray-400"
          >
            {attach.isPending ? "Adicionando..." : "Adicionar condição"}
          </button>
        </div>
      </div>
    </div>
  );
}
