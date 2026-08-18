"use client";

/**
 * PatientWizard — composes the generic Wizard shell + step components for
 * both "new patient" and "add condition" flows.
 *
 * Modes:
 *  new          → identidade → endereço → condições → dados pages → confirmar → sucesso
 *  add-condition → condições → dados pages → confirmar → sucesso
 *  edit         → identidade → endereço → gerenciar-condicoes → dados pages → confirmar → sucesso
 *
 * Submit logic (onFinish):
 *  new          → POST /api/patients with identity + optional first condition; PATCH
 *                 additional conditions sequentially.
 *  add-condition → POST /api/patients/[id]/conditions for each chosen condition.
 *  edit         → PATCH base + kept conditions; attach new ones; delete removed ones.
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
import { StepGerenciarCondicoes } from "@/components/wizard/steps/StepGerenciarCondicoes";
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
import { useUpdatePatient } from "@/hooks/useUpdatePatient";
import { useDeleteCondition } from "@/hooks/useDeletePatient";
import type { PatientCreate, ConditionAttach, PatientPatch } from "@/lib/patients/schemas";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type PatientWizardMode =
  | { kind: "new"; initialCoords?: { lat: number; lng: number } | null }
  | {
      kind: "add-condition";
      patientId: string;
      alreadyAttached: ("gestantes" | "tuberculose" | "hipertensao")[];
    }
  | {
      kind: "edit";
      patientId: string;
      /**
       * Snapshot of the patient at open time. Populates ctx defaults; the
       * wizard PATCHes the delta against the server.
       *
       * Deliberately loose (not `PatientRecord & {…}`): a base-only patient
       * in the sem-condicao layer has null lat/lng, and hydrateCtxFromPatient
       * already handles that (typeof-guarded read). Anchoring to
       * `PatientRecord` (lat: number) would reject those. See #8 (optional
       * condition on create).
       */
      patient: {
        id: string;
        cns: string;
        nomeCompleto: string | null;
        lat: number | null;
        lng: number | null;
        gestante?: Record<string, unknown> | null;
        tuberculose?: Record<string, unknown> | null;
        has?: Record<string, unknown> | null;
        [key: string]: unknown;
      };
    };

// ---------------------------------------------------------------------------
// Wizard context shape
// ---------------------------------------------------------------------------

export type PatientWizardCtx = {
  cns: string;
  nomeCompleto: string;
  dataNascimento: string; // "dd/MM/yyyy" or ""
  telefone: string;
  vulnerabilidades: string;
  cep: string;
  rua: string;
  numero: string;
  complemento: string;
  bairro: string;
  microarea: string;
  geocodedCoords: { lat: number; lng: number } | null;
  /** Free-form landmark note; persisted as patients.geocodeReference. */
  referencia: string;
  chosenConditions: ("gestantes" | "tuberculose" | "hipertensao")[];
  /**
   * Conditions present at wizard open time (edit mode only).
   * Used to distinguish kept / new / removed when building the PATCH body.
   */
  originalConditions: ("gestantes" | "tuberculose" | "hipertensao")[];
  /**
   * Conditions the user queued for removal (edit mode only).
   * Populated by StepGerenciarCondicoes; committed on Finalizar.
   */
  toRemove: ("gestantes" | "tuberculose" | "hipertensao")[];
  gestantes: Record<string, unknown>;
  tuberculose: Record<string, unknown>;
  hipertensao: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Validation error formatting
// ---------------------------------------------------------------------------

/**
 * PT-BR labels for known field paths that appear in Zod 400 issue arrays.
 * Path is the last segment from `ZodIssue.path`.
 */
const FIELD_LABELS: Record<string, string> = {
  cns: "CNS",
  nomeCompleto: "Nome completo",
  dataNascimento: "Data de nascimento",
  idade: "Idade",
  telefone: "Telefone",
  rua: "Rua",
  numero: "Número",
  complemento: "Complemento",
  bairro: "Bairro",
  cep: "CEP",
  microarea: "Microárea",
  geocodeReference: "Referência",
  vulnerabilidades: "Vulnerabilidades",
  lat: "Latitude",
  lng: "Longitude",
  // gestantes
  dum: "DUM",
  dpp: "DPP",
  risco: "Risco",
  ig: "Idade gestacional",
  igAbertura: "IG na abertura",
  dataUltimaConsulta: "Data da última consulta",
  dataProximaConsulta: "Data da próxima consulta",
  numeroConsultas: "Número de consultas",
  pressaoArterial: "Pressão arterial",
  vacinaDtpa: "Vacina dTpa",
  hasPreviaTag: "HAS prévia",
  diabetesPreviaTag: "Diabetes prévia",
  // tuberculose
  tipo: "Tipo",
  galRegistro: "Registro GAL",
  baciloscopiaResultado: "Baciloscopia",
  trmResultado: "TRM",
  culturaMTuberculosis: "Cultura M. tuberculosis",
  formaClinica: "Forma clínica",
  tipoEntrada: "Tipo de entrada",
  esquema: "Esquema",
  dataInicio: "Data de início",
  tdoStatus: "TDO",
  encerramentoMotivo: "Motivo de encerramento",
  encerramentoData: "Data de encerramento",
  outrosExames: "Outros exames",
  // hipertensao
  dataUltimaAfericaoPa: "Última aferição PA",
  registroNotas: "Notas",
  encaminhamentos: "Encaminhamentos",
  condicao: "Condição",
  base: "Dados básicos",
};

type RawIssue = {
  path: (string | number)[];
  message: string;
}

function isRawIssue(x: unknown): x is RawIssue {
  return (
    typeof x === "object" &&
    x !== null &&
    "path" in x &&
    "message" in x &&
    typeof (x as RawIssue).message === "string"
  );
}

/**
 * Format Zod issue array as a human-readable PT-BR string.
 * Returns a single line for one issue; a bulleted list for multiple.
 */
function formatIssues(issues: unknown): string {
  const raw = Array.isArray(issues) ? issues : [];
  const lines = raw.filter(isRawIssue).map((issue) => {
    const fieldKey = issue.path[issue.path.length - 1];
    const mapped =
      typeof fieldKey === "string" ? FIELD_LABELS[fieldKey] : undefined;
    const label = mapped ?? (fieldKey ? String(fieldKey) : "Campo");
    return `• ${label}: ${issue.message}`;
  });

  if (lines.length === 0) return "Dados inválidos.";
  if (lines.length === 1) return (lines[0] ?? "").replace(/^• /, "");
  return `Encontramos os seguintes problemas:\n${lines.join("\n")}`;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildInitialCtx(mode?: PatientWizardMode | null): PatientWizardCtx {
  if (mode?.kind === "edit") {
    return hydrateCtxFromPatient(mode.patient);
  }
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
    originalConditions: [],
    toRemove: [],
    gestantes: {},
    tuberculose: {},
    hipertensao: {},
  };
}

/**
 * Populate ctx from an existing patient (edit mode).
 *
 * All string fields collapse null → "" to keep react-hook-form controlled
 * inputs happy. Extension bags carry the full server-returned payload so
 * subsequent field-level dirty tracking can produce a minimal PATCH body.
 *
 * `chosenConditions` and `originalConditions` both reflect the conditions
 * currently attached. StepGerenciarCondicoes may modify `chosenConditions`
 * and `toRemove` during the edit flow.
 */
function hydrateCtxFromPatient(
  p: Extract<PatientWizardMode, { kind: "edit" }>["patient"],
): PatientWizardCtx {
  const attached: ("gestantes" | "tuberculose" | "hipertensao")[] = [];
  if (p.gestante) attached.push("gestantes");
  if (p.tuberculose) attached.push("tuberculose");
  if (p.has) attached.push("hipertensao");

  const str = (v: unknown): string => {
    if (typeof v === "string") return v;
    if (v == null) return "";
    if (typeof v === "number" || typeof v === "boolean") return String(v);
    return JSON.stringify(v);
  };

  return {
    cns: str(p.cns),
    nomeCompleto: str(p.nomeCompleto),
    dataNascimento: str((p as Record<string, unknown>).dataNascimento),
    telefone: str((p as Record<string, unknown>).telefone),
    vulnerabilidades: str((p as Record<string, unknown>).vulnerabilidades),
    cep: str((p as Record<string, unknown>).cep),
    rua: str((p as Record<string, unknown>).rua),
    numero: str((p as Record<string, unknown>).numero),
    complemento: str((p as Record<string, unknown>).complemento),
    bairro: str((p as Record<string, unknown>).bairro),
    microarea: str((p as Record<string, unknown>).microarea),
    referencia: str((p as Record<string, unknown>).geocodeReference),
    geocodedCoords:
      typeof p.lat === "number" && typeof p.lng === "number"
        ? { lat: p.lat, lng: p.lng }
        : null,
    chosenConditions: attached,
    originalConditions: attached,
    toRemove: [],
    gestantes: (p.gestante ?? {}),
    tuberculose: (p.tuberculose ?? {}),
    hipertensao: (p.has ?? {}),
  };
}

/**
 * Build the POST /api/patients body when a condition is chosen.
 * The first chosen condition becomes the primary extension row.
 */
function buildCreatePayload(
  ctx: PatientWizardCtx,
  condicao: "gestantes" | "tuberculose" | "hipertensao",
): PatientCreate {
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
  };
}

/**
 * Build the POST /api/patients body when NO condition is chosen (#8).
 * Emits only `cns` + `base` — the server will create a base-only patient.
 */
function buildCreatePayloadNoCondition(ctx: PatientWizardCtx): PatientCreate {
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
  };
}

/**
 * Build the POST /api/patients/[id]/conditions body for an additional condition.
 */
function buildAttachPayload(
  ctx: PatientWizardCtx,
  condicao: "gestantes" | "tuberculose" | "hipertensao",
): ConditionAttach {
  const extKey = condicao === "hipertensao" ? "hipertensao" : condicao;
  return { condicao, data: ctx[extKey] };
}

/**
 * Build the PATCH /api/patients/[id] body from wizard ctx.
 *
 * Only patches `base` + the CONDITIONS that are in BOTH `originalConditions`
 * AND `chosenConditions` (i.e. kept, not new additions and not removals).
 * New additions go through `attachCondition`; removals go through
 * `deleteCondition`. This is important because the PATCH endpoint cannot
 * create new extension rows — only update existing ones.
 *
 * Address changes trigger re-geocoding server-side unless `lat`/`lng` are
 * present (drag-to-fix short-circuits that path — see PATCH handler).
 */
function buildPatchPayload(ctx: PatientWizardCtx): PatientPatch {
  const nullable = (v: string): string | null => (v === "" ? null : v);

  // Conditions that existed before AND are still chosen (kept).
  const keptConditions = ctx.chosenConditions.filter((c) =>
    ctx.originalConditions.includes(c),
  );

  const body: PatientPatch = {
    base: {
      ...(ctx.nomeCompleto ? { nomeCompleto: ctx.nomeCompleto } : {}),
      dataNascimento: nullable(ctx.dataNascimento),
      telefone: nullable(ctx.telefone),
      rua: nullable(ctx.rua),
      numero: nullable(ctx.numero),
      complemento: nullable(ctx.complemento),
      bairro: nullable(ctx.bairro),
      cep: nullable(ctx.cep),
      microarea: nullable(ctx.microarea),
      geocodeReference: nullable(ctx.referencia),
      vulnerabilidades: nullable(ctx.vulnerabilidades),
      ...(ctx.geocodedCoords
        ? { lat: ctx.geocodedCoords.lat, lng: ctx.geocodedCoords.lng }
        : {}),
    },
  };
  if (keptConditions.includes("gestantes")) {
    body.gestantes = ctx.gestantes;
  }
  if (keptConditions.includes("tuberculose")) {
    body.tuberculose = ctx.tuberculose;
  }
  if (keptConditions.includes("hipertensao")) {
    body.hipertensao = ctx.hipertensao;
  }
  return body;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

type PatientWizardProps = {
  open: boolean;
  mode: PatientWizardMode;
  onClose: () => void;
}

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
  const updatePatient = useUpdatePatient();
  const deleteCondition = useDeleteCondition();

  const onFinish = useCallback(
    async (ctx: PatientWizardCtx) => {
      if (internalMode.kind === "new") {
        const firstCond = ctx.chosenConditions.at(0);
        const restConds = ctx.chosenConditions.slice(1);

        let newId: string;
        try {
          const result = await createPatient.mutateAsync({
            body: firstCond
              ? buildCreatePayload(ctx, firstCond)
              : buildCreatePayloadNoCondition(ctx),
          });
          const d = result.data as { patient?: { id?: string } } | undefined;
          newId = d?.patient?.id ?? "";
        } catch (err) {
          if (isCreatePatientError(err) && err.status === 400) {
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- err.body is typed non-null but actual API response may not match at runtime
            const issues = err.body?.issues;
            throw new Error(formatIssues(issues));
          }
          if (isCreatePatientError(err) && err.status === 409) {
            // CNS collision: switch to add-condition mode for the existing patient.
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- err.body typed non-null; defensive chain guards against unexpected API shapes
            const existing = err.body?.patient as
              | { id?: string; attached?: string[] }
              | undefined;
            const existingId = existing?.id ?? "";
            const existingAttached = (existing?.attached ?? []) as ("gestantes" | "tuberculose" | "hipertensao")[];

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

        for (const cond of restConds) {
          await attachCondition.mutateAsync({
            patientId: newId,
            body: buildAttachPayload(ctx, cond),
          });
        }
        setCreatedPatientId(newId);
      } else if (internalMode.kind === "add-condition") {
        const { patientId } = internalMode;
        for (const cond of ctx.chosenConditions) {
          await attachCondition.mutateAsync({
            patientId,
            body: buildAttachPayload(ctx, cond),
          });
        }
        setCreatedPatientId(patientId);
      } else {
        const { patientId } = internalMode;

        try {
          await updatePatient.mutateAsync({
            id: patientId,
            body: buildPatchPayload(ctx),
          });
        } catch (err) {
          const ue = err as { status?: number; body?: { issues?: unknown[] } };
          if (ue.status === 400 && ue.body?.issues) {
            throw new Error(formatIssues(ue.body.issues));
          }
          throw err;
        }

        const newConditions = ctx.chosenConditions.filter(
          (c) => !ctx.originalConditions.includes(c),
        );
        for (const cond of newConditions) {
          await attachCondition.mutateAsync({
            patientId,
            body: buildAttachPayload(ctx, cond),
          });
        }

        for (const cond of ctx.toRemove) {
          await deleteCondition.mutateAsync({ id: patientId, condicao: cond });
        }

        setCreatedPatientId(patientId);
      }
    },
    [internalMode, createPatient, attachCondition, updatePatient, deleteCondition],
  );

  const handleAddAnotherCondition = useCallback(() => {
    if (!createdPatientId) return;
    setInternalMode({
      kind: "add-condition",
      patientId: createdPatientId,
      alreadyAttached: [],
    });
    setWizardKey((k) => k + 1);
  }, [createdPatientId]);

  const alreadyAttached =
    internalMode.kind === "add-condition" ? internalMode.alreadyAttached : [];

  const steps = useMemo<WizardStep<PatientWizardCtx>[]>(
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

      // Data pages skip when the condition is not chosen OR is queued for removal.
      const dataPages: WizardStep<PatientWizardCtx>[] = [
        {
          id: "dados-gestante",
          label: "Gestante",
          shouldSkip: (c) =>
            !c.chosenConditions.includes("gestantes") ||
            c.toRemove.includes("gestantes"),
          render: (props) => <StepDadosGestante {...props} />,
        },
        {
          id: "dados-tb",
          label: "Tuberculose",
          shouldSkip: (c) =>
            !c.chosenConditions.includes("tuberculose") ||
            c.toRemove.includes("tuberculose"),
          render: (props) => <StepDadosTB {...props} />,
        },
        {
          id: "dados-has",
          label: "HAS",
          shouldSkip: (c) =>
            !c.chosenConditions.includes("hipertensao") ||
            c.toRemove.includes("hipertensao"),
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

      if (internalMode.kind === "edit") {
        return [
          {
            id: "identidade",
            label: "Identidade",
            render: (props) => <StepIdentidade {...props} lockCns />,
          },
          {
            id: "endereco",
            label: "Endereço",
            render: (props) => <StepEndereco {...props} />,
          },
          {
            id: "gerenciar-condicoes",
            label: "Condições",
            render: (props) => <StepGerenciarCondicoes {...props} />,
          },
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

  const initialCtx = stashedCtx ?? buildInitialCtx(mode);

  const headline =
    internalMode.kind === "new"
      ? "Novo paciente"
      : internalMode.kind === "edit"
        ? "Editar paciente"
        : "Adicionar condição";

  return (
    <>
      {collisionBanner && (
        <div
          role="alert"
          className="fixed left-1/2 top-4 z-[10000] -translate-x-1/2 rounded-lg border border-alert-amber/40 bg-white px-4 py-2.5 text-sm text-amber-900 shadow-lg"
        >
          {collisionBanner}
          <button
            type="button"
            onClick={() => { setCollisionBanner(null); }}
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
