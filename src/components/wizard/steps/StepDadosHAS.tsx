"use client";

/**
 * StepDadosHAS — hipertensão-specific data page in the wizard.
 *
 * Fields: dataUltimaConsulta, dataProximaConsulta, dataUltimaAfericaoPa
 * (DatePickers), pressaoArterial (PressureInput), registroNotas +
 * encaminhamentos (Textareas).
 *
 * LGPD: no patient identifiers reach console.*.
 */

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";

import { DatePicker } from "@/components/ui/date-picker";
import { Textarea } from "@/components/ui/textarea";
import { PressureInput } from "@/components/ui/masked-input";
import { Field } from "@/components/panels/Field";
import { HasPatchSchema } from "@/lib/patients/schemas";
import type { WizardStep } from "@/components/wizard/Wizard";
import type { PatientWizardCtx } from "@/components/wizard/PatientWizard";

const StepSchema = z.object({
  dataUltimaConsulta: z.date().nullable().optional(),
  dataProximaConsulta: z.date().nullable().optional(),
  dataUltimaAfericaoPa: z.date().nullable().optional(),
  pressaoArterial: z.string().optional(),
  registroNotas: z.string().optional(),
  encaminhamentos: z.string().optional(),
});

type StepValues = z.infer<typeof StepSchema>;

function fmtDate(d: Date | null | undefined): string {
  return d ? format(d, "dd/MM/yyyy") : "";
}

type Props = Parameters<WizardStep<PatientWizardCtx>["render"]>[0];

export function StepDadosHAS({ ctx, setCtx, goNext }: Props) {
  const prev = ctx.hipertensao as Record<string, unknown>;

  const {
    handleSubmit,
    control,
    register,
    formState: { errors },
  } = useForm<StepValues>({
    resolver: zodResolver(StepSchema),
    defaultValues: {
      pressaoArterial: (prev.pressaoArterial as string | undefined) ?? "",
      registroNotas: (prev.registroNotas as string | undefined) ?? "",
      encaminhamentos: (prev.encaminhamentos as string | undefined) ?? "",
    },
  });

  const [serverIssues, setServerIssues] = useState<string[]>([]);

  const onSubmit = handleSubmit((values) => {
    // Same defense-in-depth as the gestante step — block advance on
    // range/format errors the API would reject on Finalizar.
    const raw: Record<string, unknown> = {
      dataUltimaConsulta: fmtDate(values.dataUltimaConsulta) || null,
      dataProximaConsulta: fmtDate(values.dataProximaConsulta) || null,
      dataUltimaAfericaoPa: fmtDate(values.dataUltimaAfericaoPa) || null,
      pressaoArterial: values.pressaoArterial || null,
      registroNotas: values.registroNotas || null,
      encaminhamentos: values.encaminhamentos || null,
    };
    const parsed = HasPatchSchema.safeParse(raw);
    if (!parsed.success) {
      setServerIssues(parsed.error.issues.map((i) => i.message));
      return;
    }
    setServerIssues([]);
    setCtx({ hipertensao: parsed.data as Record<string, unknown> });
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

        {/* Data última consulta */}
        <Field
          label="Última consulta"
          error={errors.dataUltimaConsulta?.message}
        >
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
        <Field
          label="Próxima consulta"
          error={errors.dataProximaConsulta?.message}
        >
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

        {/* Data última aferição PA */}
        <Field
          label="Aferição PA"
          error={errors.dataUltimaAfericaoPa?.message}
          className="col-span-2"
        >
          <Controller
            control={control}
            name="dataUltimaAfericaoPa"
            render={({ field }) => (
              <DatePicker
                value={field.value ?? null}
                onChange={field.onChange}
                max={new Date()}
                ariaLabel="Data da última aferição de PA"
              />
            )}
          />
        </Field>

        {/* PA */}
        <Field label="Pressão arterial" className="col-span-2">
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

        {/* Notas */}
        <Field label="Notas clínicas" className="col-span-2">
          <Textarea
            {...register("registroNotas")}
            rows={2}
            aria-label="Notas clínicas"
            placeholder="Observações relevantes…"
          />
        </Field>

        {/* Encaminhamentos */}
        <Field label="Encaminhamentos" className="col-span-2">
          <Textarea
            {...register("encaminhamentos")}
            rows={2}
            aria-label="Encaminhamentos"
            placeholder="Especialidades, exames…"
          />
        </Field>
      </div>
    </form>
  );
}
