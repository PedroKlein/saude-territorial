"use client";

/**
 * StepIdentidade — wizard step 1 for new-patient flow.
 *
 * Fields: nomeCompleto (required), CNS (required + Luhn), dataNascimento
 * (DatePicker, max=today), telefone (masked), vulnerabilidades (Textarea).
 *
 * LGPD: no patient identifiers reach console.* here.
 */

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";

import { isValidCns } from "@/lib/patients/cns";
import { CnsInput, PhoneInput } from "@/components/ui/masked-input";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/panels/Field";
import type { WizardStep } from "@/components/wizard/Wizard";
import type { PatientWizardCtx } from "@/components/wizard/PatientWizard";

const IdentidadeSchema = z.object({
  cns: z
    .string()
    .regex(/^\d{15}$/, "CNS deve ter 15 dígitos numéricos.")
    .refine(isValidCns, { message: "CNS inválido (dígito verificador não confere)." }),
  nomeCompleto: z
    .string()
    .trim()
    .min(1, "Nome completo é obrigatório."),
  dataNascimento: z.date().nullable().optional(),
  telefone: z.string().optional(),
  vulnerabilidades: z.string().optional(),
});

/**
 * Edit-mode variant: CNS is locked and comes straight from the DB, so we
 * skip the Luhn validation. Seed / legacy rows may not pass Luhn but the
 * user has no way to fix them here — validating would just block edits.
 */
const IdentidadeEditSchema = z.object({
  cns: z.string(),
  nomeCompleto: z
    .string()
    .trim()
    .min(1, "Nome completo é obrigatório."),
  dataNascimento: z.date().nullable().optional(),
  telefone: z.string().optional(),
  vulnerabilidades: z.string().optional(),
});

type IdentidadeValues = z.infer<typeof IdentidadeSchema>;

type Props = Parameters<WizardStep<PatientWizardCtx>["render"]>[0] & {
  /** When true, CNS field is read-only (edit mode — CNS is immutable). */
  lockCns?: boolean;
};

export function StepIdentidade({ ctx, setCtx, goNext, lockCns = false }: Props) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<IdentidadeValues>({
    resolver: zodResolver(lockCns ? IdentidadeEditSchema : IdentidadeSchema),
    defaultValues: {
      cns: ctx.cns,
      nomeCompleto: ctx.nomeCompleto,
      dataNascimento: ctx.dataNascimento
        ? new Date(ctx.dataNascimento.split("/").reverse().join("-"))
        : null,
      telefone: ctx.telefone,
      vulnerabilidades: ctx.vulnerabilidades,
    },
  });

  const onSubmit = handleSubmit((values) => {
    setCtx({
      cns: values.cns,
      nomeCompleto: values.nomeCompleto,
      dataNascimento: values.dataNascimento
        ? format(values.dataNascimento, "dd/MM/yyyy")
        : "",
      telefone: values.telefone ?? "",
      vulnerabilidades: values.vulnerabilidades ?? "",
    });
    goNext();
  });

  return (
    <form id="wizard-step-form" onSubmit={onSubmit} className="grid grid-cols-2 gap-x-3 gap-y-4">
      {/* CNS */}
      <Field
        label="CNS"
        required
        error={errors.cns?.message}
        className="col-span-2"
        id="identidade-cns"
      >
        <Controller
          control={control}
          name="cns"
          render={({ field }) => (
            <CnsInput
              value={field.value ?? ""}
              onValueChange={field.onChange}
              aria-invalid={Boolean(errors.cns)}
              aria-label="CNS"
              readOnly={lockCns}
              disabled={lockCns}
              className={lockCns ? "opacity-60" : undefined}
            />
          )}
        />
      </Field>

      {/* Nome */}
      <Field
        label="Nome completo"
        required
        error={errors.nomeCompleto?.message}
        className="col-span-2"
        id="identidade-nome"
      >
        <Input
          id="identidade-nome"
          {...register("nomeCompleto")}
          aria-invalid={Boolean(errors.nomeCompleto)}
          aria-label="Nome completo"
        />
      </Field>

      {/* Data de nascimento */}
      <Field
        label="Data de nascimento"
        error={errors.dataNascimento?.message}
        className="col-span-1"
      >
        <Controller
          control={control}
          name="dataNascimento"
          render={({ field }) => (
            <DatePicker
              value={field.value ?? null}
              onChange={field.onChange}
              max={new Date()}
              ariaLabel="Data de nascimento"
            />
          )}
        />
      </Field>

      {/* Telefone */}
      <Field
        label="Telefone"
        error={errors.telefone?.message}
        className="col-span-1"
      >
        <Controller
          control={control}
          name="telefone"
          render={({ field }) => (
            <PhoneInput
              value={field.value ?? ""}
              onValueChange={field.onChange}
              aria-label="Telefone"
            />
          )}
        />
      </Field>

      {/* Vulnerabilidades */}
      <Field
        label="Vulnerabilidades"
        error={errors.vulnerabilidades?.message}
        className="col-span-2"
      >
        <Textarea
          {...register("vulnerabilidades")}
          rows={2}
          aria-label="Vulnerabilidades"
          placeholder="Ex.: mora sozinha, sem renda fixa…"
        />
      </Field>
    </form>
  );
}
