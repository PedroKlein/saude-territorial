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
import { EnumField } from "@/components/panels/EnumField";
import {
  BACILOSCOPIA_RESULTADO_LABELS,
  BACILOSCOPIA_RESULTADO_VALUES,
  CULTURA_RESULTADO_LABELS,
  CULTURA_RESULTADO_VALUES,
  ENCERRAMENTO_MOTIVO_TB_LABELS,
  ENCERRAMENTO_MOTIVO_TB_VALUES,
  TDO_STATUS_LABELS,
  TDO_STATUS_VALUES,
  TIPO_ENTRADA_TB_LABELS,
  TIPO_ENTRADA_TB_VALUES,
  TRM_RESULTADO_LABELS,
  TRM_RESULTADO_VALUES,
} from "@/lib/patients/enums";
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
  trmResultado: z.string().optional(),
  culturaMTuberculosis: z.string().optional(),
  formaClinica: z.string().optional(),
  tipoEntrada: z.string().optional(),
  esquema: z.string().optional(),
  dataInicio: z.date().nullable().optional(),
  // Real TDO vocabulary — matches the Postgres enum `tdo_status`
  // (was previously the wrong `sim / não / N/A`).
  tdoStatus: z.string().optional(),
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
      tdoStatus: (prev.tdoStatus as string | undefined) ?? undefined,
      trmResultado: (prev.trmResultado as string | undefined) ?? "",
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
      trmResultado: values.trmResultado || null,
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
        <Field
          label="Resultado baciloscopia"
          className="col-span-2"
          error={errors.baciloscopiaResultado?.message}
        >
          <Controller
            control={control}
            name="baciloscopiaResultado"
            render={({ field }) => (
              <EnumField
                values={BACILOSCOPIA_RESULTADO_VALUES}
                labels={BACILOSCOPIA_RESULTADO_LABELS}
                value={field.value ?? ""}
                onChange={field.onChange}
                ariaLabel="Resultado da baciloscopia"
              />
            )}
          />
        </Field>

        {/* TRM resultado */}
        <Field label="Resultado TRM" className="col-span-2" error={errors.trmResultado?.message}>
          <Controller
            control={control}
            name="trmResultado"
            render={({ field }) => (
              <EnumField
                values={TRM_RESULTADO_VALUES}
                labels={TRM_RESULTADO_LABELS}
                value={field.value ?? ""}
                onChange={field.onChange}
                ariaLabel="Resultado do TRM"
              />
            )}
          />
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
        <Field
          label="Cultura M. tuberculosis"
          className="col-span-2"
          error={errors.culturaMTuberculosis?.message}
        >
          <Controller
            control={control}
            name="culturaMTuberculosis"
            render={({ field }) => (
              <EnumField
                values={CULTURA_RESULTADO_VALUES}
                labels={CULTURA_RESULTADO_LABELS}
                value={field.value ?? ""}
                onChange={field.onChange}
                ariaLabel="Resultado da cultura"
              />
            )}
          />
        </Field>

        {/* Forma clínica */}
        <Field label="Forma clínica" className="col-span-1">
          <Input {...register("formaClinica")} aria-label="Forma clínica" />
        </Field>

        {/* Tipo de entrada */}
        <Field
          label="Tipo de entrada"
          className="col-span-1"
          error={errors.tipoEntrada?.message}
        >
          <Controller
            control={control}
            name="tipoEntrada"
            render={({ field }) => (
              <EnumField
                values={TIPO_ENTRADA_TB_VALUES}
                labels={TIPO_ENTRADA_TB_LABELS}
                value={field.value ?? ""}
                onChange={field.onChange}
                ariaLabel="Tipo de entrada"
              />
            )}
          />
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
        <Field label="TDO" error={errors.tdoStatus?.message}>
          <Controller
            control={control}
            name="tdoStatus"
            render={({ field }) => (
              <EnumField
                values={TDO_STATUS_VALUES}
                labels={TDO_STATUS_LABELS}
                value={field.value ?? ""}
                onChange={field.onChange}
                ariaLabel="Status do TDO"
              />
            )}
          />
        </Field>

        {/* Encerramento motivo */}
        <Field
          label="Encerramento — motivo"
          className="col-span-1"
          error={errors.encerramentoMotivo?.message}
        >
          <Controller
            control={control}
            name="encerramentoMotivo"
            render={({ field }) => (
              <EnumField
                values={ENCERRAMENTO_MOTIVO_TB_VALUES}
                labels={ENCERRAMENTO_MOTIVO_TB_LABELS}
                value={field.value ?? ""}
                onChange={field.onChange}
                ariaLabel="Motivo de encerramento"
              />
            )}
          />
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
