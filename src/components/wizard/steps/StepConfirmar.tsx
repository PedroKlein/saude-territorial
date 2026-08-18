"use client";

/**
 * StepConfirmar — read-only summary before final save.
 *
 * No form — this step just displays a summary of what will be persisted.
 * The wizard footer renders "Finalizar" (isFinalize: true) which calls
 * onFinish(ctx) directly.
 *
 * LGPD: displays patient data in-context for review; not logged.
 */

import { Baby, Wind, HeartPulse, MapPin, Phone, User } from "lucide-react";
import type { WizardStep } from "@/components/wizard/Wizard";
import type { PatientWizardCtx } from "@/components/wizard/PatientWizard";

const CONDITION_CONFIG = {
  gestantes: {
    label: "Gestante",
    color: "oklch(72% 0.11 15)",
    Icon: Baby,
  },
  tuberculose: {
    label: "Tuberculose",
    color: "oklch(60% 0.09 40)",
    Icon: Wind,
  },
  hipertensao: {
    label: "HAS — Hipertensão",
    color: "oklch(60% 0.13 275)",
    Icon: HeartPulse,
  },
} as const;

type Props = Parameters<WizardStep<PatientWizardCtx>["render"]>[0];

export function StepConfirmar({ ctx }: Props) {
  const initials = (ctx.nomeCompleto || "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  const endereco = [ctx.rua, ctx.numero, ctx.complemento, ctx.bairro]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="space-y-4">
      {/* Identity card */}
      <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div
            className="flex size-10 shrink-0 items-center justify-center rounded-full font-semibold text-white"
            style={{ backgroundColor: "oklch(58% 0.10 195)" }}
            aria-hidden
          >
            {initials}
          </div>

          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-sm font-semibold text-foreground">{ctx.nomeCompleto}</p>

            {ctx.cns && (
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <User className="size-3" />
                <span className="font-mono tracking-wide">{ctx.cns}</span>
              </p>
            )}

            {endereco && (
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="size-3" />
                {endereco}
              </p>
            )}

            {ctx.telefone && (
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <Phone className="size-3" />
                {ctx.telefone}
              </p>
            )}

            {ctx.microarea && (
              <p className="text-xs text-muted-foreground">
                Microárea: <span className="font-medium">{ctx.microarea}</span>
              </p>
            )}
          </div>
        </div>

        {ctx.vulnerabilidades && (
          <p className="mt-2 rounded-md bg-amber-50 px-2.5 py-1.5 text-xs text-amber-900">
            {ctx.vulnerabilidades}
          </p>
        )}
      </div>

      {/* Edit mode: show add/remove/update breakdown */}
      {(ctx.originalConditions.length > 0 || ctx.toRemove.length > 0) ? (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Alterações nas condições
          </p>
          {(() => {
            const toAdd = ctx.chosenConditions.filter(
              (c) => !ctx.originalConditions.includes(c),
            );
            const toUpdate = ctx.chosenConditions.filter((c) =>
              ctx.originalConditions.includes(c),
            );
            return (
              <>
                {toAdd.length > 0 && (
                  <div className="rounded-md border border-ok-green/30 bg-ok-green/5 px-3 py-2">
                    <p className="text-[11px] font-semibold text-ok-green">
                      Adicionar:{" "}
                      {toAdd
                        .map((c) => CONDITION_CONFIG[c]?.label ?? c)
                        .join(", ")}
                    </p>
                  </div>
                )}
                {ctx.toRemove.length > 0 && (
                  <div className="rounded-md border border-alert-red/30 bg-alert-red/5 px-3 py-2">
                    <p className="text-[11px] font-semibold text-alert-red">
                      Remover:{" "}
                      {ctx.toRemove
                        .map((c) => CONDITION_CONFIG[c]?.label ?? c)
                        .join(", ")}
                    </p>
                  </div>
                )}
                {toUpdate.length > 0 && (
                  <div className="rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2">
                    <p className="text-[11px] font-semibold text-muted-foreground">
                      Atualizar:{" "}
                      {toUpdate
                        .map((c) => CONDITION_CONFIG[c]?.label ?? c)
                        .join(", ")}
                    </p>
                  </div>
                )}
                {toAdd.length === 0 && ctx.toRemove.length === 0 && toUpdate.length === 0 && (
                  <p className="text-xs text-muted-foreground">Nenhuma alteração nas condições.</p>
                )}
              </>
            );
          })()}
        </div>
      ) : ctx.chosenConditions.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Condições a vincular
          </p>
          {ctx.chosenConditions.map((cond) => {
            const cfg = CONDITION_CONFIG[cond];
            if (!cfg) return null;
            return (
              <div
                key={cond}
                className="flex items-center gap-3 rounded-xl border border-neutral-200 border-l-4 p-3"
                style={{ borderLeftColor: cfg.color }}
              >
                <div
                  className="flex size-8 shrink-0 items-center justify-center rounded-full"
                  style={{ backgroundColor: cfg.color + "22" }}
                >
                  <cfg.Icon className="size-4" style={{ color: cfg.color }} />
                </div>
                <p className="text-sm font-medium text-foreground">{cfg.label}</p>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="rounded-md border border-brand/20 bg-brand/5 px-3 py-2 text-xs text-brand">
          Sem condição vinculada — você poderá adicionar depois.
        </p>
      )}
    </div>
  );
}
