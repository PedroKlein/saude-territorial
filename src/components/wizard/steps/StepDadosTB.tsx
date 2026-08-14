"use client";

/**
 * StepDadosTB — tuberculose-specific data page in the wizard.
 *
 * Fields derived from TuberculosePatchSchema.
 * Date ranges use DateRangePicker (baciloscopia 1ª/2ª, TRM 1ª/2ª).
 *
 * LGPD: no patient identifiers reach console.*.
 */

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";

import { DatePicker, DateRangePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/panels/Field";
import type { WizardStep } from "@/components/wizard/Wizard";
import type { PatientWizardCtx } from "@/components/wizard/PatientWizard";

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const StepSchema = z.object({
  tipo: z.enum(["Pulmonar", "Extrapulmonar"]).optional(),
  galRegistro: z.string().optional(),
  baciloscopiaRange: z.custom<DateRange | null>().optional(),
  baciloscopiaResultado: z.string().optional(),
  trmRange: z.custom<DateRange | null>().optional(),
  culturaMTuberculosis: z.string().optional(),
  formaClinica: z.string().optional(),
  tipoEntrada: z.string().optional(),
  esquema: z.string().optional(),
  dataInicio: z.date().nullable().optional(),
  tdoStatus: z.enum(["sim", "não", "N/A"]).optional(),
  encerramentoMotivo: z.string().optional(),
  encerramentoData: z.date().nullable().optional(),
});

type StepValues = z.infer<typeof StepSchema>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmtDate(d: Date | null | undefined): string {
  return d ? format(d, "dd/MM/yyyy") : "";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

type Props = Parameters<WizardStep<PatientWizardCtx>["render"]>[0];

export function StepDadosTB({ ctx, setCtx, goNext }: Props) {
  const prev = ctx.tuberculose as Record<string, unknown>;

  const {
    handleSubmit,
    control,
    register,
    formState: { errors },
  } = useForm<StepValues>({
    resolver: zodResolver(StepSchema),
    defaultValues: {
      tipo: (prev.tipo as "Pulmonar" | "Extrapulmonar" | undefined),
      galRegistro: (prev.galRegistro as string | undefined) ?? "",
      baciloscopiaResultado: (prev.baciloscopiaResultado as string | undefined) ?? "",
      culturaMTuberculosis: (prev.culturaMTuberculosis as string | undefined) ?? "",
      formaClinica: (prev.formaClinica as string | undefined) ?? "",
      tipoEntrada: (prev.tipoEntrada as string | undefined) ?? "",
      esquema: (prev.esquema as string | undefined) ?? "",
      tdoStatus: (prev.tdoStatus as "sim" | "não" | "N/A" | undefined),
      encerramentoMotivo: (prev.encerramentoMotivo as string | undefined) ?? "",
    },
  });

  const onSubmit = handleSubmit((values) => {
    const raw: Record<string, unknown> = {
      tipo: values.tipo ?? null,
      galRegistro: values.galRegistro || null,
      baciloscopiaPrimeiraData: fmtDate(values.baciloscopiaRange?.from) || null,
      baciloscopiaSegundaData: fmtDate(values.baciloscopiaRange?.to) || null,
      baciloscopiaResultado: values.baciloscopiaResultado || null,
      trmPrimeiraData: fmtDate(values.trmRange?.from) || null,
      trmSegundaData: fmtDate(values.trmRange?.to) || null,
      culturaMTuberculosis: values.culturaMTuberculosis || null,
      formaClinica: values.formaClinica || null,
      tipoEntrada: values.tipoEntrada || null,
      esquema: values.esquema || null,
      dataInicio: fmtDate(values.dataInicio) || null,
      tdoStatus: values.tdoStatus ?? null,
      encerramentoMotivo: values.encerramentoMotivo || null,
      encerramentoData: fmtDate(values.encerramentoData) || null,
    };
    setCtx({ tuberculose: raw });
    goNext();
  });

  return (
    <form id="wizard-step-form" onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-x-3 gap-y-4">

        {/* Tipo */}
        <Field label="Tipo" error={errors.tipo?.message} className="col-span-2">
          <Controller
            control={control}
            name="tipo"
            render={({ field }) => (
              <Select value={field.value ?? ""} onValueChange={field.onChange}>
                <SelectTrigger aria-label="Tipo de TB">
                  <SelectValue placeholder="Selecionar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pulmonar">Pulmonar</SelectItem>
                  <SelectItem value="Extrapulmonar">Extrapulmonar</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </Field>

        {/* GAL registro */}
        <Field label="Registro GAL" className="col-span-2">
          <Input {...register("galRegistro")} aria-label="Registro GAL" />
        </Field>

        {/* Baciloscopia range */}
        <Field label="Baciloscopia 1ª/2ª datas" className="col-span-2">
          <Controller
            control={control}
            name="baciloscopiaRange"
            render={({ field }) => (
              <DateRangePicker
                value={field.value ?? null}
                onChange={field.onChange}
                ariaLabel="Período de baciloscopias"
              />
            )}
          />
        </Field>

        {/* Baciloscopia resultado */}
        <Field label="Resultado baciloscopia" className="col-span-2">
          <Input {...register("baciloscopiaResultado")} aria-label="Resultado da baciloscopia" />
        </Field>

        {/* TRM range */}
        <Field label="TRM 1ª/2ª datas" className="col-span-2">
          <Controller
            control={control}
            name="trmRange"
            render={({ field }) => (
              <DateRangePicker
                value={field.value ?? null}
                onChange={field.onChange}
                ariaLabel="Período de TRM"
              />
            )}
          />
        </Field>

        {/* Cultura */}
        <Field label="Cultura M. tuberculosis" className="col-span-2">
          <Input {...register("culturaMTuberculosis")} aria-label="Cultura M. tuberculosis" />
        </Field>

        {/* Forma clínica */}
        <Field label="Forma clínica" className="col-span-1">
          <Input {...register("formaClinica")} aria-label="Forma clínica" />
        </Field>

        {/* Tipo de entrada */}
        <Field label="Tipo de entrada" className="col-span-1">
          <Input {...register("tipoEntrada")} aria-label="Tipo de entrada" />
        </Field>

        {/* Esquema */}
        <Field label="Esquema" className="col-span-2">
          <Input {...register("esquema")} aria-label="Esquema de tratamento" />
        </Field>

        {/* Data início */}
        <Field label="Data início tratamento">
          <Controller
            control={control}
            name="dataInicio"
            render={({ field }) => (
              <DatePicker
                value={field.value ?? null}
                onChange={field.onChange}
                ariaLabel="Data de início do tratamento"
              />
            )}
          />
        </Field>

        {/* TDO */}
        <Field label="TDO">
          <Controller
            control={control}
            name="tdoStatus"
            render={({ field }) => (
              <Select value={field.value ?? ""} onValueChange={field.onChange}>
                <SelectTrigger aria-label="Status do TDO">
                  <SelectValue placeholder="Selecionar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sim">Sim</SelectItem>
                  <SelectItem value="não">Não</SelectItem>
                  <SelectItem value="N/A">N/A</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </Field>

        {/* Encerramento motivo */}
        <Field label="Encerramento — motivo" className="col-span-1">
          <Input {...register("encerramentoMotivo")} aria-label="Motivo de encerramento" />
        </Field>

        {/* Encerramento data */}
        <Field label="Encerramento — data" className="col-span-1">
          <Controller
            control={control}
            name="encerramentoData"
            render={({ field }) => (
              <DatePicker
                value={field.value ?? null}
                onChange={field.onChange}
                ariaLabel="Data de encerramento"
              />
            )}
          />
        </Field>
      </div>
    </form>
  );
}
