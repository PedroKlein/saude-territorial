"use client";

/**
 * PatientWizard — composes the generic Wizard shell + step components for
 * both "new patient" and "add condition" flows.
 *
 * Modes:
 *  new          → identidade → endereço → condições → dados pages → confirmar → sucesso
 *  add-condition → condições → dados pages → confirmar → sucesso
 *
 * Submit logic (onFinish):
 *  new          → POST /api/patients with identity + first condition; PATCH
 *                 additional conditions sequentially.
 *  add-condition → POST /api/patients/[id]/conditions for each chosen condition.
 *
 * 409 handling: when POST returns cns_exists, the wizard mid-flows into
 * add-condition mode scoped to the existing patient. An inline banner explains
 * the switch. The stashed ctx carries the already-entered data forward.
 *
 * LGPD: patient fields are never passed to console.*.
 */

import { useState, useCallback, useMemo } from "react";

import { Wizard } from "@/components/wizard/Wizard";
import type { WizardStep } from "@/components/wizard/Wizard";
import { StepIdentidade } from "@/components/wizard/steps/StepIdentidade";
import { StepEndereco } from "@/components/wizard/steps/StepEndereco";
import { StepEscolherCondicoes } from "@/components/wizard/steps/StepEscolherCondicoes";
import { StepDadosGestante } from "@/components/wizard/steps/StepDadosGestante";
import { StepDadosTB } from "@/components/wizard/steps/StepDadosTB";
import { StepDadosHAS } from "@/components/wizard/steps/StepDadosHAS";
import { StepConfirmar } from "@/components/wizard/steps/StepConfirmar";
import { StepSucesso } from "@/components/wizard/steps/StepSucesso";
import {
  useCreatePatient,
  useAttachCondition,
  isCreatePatientError,
} from "@/hooks/useCreatePatient";
import type { PatientCreate, ConditionAttach } from "@/lib/patients/schemas";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type PatientWizardMode =
  | { kind: "new"; initialCoords?: { lat: number; lng: number } | null }
  | {
      kind: "add-condition";
      patientId: string;
      alreadyAttached: Array<"gestantes" | "tuberculose" | "hipertensao">;
    };

// ---------------------------------------------------------------------------
// Wizard context shape
// ---------------------------------------------------------------------------

export type PatientWizardCtx = {
  // --- Identidade ---
  cns: string;
  nomeCompleto: string;
  dataNascimento: string; // "dd/MM/yyyy" or ""
  telefone: string;
  vulnerabilidades: string;
  // --- Endereço ---
  cep: string;
  rua: string;
  numero: string;
  complemento: string;
  bairro: string;
  microarea: string;
  geocodedCoords: { lat: number; lng: number } | null;
  /** Free-form landmark note; persisted as patients.geocodeReference. */
  referencia: string;
  // --- Condições ---
  chosenConditions: Array<"gestantes" | "tuberculose" | "hipertensao">;
  // --- Extension data (dates as "dd/MM/yyyy" strings) ---
  gestantes: Record<string, unknown>;
  tuberculose: Record<string, unknown>;
  hipertensao: Record<string, unknown>;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function emptyCtx(mode?: PatientWizardMode | null): PatientWizardCtx {
  return {
    cns: "",
    nomeCompleto: "",
    dataNascimento: "",
    telefone: "",
    vulnerabilidades: "",
    cep: "",
    rua: "",
    numero: "",
    complemento: "",
    bairro: "",
    microarea: "",
    geocodedCoords: mode?.kind === "new" ? (mode.initialCoords ?? null) : null,
    referencia: "",
    chosenConditions: [],
    gestantes: {},
    tuberculose: {},
    hipertensao: {},
  };
}

/**
 * Build the POST /api/patients body from wizard ctx.
 * The first chosen condition becomes the primary extension row.
 */
function buildCreatePayload(ctx: PatientWizardCtx, condicao: "gestantes" | "tuberculose" | "hipertensao"): PatientCreate {
  const extKey = condicao === "hipertensao" ? "hipertensao" : condicao;
  return {
    cns: ctx.cns,
    base: {
      nomeCompleto: ctx.nomeCompleto,
      ...(ctx.dataNascimento ? { dataNascimento: ctx.dataNascimento } : {}),
      ...(ctx.telefone ? { telefone: ctx.telefone } : {}),
      ...(ctx.rua ? { rua: ctx.rua } : {}),
      ...(ctx.numero ? { numero: ctx.numero } : {}),
      ...(ctx.complemento ? { complemento: ctx.complemento } : {}),
      ...(ctx.bairro ? { bairro: ctx.bairro } : {}),
      ...(ctx.cep ? { cep: ctx.cep } : {}),
      ...(ctx.microarea ? { microarea: ctx.microarea } : {}),
      ...(ctx.referencia ? { geocodeReference: ctx.referencia } : {}),
      ...(ctx.vulnerabilidades ? { vulnerabilidades: ctx.vulnerabilidades } : {}),
      ...(ctx.geocodedCoords
        ? { lat: ctx.geocodedCoords.lat, lng: ctx.geocodedCoords.lng }
        : {}),
    },
    condicao,
    [extKey]: ctx[extKey],
  } as PatientCreate;
}

/**
 * Build the POST /api/patients/[id]/conditions body for an additional condition.
 */
function buildAttachPayload(
  ctx: PatientWizardCtx,
  condicao: "gestantes" | "tuberculose" | "hipertensao",
): ConditionAttach {
  const extKey = condicao === "hipertensao" ? "hipertensao" : condicao;
  return { condicao, data: ctx[extKey] } as ConditionAttach;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

type PatientWizardProps = {
  open: boolean;
  mode: PatientWizardMode;
  onClose: () => void;
};

export function PatientWizard({ open, mode, onClose }: PatientWizardProps) {
  // Internal mode can switch mid-flow on 409 CNS collision.
  const [internalMode, setInternalMode] = useState<PatientWizardMode>(mode);
  // Key forces wizard remount when mode changes mid-flow.
  const [wizardKey, setWizardKey] = useState(0);
  // Stashed ctx preserved across mode switches (carries entered data forward).
  const [stashedCtx, setStashedCtx] = useState<PatientWizardCtx | null>(null);
  // Patient id set after successful creation (for StepSucesso "Ver no mapa").
  const [createdPatientId, setCreatedPatientId] = useState<string | null>(null);
  // Inline banner text shown after a 409 collision switch.
  const [collisionBanner, setCollisionBanner] = useState<string | null>(null);

  const createPatient = useCreatePatient();
  const attachCondition = useAttachCondition();

  // -------------------------------------------------------------------------
  // onFinish — called by the wizard when the user clicks "Finalizar"
  // -------------------------------------------------------------------------

  const onFinish = useCallback(
    async (ctx: PatientWizardCtx) => {
      if (internalMode.kind === "new") {
        const firstCond = ctx.chosenConditions[0];
        if (!firstCond) return; // no conditions chosen — should not happen

        let newId: string;
        try {
          const result = await createPatient.mutateAsync({
            body: buildCreatePayload(ctx, firstCond),
          });
          const d = result.data as { patient?: { id?: string } } | undefined;
          newId = d?.patient?.id ?? "";
        } catch (err) {
          if (isCreatePatientError(err) && err.status === 409) {
            // CNS collision: switch to add-condition mode for the existing patient.
            const existing = err.body?.patient as
              | { id?: string; attached?: string[] }
              | undefined;
            const existingId = existing?.id ?? "";
            const existingAttached = (existing?.attached ?? []) as Array<
              "gestantes" | "tuberculose" | "hipertensao"
            >;

            setCollisionBanner(
              "Este CNS já está cadastrado. Suas condições serão adicionadas ao paciente existente.",
            );
            setStashedCtx({
              ...ctx,
              chosenConditions: ctx.chosenConditions.filter(
                (c) => !existingAttached.includes(c),
              ),
            });
            setInternalMode({
              kind: "add-condition",
              patientId: existingId,
              alreadyAttached: existingAttached,
            });
            setWizardKey((k) => k + 1);
            // Throw so the wizard stays on confirmar and does not advance to sucesso.
            throw err;
          }
          throw err;
        }

        // Attach additional conditions sequentially
        for (const cond of ctx.chosenConditions.slice(1)) {
          await attachCondition.mutateAsync({
            patientId: newId,
            body: buildAttachPayload(ctx, cond),
          });
        }
        setCreatedPatientId(newId);
      } else {
        // add-condition
        const { patientId } = internalMode;
        for (const cond of ctx.chosenConditions) {
          await attachCondition.mutateAsync({
            patientId,
            body: buildAttachPayload(ctx, cond),
          });
        }
        setCreatedPatientId(patientId);
      }
    },
    [internalMode, createPatient, attachCondition],
  );

  // -------------------------------------------------------------------------
  // "Add another condition" callback for StepSucesso CTA
  // -------------------------------------------------------------------------

  const handleAddAnotherCondition = useCallback(() => {
    if (!createdPatientId) return;
    setInternalMode({
      kind: "add-condition",
      patientId: createdPatientId,
      alreadyAttached: [],
    });
    setWizardKey((k) => k + 1);
  }, [createdPatientId]);

  // -------------------------------------------------------------------------
  // Step list (static; data pages use shouldSkip to skip unchosen conditions)
  // -------------------------------------------------------------------------

  const alreadyAttached =
    internalMode.kind === "add-condition" ? internalMode.alreadyAttached : [];

  const steps = useMemo<Array<WizardStep<PatientWizardCtx>>>(
    () => {
      const condStep: WizardStep<PatientWizardCtx> = {
        id: "condicoes",
        label: "Condições",
        render: (props) => (
          <StepEscolherCondicoes
            {...props}
            alreadyAttached={alreadyAttached}
          />
        ),
      };

      const dataPages: Array<WizardStep<PatientWizardCtx>> = [
        {
          id: "dados-gestante",
          label: "Gestante",
          shouldSkip: (c) => !c.chosenConditions.includes("gestantes"),
          render: (props) => <StepDadosGestante {...props} />,
        },
        {
          id: "dados-tb",
          label: "Tuberculose",
          shouldSkip: (c) => !c.chosenConditions.includes("tuberculose"),
          render: (props) => <StepDadosTB {...props} />,
        },
        {
          id: "dados-has",
          label: "HAS",
          shouldSkip: (c) => !c.chosenConditions.includes("hipertensao"),
          render: (props) => <StepDadosHAS {...props} />,
        },
      ];

      const confirmar: WizardStep<PatientWizardCtx> = {
        id: "confirmar",
        label: "Confirmar",
        isFinalize: true,
        render: (props) => <StepConfirmar {...props} />,
      };

      const sucesso: WizardStep<PatientWizardCtx> = {
        id: "sucesso",
        label: "Pronto",
        noFooter: true,
        render: () => (
          <StepSucesso
            resolvedMode={internalMode}
            patientId={createdPatientId}
            onClose={onClose}
            onAddAnotherCondition={
              internalMode.kind === "new" ? handleAddAnotherCondition : undefined
            }
          />
        ),
      };

      if (internalMode.kind === "new") {
        return [
          {
            id: "identidade",
            label: "Identidade",
            render: (props) => <StepIdentidade {...props} />,
          },
          {
            id: "endereco",
            label: "Endereço",
            render: (props) => <StepEndereco {...props} />,
          },
          condStep,
          ...dataPages,
          confirmar,
          sucesso,
        ];
      }

      return [condStep, ...dataPages, confirmar, sucesso];
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [internalMode, createdPatientId, onClose, handleAddAnotherCondition],
  );

  // -------------------------------------------------------------------------
  // Initial ctx (stashed context takes priority on mode switch)
  // -------------------------------------------------------------------------

  const initialCtx = stashedCtx ?? emptyCtx(mode);

  const headline =
    internalMode.kind === "new" ? "Novo paciente" : "Adicionar condição";

  return (
    <>
      {/* 409 collision banner — shown above the modal */}
      {collisionBanner && (
        <div
          role="alert"
          className="fixed left-1/2 top-4 z-[10000] -translate-x-1/2 rounded-lg border border-alert-amber/40 bg-white px-4 py-2.5 text-sm text-amber-900 shadow-lg"
        >
          {collisionBanner}
          <button
            type="button"
            onClick={() => setCollisionBanner(null)}
            className="ml-3 text-xs text-amber-700 underline hover:text-amber-900"
          >
            OK
          </button>
        </div>
      )}

      <Wizard
        key={wizardKey}
        open={open}
        steps={steps}
        initialCtx={initialCtx}
        onClose={onClose}
        onFinish={onFinish}
        headline={headline}
      />
    </>
  );
}
