"use client";

/**
 * PatientDetailPanel — the right-side detail panel.
 *
 * View-only surface: no inline form. Edits happen in the `PatientWizard`
 * (opened in `kind: "edit"` mode via the "Editar" footer button). The
 * wizard is also the surface for adding new conditions and for the
 * "novo paciente" flow, so patient editing and creation share the exact
 * same steps, validation, and geolocation pin-drop UI.
 *
 * LGPD: patient data is only rendered in-context; nothing is logged.
 */

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Baby,
  Wind,
  HeartPulse,
  MapPin,
  Phone,
  User,
  Plus,
  Pencil,
  X,
  RotateCcw,
  Trash2,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import { useMapStore } from "@/stores/mapStore";
import { usePatient } from "@/hooks/usePatient";
import { usePatientData } from "@/hooks/usePatientData";
import { coincidenceKey } from "@/components/map/markerHelpers";
import { useDeletePatient } from "@/hooks/useDeletePatient";
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
import { ConfirmDialog } from "@/components/panels/ConfirmDialog";
import { Field } from "@/components/panels/Field";
import { Computed } from "@/components/panels/Computed";
import {
  PatientWizard,
  type PatientWizardMode,
} from "@/components/wizard/PatientWizard";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const GESTANTE_COLOR = "oklch(72% 0.11 15)";
const TB_COLOR = "oklch(60% 0.09 40)";
const HAS_COLOR = "oklch(60% 0.13 275)";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Parse Brazilian `dd/MM/yyyy` display string into a JS Date.
 * Returns null for null/empty/invalid input.
 */
function parseBrDate(s: string | null | undefined): Date | null {
  if (!s) return null;
  const [dd, mm, yyyy] = s.split("/");
  if (!dd || !mm || !yyyy) return null;
  const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
  return isNaN(d.getTime()) ? null : d;
}

/** Compute age in years from a `dd/MM/yyyy` date string. */
function computeAgeFromBr(dob: string | null): number | null {
  const d = parseBrDate(dob);
  if (!d) return null;
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age -= 1;
  return age;
}

/** Two-letter initials from a full name. */
function getInitials(nome: string): string {
  return nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function LoadingSkeleton({ onClose }: { onClose: () => void }) {
  return (
    <aside className="absolute inset-x-0 bottom-0 z-[1000] flex max-h-[85vh] flex-col overflow-hidden rounded-t-2xl border-t bg-white shadow-lg md:inset-x-auto md:right-0 md:top-0 md:h-full md:max-h-none md:w-[22rem] md:rounded-none md:border-l md:border-t-0">
      <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-3">
        <span className="text-sm font-medium text-neutral-700">Carregando…</span>
        <button
          onClick={onClose}
          className="rounded-md p-1 text-neutral-400 hover:bg-neutral-100"
          aria-label="Fechar painel"
        >
          <X className="size-4" />
        </button>
      </div>
      <div className="flex-1 space-y-4 p-6">
        <div className="h-12 w-full animate-pulse rounded bg-neutral-200" />
        <div className="h-24 w-full animate-pulse rounded bg-neutral-100" />
        <div className="h-32 w-full animate-pulse rounded bg-neutral-100" />
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
      onClose={() => { setSelectedPatient(null); }}
    />
  );
}

// ---------------------------------------------------------------------------
// CoincidencePicker — cycle through patients sharing the current coord.
// ---------------------------------------------------------------------------

function CoincidencePicker({
  currentId,
  lat,
  lng,
}: {
  currentId: string;
  lat: number | null;
  lng: number | null;
}) {
  const { data } = usePatientData();
  const setSelectedPatient = useMapStore((s) => s.setSelectedPatient);

  const coincidents = useMemo(() => {
    if (!data || lat == null || lng == null) return [] as { id: string; name: string }[];
    const key = coincidenceKey(lat, lng);
    const seen = new Set<string>();
    const list: { id: string; name: string }[] = [];
    for (const patients of Object.values(data)) {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- Object.values on Partial<Record> can yield undefined values at runtime
      if (!patients) continue;
      for (const p of patients) {
        if (seen.has(p.id)) continue;
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- PatientRecord.lat/lng are typed number but ungeocoded patients have null coords at runtime
        if (p.lat == null || p.lng == null) continue;
        if (coincidenceKey(p.lat, p.lng) !== key) continue;
        seen.add(p.id);
        list.push({ id: p.id, name: p.nomeCompleto ?? "(sem nome)" });
      }
    }
    return list;
  }, [data, lat, lng]);

  if (coincidents.length < 2) return null;
  const idx = coincidents.findIndex((p) => p.id === currentId);
  const position = idx === -1 ? 0 : idx;
  const next = coincidents[(position + 1) % coincidents.length];
  const prev = coincidents[(position - 1 + coincidents.length) % coincidents.length];
  if (!next || !prev) return null;

  return (
    <div className="flex items-center justify-between gap-2 border-b border-neutral-200 bg-amber-50 px-5 py-2 text-xs">
      <div className="flex min-w-0 items-center gap-1.5 text-amber-900">
        <MapPin className="size-3.5 shrink-0" />
        <span className="font-medium">{coincidents.length} pacientes neste endereço</span>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <button
          onClick={() => { setSelectedPatient(prev.id); }}
          className="rounded-md p-1 text-amber-900 hover:bg-amber-100"
          aria-label={`Ir para ${prev.name}`}
          title={prev.name}
        >
          <ChevronLeft className="size-3.5" />
        </button>
        <span className="font-mono tabular-nums text-[11px] text-amber-800">
          {position + 1}/{coincidents.length}
        </span>
        <button
          onClick={() => { setSelectedPatient(next.id); }}
          className="rounded-md p-1 text-amber-900 hover:bg-amber-100"
          aria-label={`Ir para ${next.name}`}
          title={next.name}
        >
          <ChevronRight className="size-3.5" />
        </button>
      </div>
    </div>
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

type ConfirmState = { type: "patient" } | null;

function PanelContent({
  patient,
  onClose,
}: {
  patient: UnifiedPatient;
  onClose: () => void;
}) {
  const [confirmState, setConfirmState] = useState<ConfirmState>(null);
  const [wizardMode, setWizardMode] = useState<PatientWizardMode | null>(null);
  const [showAdvanced, setShowAdvanced] = useState<
    Partial<Record<string, boolean>>
  >({});

  // Cards that are currently visible in the accordion
  const [openCards, setOpenCards] = useState<string[]>(["gestante", "tuberculose", "has"]);

  const deletePatient = useDeletePatient();

  // ---------------------------------------------------------------------------
  // Alert evaluation
  // ---------------------------------------------------------------------------

  const alerts: { level: "vermelho" | "amarelo"; label: string }[] = [];

  const gestantePayload = patient.gestante
    ? { ...patient, ...patient.gestante }
    : null;
  if (gestantePayload) {
    const r = evaluatePatient(ALERT_RULES, gestantePayload, "gestantes");
    if (r.level === "vermelho" || r.level === "amarelo") {
      alerts.push({ level: r.level, label: "Gestante" });
    }
  }
  if (patient.tuberculose) {
    const r = evaluatePatient(ALERT_RULES, { ...patient, ...patient.tuberculose }, "tuberculose");
    if (r.level === "vermelho" || r.level === "amarelo") {
      alerts.push({ level: r.level, label: "TB" });
    }
  }
  if (patient.has) {
    const r = evaluatePatient(ALERT_RULES, { ...patient, ...patient.has }, "hipertensao");
    if (r.level === "vermelho" || r.level === "amarelo") {
      alerts.push({ level: r.level, label: "HAS" });
    }
  }

  // ---------------------------------------------------------------------------
  // Gestante — computed DPP / IG straight from stored DUM.
  // ---------------------------------------------------------------------------

  const dumStr = (patient.gestante?.dum as string | null | undefined) ?? null;
  const dumDate = parseBrDate(dumStr);
  const liveDpp = dumDate ? format(computeDpp(dumDate), "dd/MM/yyyy") : null;
  const liveIg = dumDate ? formatIg(computeIg(dumDate)) : null;

  // ---------------------------------------------------------------------------
  // Condition card definitions
  // ---------------------------------------------------------------------------

  const CONDITION_CARDS = [
    {
      key: "gestante",
      data: patient.gestante,
      label: "Gestante",
      color: GESTANTE_COLOR,
      Icon: Baby,
    },
    {
      key: "tuberculose",
      data: patient.tuberculose,
      label: "Tuberculose",
      color: TB_COLOR,
      Icon: Wind,
    },
    {
      key: "has",
      data: patient.has,
      label: "HAS — Hipertensão",
      color: HAS_COLOR,
      Icon: HeartPulse,
    },
  ] as const;

  const activeCards = CONDITION_CARDS.filter((c) => c.data != null);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleDeletePatient = async () => {
    await deletePatient.mutateAsync({ id: patient.id });
    setConfirmState(null);
  };


  const openEdit = () => {
    setWizardMode({ kind: "edit", patientId: patient.id, patient });
  };

  const openAddCondition = () => {
    setWizardMode({
      kind: "add-condition",
      patientId: patient.id,
      alreadyAttached: [
        patient.gestante ? "gestantes" : null,
        patient.tuberculose ? "tuberculose" : null,
        patient.has ? "hipertensao" : null,
      ].filter((v): v is "gestantes" | "tuberculose" | "hipertensao" => v !== null),
    });
  };

  // ---------------------------------------------------------------------------
  // Computed display strings
  // ---------------------------------------------------------------------------

  const age = computeAgeFromBr(patient.dataNascimento);
  const initials = getInitials(patient.nomeCompleto || "?");

  const endereco = [patient.rua, patient.numero, patient.complemento]
    .filter(Boolean)
    .join(", ");
  const bairroLine = patient.bairro ?? null;
  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- empty address strings should also suppress the block; ?? would pass "" through and show blank address lines
  const hasAddressInfo = endereco || bairroLine || patient.cep;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <aside className="absolute inset-x-0 bottom-0 z-[1000] flex max-h-[85vh] flex-col overflow-hidden rounded-t-2xl border-t bg-white shadow-lg md:inset-x-auto md:right-0 md:top-0 md:h-full md:max-h-none md:w-[22rem] md:rounded-none md:border-l md:border-t-0">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-neutral-200 px-5 py-3">
        <span className="text-sm font-semibold text-neutral-700">
          Detalhes do paciente
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
        <CoincidencePicker
          currentId={patient.id}
          lat={patient.lat}
          lng={patient.lng}
        />
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
                  <h2 className="text-base font-semibold leading-tight text-neutral-900">
                    {patient.nomeCompleto}
                  </h2>
                  <div className="mt-0.5 text-xs text-neutral-500">
                    {age != null ? `${age} anos` : null}
                    {age != null && patient.dataNascimento ? " · " : null}
                    {patient.dataNascimento}
                    {patient.microarea ? ` · ${patient.microarea}` : null}
                  </div>
                </div>
                <button
                  onClick={openEdit}
                  className="shrink-0 rounded-md p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
                  aria-label="Editar paciente"
                >
                  <Pencil className="size-3.5" />
                </button>
              </div>

              {/* Alert chips */}
              {alerts.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {alerts.map((a, i) => (
                    <AlertChip key={i} level={a.level} label={a.label} />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Contact / identity details */}
          <dl className="mt-3 space-y-1.5 text-sm">
            {hasAddressInfo && (
              <div className="flex items-start gap-2 text-neutral-600">
                <MapPin className="mt-0.5 size-3.5 shrink-0 text-neutral-400" />
                <div className="min-w-0 flex-1">
                  {endereco && <div>{endereco}</div>}
                  {bairroLine && (
                    <div className="text-xs text-neutral-500">{bairroLine}</div>
                  )}
                  {patient.cep && (
                    <div className="mt-0.5 font-mono text-[11px] tracking-wide text-neutral-500">
                      CEP {patient.cep}
                    </div>
                  )}
                </div>
              </div>
            )}
            {patient.geocodeReference && (
              <div className="rounded-md border-l-2 border-brand/40 bg-neutral-50 px-2.5 py-1.5 text-xs text-neutral-600">
                <span className="font-medium text-neutral-700">Referência:</span>{" "}
                {patient.geocodeReference}
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

          {/* Vulnerabilidades callout */}
          {patient.vulnerabilidades && (
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
                      className="relative overflow-hidden rounded-[10px] border border-neutral-200 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)]"
                      style={{
                        borderLeftColor: card.color,
                        borderLeftWidth: "3px",
                      }}
                    >
                      <AccordionTrigger
                        hideDefaultIcon
                        className="px-4 py-3 pr-4 hover:bg-neutral-50 hover:no-underline"
                      >
                        <div className="flex flex-1 items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5">
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
                                    {liveIg ?? (data.ig != null
                                      ? `${data.ig as number} sem`
                                      : null)}
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

                          {openCards.includes(card.key) ? (
                            <ChevronUp className="size-4 text-neutral-400" />
                          ) : (
                            <ChevronDown className="size-4 text-neutral-400" />
                          )}
                        </div>
                      </AccordionTrigger>

                      <AccordionContent className="border-t border-neutral-100">
                        <div className="px-4 py-4">
                          {card.key === "gestante" && (
                            <GestanteCardBody
                              data={data}
                              isAdvanced={isAdvanced}
                              onToggleAdvanced={() =>
                                { setShowAdvanced((s) => ({
                                  ...s,
                                  [card.key]: !s[card.key],
                                })); }
                              }
                              liveIg={liveIg}
                              liveDpp={liveDpp}
                            />
                          )}
                          {card.key === "tuberculose" && (
                            <TuberculoseCardBody
                              data={data}
                              isAdvanced={isAdvanced}
                              onToggleAdvanced={() =>
                                { setShowAdvanced((s) => ({
                                  ...s,
                                  [card.key]: !s[card.key],
                                })); }
                              }
                            />
                          )}
                          {card.key === "has" && (
                            <HasCardBody
                              data={data}
                              isAdvanced={isAdvanced}
                              onToggleAdvanced={() =>
                                { setShowAdvanced((s) => ({
                                  ...s,
                                  [card.key]: !s[card.key],
                                })); }
                              }
                            />
                          )}
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
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 border-dashed text-neutral-500"
            onClick={openAddCondition}
          >
            <Plus className="mr-1 size-3.5" />
            Adicionar condição
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={openEdit}
          >
            <Pencil className="mr-1 size-3.5" />
            Editar
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => { setConfirmState({ type: "patient" }); }}
          >
            <Trash2 className="mr-1 size-3.5" />
            Excluir
          </Button>
        </div>

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
          onCancel={() => { setConfirmState(null); }}
        />
      )}

      {wizardMode && (
        <PatientWizard
          open
          mode={wizardMode}
          onClose={() => { setWizardMode(null); }}
        />
      )}
    </aside>
  );
}

// ---------------------------------------------------------------------------
// Card body sub-components — view only. Edit surface is the wizard.
// ---------------------------------------------------------------------------

type CardBodyProps = {
  data: Record<string, unknown>;
  isAdvanced: boolean;
  onToggleAdvanced: () => void;
}

/**
 * "Mostrar mais / Mostrar menos" toggle rendered at the bottom of each
 * condition card body. Keeps the surface calm by default and lets the
 * ACS reveal secondary fields (advanced clinical detail) on demand.
 */
function AdvancedToggle({
  isAdvanced,
  onToggle,
}: {
  isAdvanced: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="col-span-2 mt-2 flex justify-center">
      <button
        type="button"
        onClick={onToggle}
        className="text-[11px] font-medium text-neutral-500 underline-offset-2 hover:text-neutral-800 hover:underline"
      >
        {isAdvanced ? "Mostrar menos" : "Mostrar mais"}
      </button>
    </div>
  );
}

function GestanteCardBody({
  data,
  isAdvanced,
  onToggleAdvanced,
  liveDpp,
  liveIg,
}: CardBodyProps & { liveDpp: string | null; liveIg: string | null }) {
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
              ? (data.numeroConsultas as number)
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
          <Field label="Acompanhamento peso/altura">
            <span className="text-sm text-neutral-800">
              {(data.acompanhamentoPesoAltura as string | null) ?? "—"}
            </span>
          </Field>
          <Field label="Nº visitas domiciliares">
            <span className="text-sm text-neutral-800">
              {data.numeroVisitasDomiciliares != null
              ? (data.numeroVisitasDomiciliares as number)
                : "—"}
            </span>
          </Field>
          <Field label="Avaliação odonto">
            <span className="text-sm text-neutral-800">
              {(data.avaliacaoOdontoStatus as string | null) ?? "—"}
            </span>
          </Field>
          <Field label="TR Sífilis/HIV — 1º tri">
            <span className="text-sm text-neutral-800">
              {(data.trPrimeiroTri as string | null) ?? "—"}
            </span>
          </Field>
          <Field label="TR Sífilis/HIV — 2º tri">
            <span className="text-sm text-neutral-800">
              {(data.trSegundoTri as string | null) ?? "—"}
            </span>
          </Field>
          <Field label="TR Sífilis/HIV — 3º tri">
            <span className="text-sm text-neutral-800">
              {(data.trTerceiroTri as string | null) ?? "—"}
            </span>
          </Field>
          <Field label="Resultado teste rápido">
            <span className="text-sm text-neutral-800">
              {(data.resultadoTr as string | null) ?? "—"}
            </span>
          </Field>
          <Field label="TR/Aval. Síf+HIV+HepB+HepC — 1º tri">
            <span className="text-sm text-neutral-800">
              {(data.trHepBHepCPrimeiroTri as string | null) ?? "—"}
            </span>
          </Field>
          <Field label="TR/Aval. Síf+HIV — 3º tri">
            <span className="text-sm text-neutral-800">
              {(data.trSifHivTerceiroTri as string | null) ?? "—"}
            </span>
          </Field>
          <Field label="Exposta (HIV/sífilis)">
            <span className="text-sm text-neutral-800">
              {data.isExposta === true
                ? "Sim"
                : data.isExposta === false
                  ? "Não"
                  : "—"}
            </span>
          </Field>
          <Field label="Puérpera">
            <span className="text-sm text-neutral-800">
              {data.isPuerpera === true
                ? "Sim"
                : data.isPuerpera === false
                  ? "Não"
                  : "—"}
            </span>
          </Field>
          <Field label="Puerpério — consulta">
            <span className="text-sm text-neutral-800">
              {(data.puerperioConsulta as string | null) ?? "—"}
            </span>
          </Field>
          <Field label="Puerpério — visita domiciliar">
            <span className="text-sm text-neutral-800">
              {(data.puerperioVisitaDomiciliar as string | null) ?? "—"}
            </span>
          </Field>
          <Field label="Puerpério — avaliação odonto">
            <span className="text-sm text-neutral-800">
              {(data.puerperioAvaliacaoOdonto as string | null) ?? "—"}
            </span>
          </Field>
        </div>
      )}
      <AdvancedToggle isAdvanced={isAdvanced} onToggle={onToggleAdvanced} />
    </>
  );
}

function TuberculoseCardBody({
  data,
  isAdvanced,
  onToggleAdvanced,
}: CardBodyProps) {
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
          <Field label="TRM (resultado)">
            <span className="text-sm text-neutral-800">
              {(data.trmResultado as string | null) ?? "—"}
            </span>
          </Field>
          <Field label="Cultura M. tuberculosis">
            <span className="text-sm text-neutral-800">
              {(data.culturaMTuberculosis as string | null) ?? "—"}
            </span>
          </Field>
          <Field label="Baciloscopia 1ª amostra">
            <span className="text-sm text-neutral-800">
              {(data.baciloscopiaPrimeiraData as string | null) ?? "—"}
            </span>
          </Field>
          <Field label="Baciloscopia 2ª amostra">
            <span className="text-sm text-neutral-800">
              {(data.baciloscopiaSegundaData as string | null) ?? "—"}
            </span>
          </Field>
          <Field label="TRM 1ª amostra">
            <span className="text-sm text-neutral-800">
              {(data.trmPrimeiraData as string | null) ?? "—"}
            </span>
          </Field>
          <Field label="TRM 2ª amostra">
            <span className="text-sm text-neutral-800">
              {(data.trmSegundaData as string | null) ?? "—"}
            </span>
          </Field>
          <Field label="PPD (mm)">
            <span className="text-sm text-neutral-800">
              {data.ppdMm != null ? (data.ppdMm as number) : "—"}
            </span>
          </Field>
          <Field label="Histopatologia">
            <span className="text-sm text-neutral-800">
              {(data.histopatologia as string | null) ?? "—"}
            </span>
          </Field>
          <Field label="RX tórax">
            <span className="text-sm text-neutral-800">
              {(data.rxTorax as string | null) ?? "—"}
            </span>
          </Field>
          <Field label="Outros exames">
            <span className="text-sm text-neutral-800">
              {(data.outrosExames as string | null) ?? "—"}
            </span>
          </Field>
          <Field label="Forma de tratamento">
            <span className="text-sm text-neutral-800">
              {(data.formaTratamento as string | null) ?? "—"}
            </span>
          </Field>
          <Field label="Contatos coabitantes">
            <span className="text-sm text-neutral-800">
              {data.contatosCoabitantes != null
                ? (data.contatosCoabitantes as number)
                : "—"}
            </span>
          </Field>
          <Field label="Contatos examinados">
            <span className="text-sm text-neutral-800">
              {data.contatosExaminados != null
                ? (data.contatosExaminados as number)
                : "—"}
            </span>
          </Field>
          <Field label="Todos os contatos examinados">
            <span className="text-sm text-neutral-800">
              {data.todosContatosExaminados === true
                ? "Sim"
                : data.todosContatosExaminados === false
                  ? "Não"
                  : "—"}
            </span>
          </Field>
        </div>
      )}
      <AdvancedToggle isAdvanced={isAdvanced} onToggle={onToggleAdvanced} />
    </>
  );
}

function HasCardBody({
  data,
  isAdvanced,
  onToggleAdvanced,
}: CardBodyProps) {
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
      <AdvancedToggle isAdvanced={isAdvanced} onToggle={onToggleAdvanced} />
    </>
  );
}
