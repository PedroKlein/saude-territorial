"use client";

/**
 * StepDadosGestante — gestante-specific data page in the wizard.
 *
 * Key behaviours:
 *  - DUM DatePicker → live DPP + IG via computeDpp / computeIg shown in
 *    Computed display components.
 *  - Risco select → "alto" triggers an inline alert-amber pill warning.
 *  - "Mostrar campos avançados" reveal for puerpério / vacinaDtpa / TR fields.
 *
 * LGPD: no patient identifiers reach console.*.
 */

import { useState } from "react";
import { useForm, useWatch, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { AlertTriangle } from "lucide-react";

import { GestantesPatchSchema } from "@/lib/patients/schemas";
import { computeDpp, computeIg, formatIg } from "@/lib/patients/dates";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/panels/Field";
import { Computed } from "@/components/panels/Computed";
import { PressureInput } from "@/components/ui/masked-input";
import { Button } from "@/components/ui/button";
import { EnumField } from "@/components/panels/EnumField";
import {
  ACOMPANHAMENTO_STATUS_LABELS,
  ACOMPANHAMENTO_STATUS_VALUES,
  IG_ABERTURA_LABELS,
  IG_ABERTURA_VALUES,
  RESULTADO_TR_LABELS,
  RESULTADO_TR_VALUES,
  RISCO_LABELS,
  RISCO_VALUES,
  STATUS_REALIZACAO_LABELS,
  STATUS_REALIZACAO_VALUES,
  TR_STATUS_LABELS,
  TR_STATUS_VALUES,
} from "@/lib/patients/enums";
import type { WizardStep } from "@/components/wizard/Wizard";
import type { PatientWizardCtx } from "@/components/wizard/PatientWizard";

// ---------------------------------------------------------------------------
// Schema — subset of GestantesPatchSchema input fields for the create wizard
// ---------------------------------------------------------------------------

const StepSchema = z.object({
  dum: z.date().nullable().optional(),
  risco: z.enum(["habitual", "alto"]).optional(),
  igAbertura: z.string().optional(),
  dataUltimaConsulta: z.date().nullable().optional(),
  dataProximaConsulta: z.date().nullable().optional(),
  numeroConsultas: z.number().int().min(0).optional(),
  pressaoArterial: z.string().optional(),
  hasPreviaTag: z.string().optional(),
  diabetesPreviaTag: z.string().optional(),
  // Advanced
  acompanhamentoPesoAltura: z.string().optional(),
  numeroVisitasDomiciliares: z.number().int().min(0).optional(),
  avaliacaoOdontoStatus: z.string().optional(),
  vacinaDtpa: z.string().optional(),
  trPrimeiroTri: z.string().optional(),
  trSegundoTri: z.string().optional(),
  trTerceiroTri: z.string().optional(),
  resultadoTr: z.string().optional(),
  trHepBHepCPrimeiroTri: z.string().optional(),
  trSifHivTerceiroTri: z.string().optional(),
  isPuerpera: z.boolean().optional(),
  puerperioConsulta: z.string().optional(),
  puerperioVisitaDomiciliar: z.string().optional(),
  puerperioAvaliacaoOdonto: z.string().optional(),
  isExposta: z.boolean().optional(),
});

type StepValues = z.infer<typeof StepSchema>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toDateOrNull(iso?: string): Date | null {
  if (!iso) return null;
  const d = new Date(iso.includes("/") ? iso.split("/").reverse().join("-") : iso);
  return isNaN(d.getTime()) ? null : d;
}

function fmtDate(d: Date | null | undefined): string {
  return d ? format(d, "dd/MM/yyyy") : "";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

type Props = Parameters<WizardStep<PatientWizardCtx>["render"]>[0];

export function StepDadosGestante({ ctx, setCtx, goNext }: Props) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const prev = ctx.gestantes as Partial<StepValues & { dum?: string; risco?: "habitual" | "alto" }>;

  const {
    handleSubmit,
    control,
    register,
    formState: { errors },
  } = useForm<StepValues>({
    resolver: zodResolver(StepSchema),
    defaultValues: {
      dum: toDateOrNull(prev.dum as string | undefined),
      risco: (prev.risco as "habitual" | "alto" | undefined) ?? "habitual",
      igAbertura: (prev.igAbertura as string | undefined) ?? "",
      dataUltimaConsulta: toDateOrNull(prev.dataUltimaConsulta as string | undefined),
      dataProximaConsulta: toDateOrNull(prev.dataProximaConsulta as string | undefined),
      numeroConsultas: prev.numeroConsultas as number | undefined,
      pressaoArterial: (prev.pressaoArterial as string | undefined) ?? "",
      hasPreviaTag: (prev.hasPreviaTag as string | undefined) ?? "",
      diabetesPreviaTag: (prev.diabetesPreviaTag as string | undefined) ?? "",
      acompanhamentoPesoAltura: (prev.acompanhamentoPesoAltura as string | undefined) ?? "",
      numeroVisitasDomiciliares: prev.numeroVisitasDomiciliares as number | undefined,
      avaliacaoOdontoStatus: (prev.avaliacaoOdontoStatus as string | undefined) ?? "",
      vacinaDtpa: (prev.vacinaDtpa as string | undefined) ?? "",
      trPrimeiroTri: (prev.trPrimeiroTri as string | undefined) ?? "",
      trSegundoTri: (prev.trSegundoTri as string | undefined) ?? "",
      trTerceiroTri: (prev.trTerceiroTri as string | undefined) ?? "",
      resultadoTr: (prev.resultadoTr as string | undefined) ?? "",
      trHepBHepCPrimeiroTri: (prev.trHepBHepCPrimeiroTri as string | undefined) ?? "",
      trSifHivTerceiroTri: (prev.trSifHivTerceiroTri as string | undefined) ?? "",
      isPuerpera: (prev.isPuerpera as boolean | undefined) ?? false,
      puerperioConsulta: (prev.puerperioConsulta as string | undefined) ?? "",
      puerperioVisitaDomiciliar: (prev.puerperioVisitaDomiciliar as string | undefined) ?? "",
      puerperioAvaliacaoOdonto: (prev.puerperioAvaliacaoOdonto as string | undefined) ?? "",
      isExposta: (prev.isExposta as boolean | undefined) ?? false,
    },
  });

  // useWatch (not `watch()`) — React Compiler-compatible and no perf tax.
  const watchedDum = useWatch({ control, name: "dum" });
  const watchedRisco = useWatch({ control, name: "risco" });
  const watchedIsPuerpera = useWatch({ control, name: "isPuerpera" });


  const liveDpp = watchedDum ? format(computeDpp(watchedDum), "dd/MM/yyyy") : null;
  const liveIg = watchedDum ? formatIg(computeIg(watchedDum)) : null;

  const [serverIssues, setServerIssues] = useState<string[]>([]);

  const onSubmit = handleSubmit((values) => {
    // Cross-field / format validation via the shared server schema. The RHF
    // resolver above catches per-field type errors; this catches range and
    // cross-field guards (e.g. DUM in the future, PA format) so the step
    // cannot advance with data the API will reject on Finalizar.
    const raw = {
      dum: fmtDate(values.dum),
      risco: values.risco,
      igAbertura: values.igAbertura || null,
      dataUltimaConsulta: fmtDate(values.dataUltimaConsulta),
      dataProximaConsulta: fmtDate(values.dataProximaConsulta),
      numeroConsultas: values.numeroConsultas,
      pressaoArterial: values.pressaoArterial ?? null,
      hasPreviaTag: values.hasPreviaTag || null,
      diabetesPreviaTag: values.diabetesPreviaTag || null,
      acompanhamentoPesoAltura: values.acompanhamentoPesoAltura || null,
      numeroVisitasDomiciliares: values.numeroVisitasDomiciliares,
      avaliacaoOdontoStatus: values.avaliacaoOdontoStatus || null,
      vacinaDtpa: values.vacinaDtpa || null,
      trPrimeiroTri: values.trPrimeiroTri || null,
      trSegundoTri: values.trSegundoTri || null,
      trTerceiroTri: values.trTerceiroTri || null,
      resultadoTr: values.resultadoTr || null,
      trHepBHepCPrimeiroTri: values.trHepBHepCPrimeiroTri || null,
      trSifHivTerceiroTri: values.trSifHivTerceiroTri || null,
      isPuerpera: values.isPuerpera ?? false,
      puerperioConsulta: values.puerperioConsulta || null,
      puerperioVisitaDomiciliar: values.puerperioVisitaDomiciliar || null,
      puerperioAvaliacaoOdonto: values.puerperioAvaliacaoOdonto || null,
      isExposta: values.isExposta ?? false,
    };
    const parsed = GestantesPatchSchema.safeParse(raw);
    if (!parsed.success) {
      setServerIssues(parsed.error.issues.map((i) => i.message));
      return;
    }
    setServerIssues([]);
    setCtx({ gestantes: parsed.data as Record<string, unknown> });
    goNext();
  });

  return (
    <form id="wizard-step-form" onSubmit={onSubmit} className="space-y-4">
      {serverIssues.length > 0 && (
        <div
          role="alert"
          className="rounded-md border border-alert-red/40 bg-alert-red/10 px-3 py-2 text-xs whitespace-pre-line text-red-900"
        >
          {serverIssues.map((m) => `• ${m}`).join("\n")}
        </div>
      )}

      <div className="grid grid-cols-2 gap-x-3 gap-y-4">

        {/* DUM */}
        <Field label="DUM (Última menstruação)" className="col-span-2">
          <Controller
            control={control}
            name="dum"
            render={({ field }) => (
              <DatePicker
                value={field.value ?? null}
                onChange={field.onChange}
                max={new Date()}
                ariaLabel="Data da última menstruação"
              />
            )}
          />
        </Field>

        {/* Live DPP + IG */}
        {watchedDum && (
          <>
            <Field label="DPP (calculado)" hint="DUM + 280 dias">
              <Computed value={liveDpp ?? "—"} ariaLabel="Data provável do parto" />
            </Field>
            <Field label="IG (calculado)" hint="Idade gestacional">
              <Computed value={liveIg ?? "—"} ariaLabel="Idade gestacional" />
            </Field>
          </>
        )}

        {/* Risco */}
        <Field label="Risco" error={errors.risco?.message} className="col-span-2">
          <Controller
            control={control}
            name="risco"
            render={({ field }) => (
              <EnumField
                values={RISCO_VALUES}
                labels={RISCO_LABELS}
                value={field.value ?? ""}
                onChange={(v) => field.onChange(v as "habitual" | "alto")}
                ariaLabel="Risco gestacional"
                invalid={Boolean(errors.risco)}
              />
            )}
          />
        </Field>

        {/* Alert pill for risco alto */}
        {watchedRisco === "alto" && (
          <div className="col-span-2 flex items-start gap-2 rounded-lg bg-alert-amber/10 px-3 py-2 text-xs text-amber-900">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-alert-amber" />
            <span>
              <strong>Regra de alerta ativada</strong> — risco alto colocará este paciente
              na lista de prioridades ao salvar.
            </span>
          </div>
        )}

        {/* Data última consulta */}
        <Field label="Última consulta" error={errors.dataUltimaConsulta?.message}>
          <Controller
            control={control}
            name="dataUltimaConsulta"
            render={({ field }) => (
              <DatePicker
                value={field.value ?? null}
                onChange={field.onChange}
                max={new Date()}
                ariaLabel="Data da última consulta"
                aria-invalid={
                  Boolean(errors.dataUltimaConsulta) ||
                  Boolean(errors.dataProximaConsulta)
                }
              />
            )}
          />
        </Field>

        {/* Data próxima consulta */}
        <Field label="Próxima consulta" error={errors.dataProximaConsulta?.message}>
          <Controller
            control={control}
            name="dataProximaConsulta"
            render={({ field }) => (
              <DatePicker
                value={field.value ?? null}
                onChange={field.onChange}
                ariaLabel="Data da próxima consulta"
                aria-invalid={Boolean(errors.dataProximaConsulta)}
              />
            )}
          />
        </Field>

        {/* Número de consultas */}
        <Field label="Nº consultas" error={errors.numeroConsultas?.message} className="col-span-1">
          <Input
            {...register("numeroConsultas", { valueAsNumber: true })}
            type="number"
            min={0}
            aria-label="Número de consultas"
          />
        </Field>

        {/* PA */}
        <Field label="PA (pressão arterial)" className="col-span-1" error={errors.pressaoArterial?.message}>
          <Controller
            control={control}
            name="pressaoArterial"
            render={({ field }) => (
              <PressureInput
                value={field.value ?? ""}
                onValueChange={field.onChange}
                aria-label="Pressão arterial"
                aria-invalid={Boolean(errors.pressaoArterial)}
              />
            )}
          />
        </Field>
      </div>

      {/* Advanced fields toggle */}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setShowAdvanced((v) => !v)}
        className="text-xs text-muted-foreground"
      >
        {showAdvanced ? "Ocultar" : "Mostrar"} campos avançados
      </Button>

      {showAdvanced && (
        <div className="grid grid-cols-2 gap-x-3 gap-y-4 rounded-lg border border-dashed p-3">
          <Field
            label="Vacina DTPa"
            className="col-span-2"
            error={errors.vacinaDtpa?.message}
          >
            <Controller
              control={control}
              name="vacinaDtpa"
              render={({ field }) => (
                <EnumField
                  values={STATUS_REALIZACAO_VALUES}
                  labels={STATUS_REALIZACAO_LABELS}
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  ariaLabel="Vacina DTPa"
                />
              )}
            />
          </Field>
          <Field label="É puérpera" className="col-span-2">
            <Controller
              control={control}
              name="isPuerpera"
              render={({ field }) => (
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={field.value ?? false}
                    onChange={(e) => field.onChange(e.target.checked)}
                    className="accent-brand"
                  />
                  Puérpera (pós-parto)
                </label>
              )}
            />
          </Field>
          {watchedIsPuerpera && (
            <>
              <Field label="Puerpério — consulta" className="col-span-2">
                <Controller
                  control={control}
                  name="puerperioConsulta"
                  render={({ field }) => (
                    <EnumField
                      values={STATUS_REALIZACAO_VALUES}
                      labels={STATUS_REALIZACAO_LABELS}
                      value={field.value ?? ""}
                      onChange={field.onChange}
                      ariaLabel="Consulta de puerpério"
                    />
                  )}
                />
              </Field>
              <Field label="Puerpério — visita domiciliar" className="col-span-2">
                <Controller
                  control={control}
                  name="puerperioVisitaDomiciliar"
                  render={({ field }) => (
                    <EnumField
                      values={STATUS_REALIZACAO_VALUES}
                      labels={STATUS_REALIZACAO_LABELS}
                      value={field.value ?? ""}
                      onChange={field.onChange}
                      ariaLabel="Visita domiciliar de puerpério"
                    />
                  )}
                />
              </Field>
              <Field label="Puerpério — avaliação odonto" className="col-span-2">
                <Controller
                  control={control}
                  name="puerperioAvaliacaoOdonto"
                  render={({ field }) => (
                    <EnumField
                      values={STATUS_REALIZACAO_VALUES}
                      labels={STATUS_REALIZACAO_LABELS}
                      value={field.value ?? ""}
                      onChange={field.onChange}
                      ariaLabel="Avaliação odonto de puerpério"
                    />
                  )}
                />
              </Field>
            </>
          )}
          <Field label="IG na abertura PN" className="col-span-1">
            <Controller
              control={control}
              name="igAbertura"
              render={({ field }) => (
                <EnumField
                  values={IG_ABERTURA_VALUES}
                  labels={IG_ABERTURA_LABELS}
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  ariaLabel="IG na abertura do pré-natal"
                />
              )}
            />
          </Field>
          <Field label="Nº visitas domiciliares" className="col-span-1">
            <Input
              {...register("numeroVisitasDomiciliares", { valueAsNumber: true })}
              type="number"
              min={0}
              aria-label="Número de visitas domiciliares"
            />
          </Field>
          <Field label="Acompanhamento peso/altura" className="col-span-2">
            <Controller
              control={control}
              name="acompanhamentoPesoAltura"
              render={({ field }) => (
                <EnumField
                  values={ACOMPANHAMENTO_STATUS_VALUES}
                  labels={ACOMPANHAMENTO_STATUS_LABELS}
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  ariaLabel="Acompanhamento peso/altura"
                />
              )}
            />
          </Field>
          <Field label="Avaliação odonto" className="col-span-2">
            <Controller
              control={control}
              name="avaliacaoOdontoStatus"
              render={({ field }) => (
                <EnumField
                  values={STATUS_REALIZACAO_VALUES}
                  labels={STATUS_REALIZACAO_LABELS}
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  ariaLabel="Avaliação odontológica"
                />
              )}
            />
          </Field>
          <Field label="TR Sífilis/HIV — 1º tri" className="col-span-2">
            <Controller
              control={control}
              name="trPrimeiroTri"
              render={({ field }) => (
                <EnumField
                  values={TR_STATUS_VALUES}
                  labels={TR_STATUS_LABELS}
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  ariaLabel="TR Sífilis/HIV 1º trimestre"
                />
              )}
            />
          </Field>
          <Field label="TR Sífilis/HIV — 2º tri" className="col-span-2">
            <Controller
              control={control}
              name="trSegundoTri"
              render={({ field }) => (
                <EnumField
                  values={TR_STATUS_VALUES}
                  labels={TR_STATUS_LABELS}
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  ariaLabel="TR Sífilis/HIV 2º trimestre"
                />
              )}
            />
          </Field>
          <Field label="TR Sífilis/HIV — 3º tri" className="col-span-2">
            <Controller
              control={control}
              name="trTerceiroTri"
              render={({ field }) => (
                <EnumField
                  values={TR_STATUS_VALUES}
                  labels={TR_STATUS_LABELS}
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  ariaLabel="TR Sífilis/HIV 3º trimestre"
                />
              )}
            />
          </Field>
          <Field label="Resultado teste rápido" className="col-span-2">
            <Controller
              control={control}
              name="resultadoTr"
              render={({ field }) => (
                <EnumField
                  values={RESULTADO_TR_VALUES}
                  labels={RESULTADO_TR_LABELS}
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  ariaLabel="Resultado do teste rápido"
                />
              )}
            />
          </Field>
          <Field label="TR/Aval. Síf+HIV+HepB+HepC — 1º tri" className="col-span-2">
            <Controller
              control={control}
              name="trHepBHepCPrimeiroTri"
              render={({ field }) => (
                <EnumField
                  values={STATUS_REALIZACAO_VALUES}
                  labels={STATUS_REALIZACAO_LABELS}
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  ariaLabel="TR ou avaliação Sífilis+HIV+HepB+HepC 1º trimestre"
                />
              )}
            />
          </Field>
          <Field label="TR/Aval. Síf+HIV — 3º tri" className="col-span-2">
            <Controller
              control={control}
              name="trSifHivTerceiroTri"
              render={({ field }) => (
                <EnumField
                  values={STATUS_REALIZACAO_VALUES}
                  labels={STATUS_REALIZACAO_LABELS}
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  ariaLabel="TR ou avaliação Sífilis+HIV 3º trimestre"
                />
              )}
            />
          </Field>
          <Field label="HAS prévia" className="col-span-1">
            <Input {...register("hasPreviaTag")} aria-label="HAS prévia" />
          </Field>
          <Field label="Diabetes prévia" className="col-span-1">
            <Input {...register("diabetesPreviaTag")} aria-label="Diabetes prévia" />
          </Field>
          <Field label="Exposta (HIV/sífilis)" className="col-span-2">
            <Controller
              control={control}
              name="isExposta"
              render={({ field }) => (
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={field.value ?? false}
                    onChange={(e) => field.onChange(e.target.checked)}
                    className="accent-brand"
                  />
                  Marcada como exposta
                </label>
              )}
            />
          </Field>
        </div>
      )}
    </form>
  );
}
