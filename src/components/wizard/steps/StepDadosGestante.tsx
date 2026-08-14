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
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { AlertTriangle } from "lucide-react";

import { GestantesPatchSchema } from "@/lib/patients/schemas";
import { computeDpp, computeIg, formatIg } from "@/lib/patients/dates";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/panels/Field";
import { Computed } from "@/components/panels/Computed";
import { PressureInput } from "@/components/ui/masked-input";
import { Button } from "@/components/ui/button";
import type { WizardStep } from "@/components/wizard/Wizard";
import type { PatientWizardCtx } from "@/components/wizard/PatientWizard";

// ---------------------------------------------------------------------------
// Schema — subset of GestantesPatchSchema input fields for the create wizard
// ---------------------------------------------------------------------------

const StepSchema = z.object({
  dum: z.date().nullable().optional(),
  risco: z.enum(["habitual", "alto"]).optional(),
  dataUltimaConsulta: z.date().nullable().optional(),
  dataProximaConsulta: z.date().nullable().optional(),
  numeroConsultas: z.number().int().min(0).optional(),
  pressaoArterial: z.string().optional(),
  // Advanced
  vacinaDtpa: z.string().optional(),
  isPuerpera: z.boolean().optional(),
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
    watch,
    register,
    formState: { errors },
  } = useForm<StepValues>({
    resolver: zodResolver(StepSchema),
    defaultValues: {
      dum: toDateOrNull(prev.dum as string | undefined),
      risco: (prev.risco as "habitual" | "alto" | undefined) ?? "habitual",
      dataUltimaConsulta: toDateOrNull(prev.dataUltimaConsulta as string | undefined),
      dataProximaConsulta: toDateOrNull(prev.dataProximaConsulta as string | undefined),
      pressaoArterial: (prev.pressaoArterial as string | undefined) ?? "",
      vacinaDtpa: (prev.vacinaDtpa as string | undefined) ?? "",
    },
  });

  const watchedDum = watch("dum");
  const watchedRisco = watch("risco");

  const liveDpp = watchedDum ? format(computeDpp(watchedDum), "dd/MM/yyyy") : null;
  const liveIg = watchedDum ? formatIg(computeIg(watchedDum)) : null;

  const onSubmit = handleSubmit((values) => {
    // Validate through GestantesPatchSchema before storing (best-effort; API
    // re-validates on submit).
    const raw = {
      dum: fmtDate(values.dum),
      risco: values.risco,
      dataUltimaConsulta: fmtDate(values.dataUltimaConsulta),
      dataProximaConsulta: fmtDate(values.dataProximaConsulta),
      numeroConsultas: values.numeroConsultas,
      pressaoArterial: values.pressaoArterial ?? null,
      vacinaDtpa: values.vacinaDtpa ?? null,
      isPuerpera: values.isPuerpera ?? false,
    };
    const parsed = GestantesPatchSchema.safeParse(raw);
    setCtx({ gestantes: parsed.success ? (parsed.data as Record<string, unknown>) : (raw as Record<string, unknown>) });
    goNext();
  });

  return (
    <form id="wizard-step-form" onSubmit={onSubmit} className="space-y-4">
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
              <Select value={field.value ?? ""} onValueChange={field.onChange}>
                <SelectTrigger aria-label="Risco gestacional">
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
        <Field label="PA (pressão arterial)" className="col-span-1">
          <Controller
            control={control}
            name="pressaoArterial"
            render={({ field }) => (
              <PressureInput
                value={field.value ?? ""}
                onValueChange={field.onChange}
                aria-label="Pressão arterial"
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
          <Field label="Vacina DTPa" className="col-span-2">
            <Input {...register("vacinaDtpa")} aria-label="Vacina DTPa" placeholder="Sim / Não / Em dia" />
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
        </div>
      )}
    </form>
  );
}
