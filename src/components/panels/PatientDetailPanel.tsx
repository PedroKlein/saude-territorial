"use client";

/**
 * PatientDetailPanel — the "a patient is a patient" right-side panel (UP-2.2/2.3/2.4).
 *
 * Identity block + N collapsible condition cards, one per non-null extension row.
 * Edit mode wraps the whole panel in a single react-hook-form instance.
 *
 * LGPD: patient fields are never written to logs; only aggregate/opaque error
 * codes reach console statements.
 */

import { useState, useEffect } from "react";
import { useForm, Controller, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "motion/react";
import {
  Baby,
  Wind,
  HeartPulse,
  MapPin,
  Phone,
  User,
  MoreVertical,
  Plus,
  Pencil,
  X,
  Save,
  RotateCcw,
  Trash2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

import { useMapStore } from "@/stores/mapStore";
import { usePatient } from "@/hooks/usePatient";
import { useDeletePatient, useDeleteCondition } from "@/hooks/useDeletePatient";
import { useUpdatePatient } from "@/hooks/useUpdatePatient";
import { PatientPatchSchema, type ExtensionLayer } from "@/lib/patients/schemas";
import { type z } from "zod";
import type { UnifiedPatient } from "@/app/api/patients/[id]/route";
import { evaluatePatient } from "@/lib/alerts/engine";
import { ALERT_RULES } from "@/config/alert-rules.config";
import { computeDpp, computeIg, formatIg } from "@/lib/patients/dates";
import { format } from "date-fns";

import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { PhoneInput } from "@/components/ui/masked-input";
import { DatePicker } from "@/components/ui/date-picker";
import { ConfirmDialog } from "@/components/panels/ConfirmDialog";
import { Field } from "@/components/panels/Field";
import { Computed } from "@/components/panels/Computed";
import { MICROAREAS_GEOJSON } from "@/config/microareas.data";
import { PatientWizard } from "@/components/wizard/PatientWizard";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const GESTANTE_COLOR = "oklch(72% 0.11 15)";
const TB_COLOR = "oklch(60% 0.09 40)";
const HAS_COLOR = "oklch(60% 0.13 275)";

const MICROAREA_OPTIONS = (
  MICROAREAS_GEOJSON.features as Array<{
    properties: { id: string; nome: string } | null;
  }>
).flatMap((f) =>
  f.properties ? [{ value: f.properties.id, label: f.properties.nome }] : [],
);

// ---------------------------------------------------------------------------
// Form type — the Zod schema's INPUT shape (before transforms)
// ---------------------------------------------------------------------------

/** Typed form values aligned to PatientPatchSchema's input so zodResolver works. */
type PanelFormValues = z.input<typeof PatientPatchSchema>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Parse Brazilian `dd/MM/yyyy` display string into a JS Date.
 * Returns null for null/empty/invalid input.
 */
function parseBrDate(s: string | null | undefined): Date | null {
  if (!s) return null;
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s);
  if (!m) return null;
  return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
}

/** Compute age in years from a `dd/MM/yyyy` date string. */
function computeAgeFromBr(dob: string | null): number | null {
  const d = parseBrDate(dob);
  if (!d) return null;
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
  return age;
}

/** Two-letter initials from a full name. */
function getInitials(nome: string): string {
  return nome
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

/** True if any field in the dirty-fields object tree is marked dirty. */
function hasDirty(obj: unknown): boolean {
  if (typeof obj === "boolean") return obj;
  if (typeof obj === "object" && obj !== null) {
    return Object.values(obj).some(hasDirty);
  }
  return false;
}

/** Build react-hook-form default values from a unified patient record. */
function buildDefaults(p: UnifiedPatient): PanelFormValues {
  return {
    base: {
      nomeCompleto: p.nomeCompleto ?? "",
      dataNascimento: p.dataNascimento ?? "",
      telefone: p.telefone ?? "",
      rua: p.rua ?? "",
      numero: p.numero ?? "",
      complemento: p.complemento ?? "",
      bairro: p.bairro ?? "",
      microarea: p.microarea ?? "",
      vulnerabilidades: p.vulnerabilidades ?? "",
    },
    gestantes: p.gestante
      ? {
          dum: (p.gestante.dum as string | null) ?? "",
          risco: (p.gestante.risco as string | null) ?? "",
          dataUltimaConsulta: (p.gestante.dataUltimaConsulta as string | null) ?? "",
          dataProximaConsulta: (p.gestante.dataProximaConsulta as string | null) ?? "",
          numeroConsultas: (p.gestante.numeroConsultas as number | null) ?? undefined,
          pressaoArterial: (p.gestante.pressaoArterial as string | null) ?? "",
          vacinaDtpa: (p.gestante.vacinaDtpa as string | null) ?? "",
          igAbertura: (p.gestante.igAbertura as string | null) ?? "",
          hasPreviaTag: (p.gestante.hasPreviaTag as string | null) ?? "",
          diabetesPreviaTag: (p.gestante.diabetesPreviaTag as string | null) ?? "",
        }
      : undefined,
    tuberculose: p.tuberculose
      ? {
          tipo: (p.tuberculose.tipo as string | null) ?? "",
          formaClinica: (p.tuberculose.formaClinica as string | null) ?? "",
          tipoEntrada: (p.tuberculose.tipoEntrada as string | null) ?? "",
          esquema: (p.tuberculose.esquema as string | null) ?? "",
          dataInicio: (p.tuberculose.dataInicio as string | null) ?? "",
          tdoStatus: (p.tuberculose.tdoStatus as string | null) ?? "",
          encerramentoMotivo: (p.tuberculose.encerramentoMotivo as string | null) ?? "",
          encerramentoData: (p.tuberculose.encerramentoData as string | null) ?? "",
          baciloscopiaResultado: (p.tuberculose.baciloscopiaResultado as string | null) ?? "",
          galRegistro: (p.tuberculose.galRegistro as string | null) ?? "",
        }
      : undefined,
    hipertensao: p.has
      ? {
          dataUltimaConsulta: (p.has.dataUltimaConsulta as string | null) ?? "",
          dataProximaConsulta: (p.has.dataProximaConsulta as string | null) ?? "",
          dataUltimaAfericaoPa: (p.has.dataUltimaAfericaoPa as string | null) ?? "",
          pressaoArterial: (p.has.pressaoArterial as string | null) ?? "",
          registroNotas: (p.has.registroNotas as string | null) ?? "",
          encaminhamentos: (p.has.encaminhamentos as string | null) ?? "",
        }
      : undefined,
  };
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function LoadingSkeleton({ onClose }: { onClose: () => void }) {
  return (
    <aside className="absolute inset-x-0 bottom-0 z-[1000] flex max-h-[70vh] flex-col overflow-hidden rounded-t-2xl border-t bg-white shadow-lg md:inset-x-auto md:right-0 md:top-0 md:h-full md:max-h-none md:w-[22rem] md:rounded-none md:border-l md:border-t-0">
      <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-3">
        <div className="h-4 w-32 animate-pulse rounded bg-neutral-200" />
        <button
          onClick={onClose}
          className="rounded-md p-1 text-neutral-400 hover:bg-neutral-100"
          aria-label="Fechar painel"
        >
          <X className="size-4" />
        </button>
      </div>
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-5">
        <div className="flex items-start gap-3">
          <div className="size-11 animate-pulse rounded-full bg-neutral-200 shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-3/4 animate-pulse rounded bg-neutral-200" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-neutral-200" />
          </div>
        </div>
        <div className="h-24 animate-pulse rounded-lg bg-neutral-200" />
        <div className="h-24 animate-pulse rounded-lg bg-neutral-200" />
      </div>
    </aside>
  );
}

function ErrorState({
  onRetry,
  onClose,
}: {
  onRetry: () => void;
  onClose: () => void;
}) {
  return (
    <aside className="absolute inset-x-0 bottom-0 z-[1000] flex max-h-[40vh] flex-col overflow-hidden rounded-t-2xl border-t bg-white shadow-lg md:inset-x-auto md:right-0 md:top-0 md:h-full md:max-h-none md:w-[22rem] md:rounded-none md:border-l md:border-t-0">
      <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-3">
        <span className="text-sm font-medium text-neutral-700">Erro ao carregar</span>
        <button
          onClick={onClose}
          className="rounded-md p-1 text-neutral-400 hover:bg-neutral-100"
          aria-label="Fechar painel"
        >
          <X className="size-4" />
        </button>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-sm text-neutral-500">
          Não foi possível carregar os dados do paciente.
        </p>
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RotateCcw className="mr-1.5 size-3.5" />
          Tentar novamente
        </Button>
      </div>
    </aside>
  );
}

// Alert chip in the identity block
function AlertChip({
  level,
  label,
}: {
  level: "vermelho" | "amarelo";
  label: string;
}) {
  const styles =
    level === "vermelho"
      ? {
          bg: "oklch(96% 0.03 25)",
          fg: "oklch(38% 0.15 25)",
          border: "oklch(85% 0.10 25)",
        }
      : {
          bg: "oklch(97% 0.04 75)",
          fg: "oklch(42% 0.13 65)",
          border: "oklch(85% 0.09 75)",
        };
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium"
      style={{
        backgroundColor: styles.bg,
        color: styles.fg,
        borderColor: styles.border,
      }}
    >
      {label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export function PatientDetailPanel() {
  const selectedPatient = useMapStore((s) => s.selectedPatient);
  const setSelectedPatient = useMapStore((s) => s.setSelectedPatient);

  if (!selectedPatient) return null;

  return (
    <PanelInner
      id={selectedPatient}
      onClose={() => setSelectedPatient(null)}
    />
  );
}

function PanelInner({ id, onClose }: { id: string; onClose: () => void }) {
  const {
    data: patient,
    isLoading,
    isError,
    refetch,
  } = usePatient(id);

  if (isLoading) return <LoadingSkeleton onClose={onClose} />;
  if (isError || !patient) return <ErrorState onRetry={() => void refetch()} onClose={onClose} />;

  return <PanelContent patient={patient} onClose={onClose} />;
}

// ---------------------------------------------------------------------------
// PanelContent — the real panel once patient data is available
// ---------------------------------------------------------------------------

type ConfirmState =
  | { type: "patient" }
  | { type: "condition"; layer: ExtensionLayer }
  | null;

function PanelContent({
  patient,
  onClose,
}: {
  patient: UnifiedPatient;
  onClose: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [confirmState, setConfirmState] = useState<ConfirmState>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState<
    Partial<Record<string, boolean>>
  >({});

  // Cards that are currently visible in the accordion
  const [openCards, setOpenCards] = useState<string[]>(["gestante", "tuberculose", "has"]);

  const deletePatient = useDeletePatient();
  const deleteCondition = useDeleteCondition();
  const updatePatient = useUpdatePatient();

  // ---------------------------------------------------------------------------
  // Form
  // ---------------------------------------------------------------------------

  const form = useForm<PanelFormValues>({
    resolver: zodResolver(PatientPatchSchema),
    defaultValues: buildDefaults(patient),
  });

  // Sync form defaults when patient data refreshes after a save
  useEffect(() => {
    form.reset(buildDefaults(patient));
  }, [patient, form]);

  // Watch DUM for live DPP/IG computation
  const watchedDum = form.watch("gestantes.dum");
  const dumDate = parseBrDate(watchedDum as string | undefined);
  const liveDpp = dumDate ? format(computeDpp(dumDate), "dd/MM/yyyy") : null;
  const liveIg = dumDate ? formatIg(computeIg(dumDate)) : null;

  // ---------------------------------------------------------------------------
  // Alert evaluation
  // ---------------------------------------------------------------------------

  const alerts: Array<{ level: "vermelho" | "amarelo"; label: string }> = [];

  const gestantePayload = patient.gestante
    ? { ...patient, ...patient.gestante }
    : null;
  if (gestantePayload) {
    const r = evaluatePatient(ALERT_RULES, gestantePayload, "gestantes");
    if (r.level === "vermelho" || r.level === "amarelo") {
      alerts.push({ level: r.level as "vermelho" | "amarelo", label: "Gestante" });
    }
  }
  if (patient.tuberculose) {
    const r = evaluatePatient(ALERT_RULES, { ...patient, ...patient.tuberculose }, "tuberculose");
    if (r.level === "vermelho" || r.level === "amarelo") {
      alerts.push({ level: r.level as "vermelho" | "amarelo", label: "TB" });
    }
  }
  if (patient.has) {
    const r = evaluatePatient(ALERT_RULES, { ...patient, ...patient.has }, "hipertensao");
    if (r.level === "vermelho" || r.level === "amarelo") {
      alerts.push({ level: r.level as "vermelho" | "amarelo", label: "HAS" });
    }
  }

  // ---------------------------------------------------------------------------
  // Condition card definitions
  // ---------------------------------------------------------------------------

  const CONDITION_CARDS = [
    {
      key: "gestante",
      data: patient.gestante,
      layer: "gestantes" as ExtensionLayer,
      label: "Gestante",
      color: GESTANTE_COLOR,
      Icon: Baby,
      formKey: "gestantes" as const,
    },
    {
      key: "tuberculose",
      data: patient.tuberculose,
      layer: "tuberculose" as ExtensionLayer,
      label: "Tuberculose",
      color: TB_COLOR,
      Icon: Wind,
      formKey: "tuberculose" as const,
    },
    {
      key: "has",
      data: patient.has,
      layer: "hipertensao" as ExtensionLayer,
      label: "HAS — Hipertensão",
      color: HAS_COLOR,
      Icon: HeartPulse,
      formKey: "hipertensao" as const,
    },
  ] as const;

  const activeCards = CONDITION_CARDS.filter((c) => c.data != null);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleSave = form.handleSubmit(async (values) => {
    const dirty = form.formState.dirtyFields;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body: Record<string, unknown> = {};
    if (hasDirty(dirty.base)) body.base = values.base;
    if (hasDirty(dirty.gestantes)) body.gestantes = values.gestantes;
    if (hasDirty(dirty.tuberculose)) body.tuberculose = values.tuberculose;
    if (hasDirty(dirty.hipertensao)) body.hipertensao = values.hipertensao;

    if (Object.keys(body).length === 0) {
      setIsEditing(false);
      return;
    }

    try {
      await updatePatient.mutateAsync({
        id: patient.id,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        body: body as any,
      });
      setIsEditing(false);
    } catch {
      // Error surfaced via form state / updatePatient.error
    }
  });

  const handleCancelEdit = () => {
    form.reset(buildDefaults(patient));
    setIsEditing(false);
  };

  const handleDeletePatient = async () => {
    await deletePatient.mutateAsync({ id: patient.id });
    setConfirmState(null);
  };

  const handleDeleteCondition = async (layer: ExtensionLayer) => {
    await deleteCondition.mutateAsync({ id: patient.id, condicao: layer });
    setConfirmState(null);
  };

  const toggleAdvanced = (key: string) => {
    setShowAdvanced((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // ---------------------------------------------------------------------------
  // Computed display strings
  // ---------------------------------------------------------------------------

  const age = computeAgeFromBr(patient.dataNascimento);
  const initials = getInitials(patient.nomeCompleto || "?");

  const endereco = [patient.rua, patient.numero, patient.complemento]
    .filter(Boolean)
    .join(", ");

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <aside className="absolute inset-x-0 bottom-0 z-[1000] flex max-h-[85vh] flex-col overflow-hidden rounded-t-2xl border-t bg-white shadow-lg md:inset-x-auto md:right-0 md:top-0 md:h-full md:max-h-none md:w-[22rem] md:rounded-none md:border-l md:border-t-0">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-neutral-200 px-5 py-3">
        <span className="text-sm font-semibold text-neutral-700">
          {isEditing ? "Editar paciente" : "Detalhes do paciente"}
        </span>
        <button
          onClick={onClose}
          className="rounded-md p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
          aria-label="Fechar painel"
        >
          <X className="size-4" />
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto">
        {/* Identity block */}
        <div className="border-b border-neutral-200 px-5 py-4">
          <div className="flex items-start gap-3">
            {/* Avatar */}
            <div
              className="flex size-11 shrink-0 items-center justify-center rounded-full font-semibold text-white shadow-sm"
              style={{ backgroundColor: "oklch(58% 0.10 195)" }}
              aria-hidden
            >
              {initials}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div>
                  {isEditing ? (
                    <Field label="Nome completo" error={form.formState.errors.base?.nomeCompleto?.message}>
                      <Input
                        {...form.register("base.nomeCompleto")}
                        className="text-sm font-semibold"
                        aria-label="Nome completo"
                      />
                    </Field>
                  ) : (
                    <>
                      <h2 className="text-base font-semibold leading-tight text-neutral-900">
                        {patient.nomeCompleto}
                      </h2>
                      <div className="mt-0.5 text-xs text-neutral-500">
                        {age != null ? `${age} anos` : null}
                        {age != null && patient.dataNascimento ? " · " : null}
                        {patient.dataNascimento}
                        {patient.microarea ? ` · ${patient.microarea}` : null}
                      </div>
                    </>
                  )}
                </div>
                {!isEditing && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="shrink-0 rounded-md p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
                    aria-label="Editar paciente"
                  >
                    <Pencil className="size-3.5" />
                  </button>
                )}
              </div>

              {/* Alert chips */}
              {!isEditing && alerts.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {alerts.map((a, i) => (
                    <AlertChip key={i} level={a.level} label={a.label} />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Contact / identity details */}
          {!isEditing ? (
            <dl className="mt-3 space-y-1.5 text-sm">
              {endereco && (
                <div className="flex items-start gap-2 text-neutral-600">
                  <MapPin className="mt-0.5 size-3.5 shrink-0 text-neutral-400" />
                  <span>{endereco}</span>
                </div>
              )}
              {patient.telefone && (
                <div className="flex items-center gap-2 text-neutral-600">
                  <Phone className="size-3.5 shrink-0 text-neutral-400" />
                  <span>{patient.telefone}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-neutral-600">
                <User className="size-3.5 shrink-0 text-neutral-400" />
                <span className="font-mono text-xs tracking-wide">
                  {patient.cns}
                </span>
              </div>
            </dl>
          ) : (
            /* Edit identity fields */
            <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-3">
              <Field label="Data nasc." className="col-span-1">
                <Controller
                  control={form.control}
                  name="base.dataNascimento"
                  render={({ field }) => (
                    <DatePicker
                      value={parseBrDate(field.value as string)}
                      onChange={(d) =>
                        field.onChange(d ? format(d, "dd/MM/yyyy") : "")
                      }
                      ariaLabel="Data de nascimento"
                    />
                  )}
                />
              </Field>
              <Field label="Microárea" className="col-span-1">
                <Controller
                  control={form.control}
                  name="base.microarea"
                  render={({ field }) => (
                    <Select
                      value={(field.value as string) || ""}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger className="w-full" aria-label="Microárea">
                        <SelectValue placeholder="Selecionar" />
                      </SelectTrigger>
                      <SelectContent>
                        {MICROAREA_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>
              <Field label="Telefone" className="col-span-2">
                <Controller
                  control={form.control}
                  name="base.telefone"
                  render={({ field }) => (
                    <PhoneInput
                      value={(field.value as string) || ""}
                      onValueChange={field.onChange}
                      aria-label="Telefone"
                    />
                  )}
                />
              </Field>
              <Field label="Rua" className="col-span-2">
                <Input {...form.register("base.rua")} aria-label="Rua" />
              </Field>
              <Field label="Número" className="col-span-1">
                <Input {...form.register("base.numero")} aria-label="Número" />
              </Field>
              <Field label="Complemento" className="col-span-1">
                <Input
                  {...form.register("base.complemento")}
                  aria-label="Complemento"
                />
              </Field>
              <Field label="Vulnerabilidades" className="col-span-2">
                <Textarea
                  {...form.register("base.vulnerabilidades")}
                  rows={2}
                  aria-label="Vulnerabilidades"
                />
              </Field>
            </div>
          )}

          {/* Vulnerabilidades callout (view mode) */}
          {!isEditing && patient.vulnerabilidades && (
            <div className="mt-3 rounded-md bg-amber-50/70 px-2.5 py-1.5 text-[12px] text-amber-900">
              <span className="font-medium">Vulnerabilidades:</span>{" "}
              {patient.vulnerabilidades}
            </div>
          )}
        </div>

        {/* Condition cards */}
        <div className="px-4 py-3">
          <Accordion
            type="multiple"
            value={openCards}
            onValueChange={setOpenCards}
            className="flex flex-col gap-2.5"
          >
            <AnimatePresence>
              {activeCards.map((card) => {
                if (card.data == null) return null;
                const data = card.data;
                const isAdvanced = showAdvanced[card.key] ?? false;
                const errors = form.formState.errors;

                return (
                  <motion.div
                    key={card.key}
                    layout
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8, height: 0 }}
                    transition={{ duration: 0.18 }}
                  >
                    <AccordionItem
                      value={card.key}
                      className="overflow-hidden rounded-[10px] border border-neutral-200 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)]"
                      style={{
                        borderLeftColor: card.color,
                        borderLeftWidth: "3px",
                      }}
                    >
                      <AccordionTrigger className="px-4 py-3 hover:bg-neutral-50 hover:no-underline [&>svg]:hidden">
                        <div className="flex flex-1 items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            {/* Colored icon circle */}
                            <span
                              className="flex size-8 shrink-0 items-center justify-center rounded-full text-white"
                              style={{ backgroundColor: card.color }}
                            >
                              <card.Icon className="size-4" />
                            </span>
                            <div>
                              <div className="text-sm font-semibold text-neutral-900">
                                {card.label}
                              </div>
                              <div className="text-xs text-neutral-500">
                                {card.key === "gestante" && (
                                  <>
                                    {liveIg
                                      ? `${liveIg}`
                                      : data.ig != null
                                        ? `${data.ig as number} sem`
                                        : null}
                                    {data.risco
                                      ? ` · risco ${data.risco as string}`
                                      : null}
                                  </>
                                )}
                                {card.key === "tuberculose" &&
                                  (data.dataInicio
                                    ? `Início ${data.dataInicio as string}`
                                    : "Sem data de início")}
                                {card.key === "has" &&
                                  (data.dataUltimaConsulta
                                    ? `Última consulta ${data.dataUltimaConsulta as string}`
                                    : "Sem consulta registrada")}
                              </div>
                            </div>
                          </div>

                          {/* Card actions */}
                          <div className="flex items-center gap-1">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  className="rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
                                  onClick={(e) => e.stopPropagation()}
                                  aria-label="Ações da condição"
                                >
                                  <MoreVertical className="size-3.5" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-44">
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setConfirmState({
                                      type: "condition",
                                      layer: card.layer,
                                    });
                                  }}
                                >
                                  <Trash2 className="mr-2 size-3.5" />
                                  Remover condição
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                            {/* Chevron indicator (manual since AccordionTrigger's default is hidden) */}
                            {openCards.includes(card.key) ? (
                              <ChevronUp className="size-4 text-neutral-400" />
                            ) : (
                              <ChevronDown className="size-4 text-neutral-400" />
                            )}
                          </div>
                        </div>
                      </AccordionTrigger>

                      <AccordionContent className="border-t border-neutral-100">
                        <div className="px-4 py-4">
                          {card.key === "gestante" && (
                            <GestanteCardBody
                              data={data}
                              isEditing={isEditing}
                              isAdvanced={isAdvanced}
                              form={form}
                              liveDpp={liveDpp}
                              liveIg={liveIg}
                              errors={errors}
                            />
                          )}
                          {card.key === "tuberculose" && (
                            <TuberculoseCardBody
                              data={data}
                              isEditing={isEditing}
                              isAdvanced={isAdvanced}
                              form={form}
                              errors={errors}
                            />
                          )}
                          {card.key === "has" && (
                            <HasCardBody
                              data={data}
                              isEditing={isEditing}
                              isAdvanced={isAdvanced}
                              form={form}
                              errors={errors}
                            />
                          )}

                          <button
                            type="button"
                            onClick={() => toggleAdvanced(card.key)}
                            className="mt-3 text-xs font-medium text-neutral-500 hover:text-neutral-700"
                          >
                            {isAdvanced
                              ? "Ocultar campos avançados ↑"
                              : "Mostrar campos avançados →"}
                          </button>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </Accordion>
        </div>
      </div>

      {/* Footer */}
      <div className="shrink-0 border-t border-neutral-200 bg-neutral-50 px-4 py-3">
        {isEditing ? (
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={handleCancelEdit}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              className="flex-1 bg-brand text-white hover:bg-brand/80"
              onClick={() => void handleSave()}
              disabled={updatePatient.isPending}
            >
              <Save className="mr-1 size-3.5" />
              {updatePatient.isPending ? "Salvando…" : "Salvar"}
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 border-dashed text-neutral-500"
              onClick={() => setWizardOpen(true)}
            >
              <Plus className="mr-1 size-3.5" />
              Adicionar condição
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(true)}
            >
              <Pencil className="mr-1 size-3.5" />
              Editar
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setConfirmState({ type: "patient" })}
            >
              <Trash2 className="mr-1 size-3.5" />
              Excluir
            </Button>
          </div>
        )}

        {/* Update timestamp */}
        {patient.updatedAt && (
          <p className="mt-1.5 text-[11px] text-neutral-400">
            Atualizado {patient.updatedAt}
          </p>
        )}
      </div>

      {/* Confirm dialogs */}
      {confirmState?.type === "patient" && (
        <ConfirmDialog
          title="Excluir paciente"
          body="Esta ação remove o paciente e todas as condições vinculadas. Não pode ser desfeita."
          confirmLabel="Excluir"
          destructive
          isPending={deletePatient.isPending}
          onConfirm={() => void handleDeletePatient()}
          onCancel={() => setConfirmState(null)}
        />
      )}
      {confirmState?.type === "condition" && (
        <ConfirmDialog
          title="Remover condição"
          body={`Remover a condição do paciente. Os demais dados permanecem.`}
          confirmLabel="Remover"
          destructive
          isPending={deleteCondition.isPending}
          onConfirm={() =>
            void handleDeleteCondition(confirmState.layer)
          }
          onCancel={() => setConfirmState(null)}
        />
      )}

      <PatientWizard
        open={wizardOpen}
        mode={{
          kind: "add-condition",
          patientId: patient.id,
          alreadyAttached: [
            patient.gestante ? "gestantes" : null,
            patient.tuberculose ? "tuberculose" : null,
            patient.has ? "hipertensao" : null,
          ].filter((v): v is "gestantes" | "tuberculose" | "hipertensao" => v !== null),
        }}
        onClose={() => setWizardOpen(false)}
      />
    </aside>
  );
}

// ---------------------------------------------------------------------------
// Card body sub-components
// ---------------------------------------------------------------------------

type CardBodyProps = {
  data: Record<string, unknown>;
  isEditing: boolean;
  isAdvanced: boolean;
  form: UseFormReturn<PanelFormValues>;
  errors: UseFormReturn<PanelFormValues>["formState"]["errors"];
};

function GestanteCardBody({
  data,
  isEditing,
  isAdvanced,
  form,
  liveDpp,
  liveIg,
  errors,
}: CardBodyProps & { liveDpp: string | null; liveIg: string | null }) {
  if (!isEditing) {
    return (
      <>
        <div className="mb-2 text-[11px] font-medium uppercase tracking-wider text-neutral-400">
          Pré-natal
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
          <Field label="DUM">
            <span className="text-sm text-neutral-800">
              {(data.dum as string | null) ?? "—"}
            </span>
          </Field>
          <Field label="DPP (calculado)">
            <Computed
              value={liveDpp ?? (data.dpp as string | null) ?? "—"}
              ariaLabel="Data provável do parto"
            />
          </Field>
          <Field label="IG (calculado)">
            <Computed
              value={
                liveIg ??
                (data.ig != null ? `${data.ig as number} sem` : "—")
              }
              ariaLabel="Idade gestacional"
            />
          </Field>
          <Field label="Risco">
            <span className="text-sm text-neutral-800">
              {(data.risco as string | null) ?? "—"}
            </span>
          </Field>
          <Field label="Nº consultas">
            <span className="text-sm text-neutral-800">
              {data.numeroConsultas != null
                ? String(data.numeroConsultas as number)
                : "—"}
            </span>
          </Field>
          <Field label="Próxima consulta">
            <span className="text-sm text-neutral-800">
              {(data.dataProximaConsulta as string | null) ?? "—"}
            </span>
          </Field>
          <Field label="PA">
            <span className="font-mono text-sm text-neutral-800">
              {(data.pressaoArterial as string | null) ?? "—"}
            </span>
          </Field>
          <Field label="Vacina dTpa">
            <span className="text-sm text-neutral-800">
              {(data.vacinaDtpa as string | null) ?? "—"}
            </span>
          </Field>
        </div>
        {isAdvanced && (
          <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-neutral-100 pt-3">
            <Field label="IG na abertura PN">
              <span className="text-sm text-neutral-800">
                {(data.igAbertura as string | null) ?? "—"}
              </span>
            </Field>
            <Field label="HAS prévia">
              <span className="text-sm text-neutral-800">
                {(data.hasPreviaTag as string | null) ?? "—"}
              </span>
            </Field>
            <Field label="Diabetes prévia">
              <span className="text-sm text-neutral-800">
                {(data.diabetesPreviaTag as string | null) ?? "—"}
              </span>
            </Field>
            <Field label="Última consulta">
              <span className="text-sm text-neutral-800">
                {(data.dataUltimaConsulta as string | null) ?? "—"}
              </span>
            </Field>
          </div>
        )}
      </>
    );
  }

  // Edit mode
  return (
    <>
      <div className="mb-2 text-[11px] font-medium uppercase tracking-wider text-neutral-400">
        Pré-natal
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-3">
        <Field
          label="DUM"
          error={errors.gestantes?.dum?.message}
        >
          <Controller
            control={form.control}
            name="gestantes.dum"
            render={({ field }) => (
              <DatePicker
                value={parseBrDate(field.value as string)}
                onChange={(d) =>
                  field.onChange(d ? format(d, "dd/MM/yyyy") : "")
                }
                ariaLabel="DUM"
              />
            )}
          />
        </Field>
        <Field label="DPP (calculado)">
          <Computed
            value={liveDpp ?? (data.dpp as string | null) ?? "—"}
            ariaLabel="Data provável do parto"
          />
        </Field>
        <Field label="IG (calculado)">
          <Computed
            value={liveIg ?? (data.ig != null ? `${data.ig as number} sem` : "—")}
            ariaLabel="Idade gestacional"
          />
        </Field>
        <Field label="Risco" error={errors.gestantes?.risco?.message}>
          <Controller
            control={form.control}
            name="gestantes.risco"
            render={({ field }) => (
              <Select
                value={(field.value as string) || ""}
                onValueChange={field.onChange}
              >
                <SelectTrigger className="w-full" aria-label="Risco">
                  <SelectValue placeholder="Selecionar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="habitual">Habitual</SelectItem>
                  <SelectItem value="alto">Alto</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </Field>
        <Field label="Próx. consulta" error={errors.gestantes?.dataProximaConsulta?.message}>
          <Controller
            control={form.control}
            name="gestantes.dataProximaConsulta"
            render={({ field }) => (
              <DatePicker
                value={parseBrDate(field.value as string)}
                onChange={(d) =>
                  field.onChange(d ? format(d, "dd/MM/yyyy") : "")
                }
                ariaLabel="Próxima consulta"
              />
            )}
          />
        </Field>
        <Field label="PA">
          <Input
            {...form.register("gestantes.pressaoArterial")}
            aria-label="Pressão arterial"
            className="font-mono"
          />
        </Field>

        {isAdvanced && (
          <>
            <Field label="IG abertura PN" className="col-span-2">
              <Input
                {...form.register("gestantes.igAbertura")}
                aria-label="IG na abertura do pré-natal"
              />
            </Field>
            <Field label="HAS prévia">
              <Input
                {...form.register("gestantes.hasPreviaTag")}
                aria-label="HAS prévia"
              />
            </Field>
            <Field label="Diabetes prévia">
              <Input
                {...form.register("gestantes.diabetesPreviaTag")}
                aria-label="Diabetes prévia"
              />
            </Field>
          </>
        )}
      </div>
    </>
  );
}

function TuberculoseCardBody({
  data,
  isEditing,
  isAdvanced,
  form,
  errors,
}: CardBodyProps) {
  if (!isEditing) {
    return (
      <>
        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
          <Field label="Tipo">
            <span className="text-sm text-neutral-800">
              {(data.tipo as string | null) ?? "—"}
            </span>
          </Field>
          <Field label="Forma clínica">
            <span className="text-sm text-neutral-800">
              {(data.formaClinica as string | null) ?? "—"}
            </span>
          </Field>
          <Field label="Data início">
            <span className="text-sm text-neutral-800">
              {(data.dataInicio as string | null) ?? "—"}
            </span>
          </Field>
          <Field label="TDO">
            <span className="text-sm text-neutral-800">
              {(data.tdoStatus as string | null) ?? "—"}
            </span>
          </Field>
        </div>
        {isAdvanced && (
          <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-neutral-100 pt-3">
            <Field label="Esquema">
              <span className="text-sm text-neutral-800">
                {(data.esquema as string | null) ?? "—"}
              </span>
            </Field>
            <Field label="Tipo entrada">
              <span className="text-sm text-neutral-800">
                {(data.tipoEntrada as string | null) ?? "—"}
              </span>
            </Field>
            <Field label="Encerramento">
              <span className="text-sm text-neutral-800">
                {(data.encerramentoData as string | null) ?? "—"}
              </span>
            </Field>
            <Field label="Motivo enc.">
              <span className="text-sm text-neutral-800">
                {(data.encerramentoMotivo as string | null) ?? "—"}
              </span>
            </Field>
            <Field label="Baciloscopia">
              <span className="text-sm text-neutral-800">
                {(data.baciloscopiaResultado as string | null) ?? "—"}
              </span>
            </Field>
            <Field label="GAL">
              <span className="text-sm text-neutral-800">
                {(data.galRegistro as string | null) ?? "—"}
              </span>
            </Field>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-3">
      <Field label="Tipo">
        <Input {...form.register("tuberculose.tipo")} aria-label="Tipo de TB" />
      </Field>
      <Field label="Forma clínica">
        <Input
          {...form.register("tuberculose.formaClinica")}
          aria-label="Forma clínica"
        />
      </Field>
      <Field label="Data início" error={errors.tuberculose?.dataInicio?.message}>
        <Controller
          control={form.control}
          name="tuberculose.dataInicio"
          render={({ field }) => (
            <DatePicker
              value={parseBrDate(field.value as string)}
              onChange={(d) =>
                field.onChange(d ? format(d, "dd/MM/yyyy") : "")
              }
              ariaLabel="Data de início do tratamento"
            />
          )}
        />
      </Field>
      <Field label="TDO">
        <Input
          {...form.register("tuberculose.tdoStatus")}
          aria-label="Status TDO"
        />
      </Field>
      {isAdvanced && (
        <>
          <Field label="Esquema">
            <Input
              {...form.register("tuberculose.esquema")}
              aria-label="Esquema de tratamento"
            />
          </Field>
          <Field label="Tipo entrada">
            <Input
              {...form.register("tuberculose.tipoEntrada")}
              aria-label="Tipo de entrada"
            />
          </Field>
          <Field label="Encerramento" error={errors.tuberculose?.encerramentoData?.message}>
            <Controller
              control={form.control}
              name="tuberculose.encerramentoData"
              render={({ field }) => (
                <DatePicker
                  value={parseBrDate(field.value as string)}
                  onChange={(d) =>
                    field.onChange(d ? format(d, "dd/MM/yyyy") : "")
                  }
                  ariaLabel="Data de encerramento"
                />
              )}
            />
          </Field>
          <Field label="Baciloscopia">
            <Input
              {...form.register("tuberculose.baciloscopiaResultado")}
              aria-label="Resultado de baciloscopia"
            />
          </Field>
        </>
      )}
    </div>
  );
}

function HasCardBody({
  data,
  isEditing,
  isAdvanced,
  form,
  errors,
}: CardBodyProps) {
  if (!isEditing) {
    return (
      <>
        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
          <Field label="Última consulta">
            <span className="text-sm text-neutral-800">
              {(data.dataUltimaConsulta as string | null) ?? "—"}
            </span>
          </Field>
          <Field label="Próxima consulta">
            <span className="text-sm text-neutral-800">
              {(data.dataProximaConsulta as string | null) ?? "—"}
            </span>
          </Field>
          <Field label="Última aferição PA">
            <span className="text-sm text-neutral-800">
              {(data.dataUltimaAfericaoPa as string | null) ?? "—"}
            </span>
          </Field>
          <Field label="PA">
            <span className="font-mono text-sm text-neutral-800">
              {(data.pressaoArterial as string | null) ?? "—"}
            </span>
          </Field>
        </div>
        {isAdvanced && (
          <div className="mt-3 grid grid-cols-1 gap-y-3 border-t border-neutral-100 pt-3">
            {typeof data.registroNotas === "string" && data.registroNotas && (
              <div>
                <div className="mb-1 text-[11px] font-medium uppercase tracking-wider text-neutral-400">
                  Notas clínicas
                </div>
                <p className="text-sm text-neutral-800">{data.registroNotas}</p>
              </div>
            )}
            {typeof data.encaminhamentos === "string" && data.encaminhamentos && (
              <div>
                <div className="mb-1 text-[11px] font-medium uppercase tracking-wider text-neutral-400">
                  Encaminhamentos
                </div>
                <p className="text-sm text-neutral-800">{data.encaminhamentos}</p>
              </div>
            )}
          </div>
        )}
      </>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-3">
      <Field
        label="Última consulta"
        error={errors.hipertensao?.dataUltimaConsulta?.message}
      >
        <Controller
          control={form.control}
          name="hipertensao.dataUltimaConsulta"
          render={({ field }) => (
            <DatePicker
              value={parseBrDate(field.value as string)}
              onChange={(d) =>
                field.onChange(d ? format(d, "dd/MM/yyyy") : "")
              }
              ariaLabel="Data da última consulta"
            />
          )}
        />
      </Field>
      <Field
        label="Próxima consulta"
        error={errors.hipertensao?.dataProximaConsulta?.message}
      >
        <Controller
          control={form.control}
          name="hipertensao.dataProximaConsulta"
          render={({ field }) => (
            <DatePicker
              value={parseBrDate(field.value as string)}
              onChange={(d) =>
                field.onChange(d ? format(d, "dd/MM/yyyy") : "")
              }
              ariaLabel="Data da próxima consulta"
            />
          )}
        />
      </Field>
      <Field label="Aferição PA" error={errors.hipertensao?.dataUltimaAfericaoPa?.message}>
        <Controller
          control={form.control}
          name="hipertensao.dataUltimaAfericaoPa"
          render={({ field }) => (
            <DatePicker
              value={parseBrDate(field.value as string)}
              onChange={(d) =>
                field.onChange(d ? format(d, "dd/MM/yyyy") : "")
              }
              ariaLabel="Data da última aferição de PA"
            />
          )}
        />
      </Field>
      <Field label="PA">
        <Input
          {...form.register("hipertensao.pressaoArterial")}
          aria-label="Pressão arterial"
          className="font-mono"
        />
      </Field>
      {isAdvanced && (
        <>
          <Field label="Notas clínicas" className="col-span-2">
            <Textarea
              {...form.register("hipertensao.registroNotas")}
              rows={2}
              aria-label="Notas clínicas"
            />
          </Field>
          <Field label="Encaminhamentos" className="col-span-2">
            <Textarea
              {...form.register("hipertensao.encaminhamentos")}
              rows={2}
              aria-label="Encaminhamentos"
            />
          </Field>
        </>
      )}
    </div>
  );
}
