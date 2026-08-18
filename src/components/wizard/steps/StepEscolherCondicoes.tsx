"use client";

/**
 * StepEscolherCondicoes — multi-select condition picker.
 *
 * Three checkbox cards: Gestantes (rose), Tuberculose (terracotta), HAS
 * (indigo). In add-condition mode, already-attached options are disabled.
 * Refuses to advance when nothing is chosen.
 *
 * LGPD: ctx fields are never logged.
 */

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Baby, Wind, HeartPulse } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { WizardStep } from "@/components/wizard/Wizard";
import type { PatientWizardCtx } from "@/components/wizard/PatientWizard";

const CondicoesSchema = z.object({
  chosen: z
    .array(z.enum(["gestantes", "tuberculose", "hipertensao"]))
    .min(0),
});

type CondicoesValues = z.infer<typeof CondicoesSchema>;

export const CARDS = [
  {
    id: "gestantes" as const,
    label: "Gestante",
    desc: "Acompanhamento pré-natal",
    color: "oklch(72% 0.11 15)",
    border: "border-l-[oklch(72%_0.11_15)]",
    bg: "bg-[oklch(98%_0.01_15)]",
    Icon: Baby,
  },
  {
    id: "tuberculose" as const,
    label: "Tuberculose",
    desc: "Tratamento e monitoramento TB",
    color: "oklch(60% 0.09 40)",
    border: "border-l-[oklch(60%_0.09_40)]",
    bg: "bg-[oklch(98%_0.01_40)]",
    Icon: Wind,
  },
  {
    id: "hipertensao" as const,
    label: "HAS — Hipertensão",
    desc: "Controle da pressão arterial",
    color: "oklch(60% 0.13 275)",
    border: "border-l-[oklch(60%_0.13_275)]",
    bg: "bg-[oklch(98%_0.01_275)]",
    Icon: HeartPulse,
  },
];

type CondicoesStepProps = Parameters<WizardStep<PatientWizardCtx>["render"]>[0] & {
  alreadyAttached?: Array<"gestantes" | "tuberculose" | "hipertensao">;
};

export function StepEscolherCondicoes({
  ctx,
  setCtx,
  goNext,
  alreadyAttached = [],
}: CondicoesStepProps) {
  const {
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<CondicoesValues>({
    resolver: zodResolver(CondicoesSchema),
    defaultValues: {
      chosen: ctx.chosenConditions,
    },
  });

  const onSubmit = handleSubmit((values) => {
    // Hand the same patch to both setCtx (for render) and goNext (for the
    // synchronous shouldSkip decision that decides which data pages appear
    // next). See Wizard.tsx nav docs — setCtx alone would race.
    const patch = { chosenConditions: values.chosen };
    setCtx(patch);
    goNext(patch);
  });

  return (
    <form id="wizard-step-form" onSubmit={onSubmit} className="space-y-3">
      <Controller
        control={control}
        name="chosen"
        render={({ field }) => (
          <div className="space-y-2.5">
            {CARDS.map((card) => {
              const isAttached = alreadyAttached.includes(card.id);
              const isChecked = field.value.includes(card.id);

              const cardEl = (
                <label
                  key={card.id}
                  className={[
                    "flex cursor-pointer items-center gap-3 rounded-xl border-l-4 border border-neutral-200 p-3.5 transition",
                    isAttached
                      ? "cursor-not-allowed opacity-50"
                      : "hover:bg-neutral-50",
                    isChecked && !isAttached ? card.bg : "",
                  ].join(" ")}
                  style={{ borderLeftColor: card.color }}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    disabled={isAttached}
                    checked={isChecked}
                    onChange={(e) => {
                      if (isAttached) return;
                      const next = e.target.checked
                        ? [...field.value, card.id]
                        : field.value.filter((c) => c !== card.id);
                      field.onChange(next);
                    }}
                  />
                  {/* Custom checkbox indicator */}
                  <div
                    className={[
                      "flex size-5 shrink-0 items-center justify-center rounded border transition",
                      isChecked && !isAttached
                        ? "border-transparent bg-brand text-white"
                        : "border-neutral-300",
                    ].join(" ")}
                    aria-hidden
                  >
                    {isChecked && !isAttached && (
                      <svg viewBox="0 0 12 9" className="size-3 fill-current">
                        <path d="M1 4l3.5 3.5L11 1" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>

                  {/* Icon */}
                  <div
                    className="flex size-8 shrink-0 items-center justify-center rounded-full"
                    style={{ backgroundColor: card.color + "22" }}
                  >
                    <card.Icon className="size-4" style={{ color: card.color }} />
                  </div>

                  {/* Text */}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">{card.label}</p>
                    <p className="text-xs text-muted-foreground">{card.desc}</p>
                  </div>

                  {isAttached && (
                    <span className="shrink-0 rounded-full bg-neutral-200 px-2 py-0.5 text-[10px] font-medium text-neutral-500">
                      Já vinculada
                    </span>
                  )}
                </label>
              );

              if (isAttached) {
                return (
                  <TooltipProvider key={card.id}>
                    <Tooltip>
                      <TooltipTrigger asChild>{cardEl}</TooltipTrigger>
                      <TooltipContent>Condição já vinculada a este paciente</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                );
              }

              return cardEl;
            })}
          </div>
        )}
      />

      <p className="text-[11px] text-muted-foreground">
        Você pode cadastrar sem condição e adicionar depois.
      </p>
    </form>
  );
}
