"use client";

/**
 * StepGerenciarCondicoes — edit-mode step for managing attached conditions.
 *
 * Shown only in the edit flow (positioned after endereço, before data pages).
 * The user can:
 *   - Uncheck an already-attached condition to queue it for removal (→ ctx.toRemove).
 *   - Check an unattached condition to queue it for addition (→ ctx.chosenConditions).
 *
 * All operations are batched and committed on Finalizar (#16).
 */

import type { WizardStep } from "@/components/wizard/Wizard";
import type { PatientWizardCtx } from "@/components/wizard/PatientWizard";
import { CARDS } from "@/components/wizard/steps/StepEscolherCondicoes";

type Props = Parameters<WizardStep<PatientWizardCtx>["render"]>[0];

export function StepGerenciarCondicoes({ ctx, setCtx, goNext }: Props) {
  return (
    <form
      id="wizard-step-form"
      onSubmit={(e) => {
        e.preventDefault();
        goNext();
      }}
      className="space-y-3"
    >
      <p className="text-xs text-muted-foreground">
        Marque para manter ou adicionar uma condição; desmarque para removê-la ao finalizar.
      </p>

      <div className="space-y-2.5">
        {CARDS.map((card) => {
          const isOriginal = ctx.originalConditions.includes(card.id);
          const isChosen = ctx.chosenConditions.includes(card.id);
          const isToRemove = ctx.toRemove.includes(card.id);

          return (
            <label
              key={card.id}
              className={[
                "flex cursor-pointer items-center gap-3 rounded-xl border-l-4 border border-neutral-200 p-3.5 transition",
                isChosen && !isToRemove ? card.bg : "hover:bg-neutral-50",
                isToRemove ? "opacity-60" : "",
              ].join(" ")}
              style={{ borderLeftColor: card.color }}
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={isChosen}
                onChange={(e) => {
                  if (e.target.checked) {
                    setCtx({
                      chosenConditions: [...ctx.chosenConditions, card.id],
                      toRemove: ctx.toRemove.filter((c) => c !== card.id),
                    });
                  } else {
                    // Remove: take out of chosen; if it was originally attached,
                    // add to toRemove so onFinish can delete it.
                    setCtx({
                      chosenConditions: ctx.chosenConditions.filter(
                        (c) => c !== card.id,
                      ),
                      toRemove: isOriginal
                        ? [...ctx.toRemove, card.id]
                        : ctx.toRemove,
                    });
                  }
                }}
              />
              <div
                className={[
                  "flex size-5 shrink-0 items-center justify-center rounded border transition",
                  isChosen && !isToRemove
                    ? "border-transparent bg-brand text-white"
                    : "border-neutral-300",
                ].join(" ")}
                aria-hidden
              >
                {isChosen && !isToRemove && (
                  <svg viewBox="0 0 12 9" className="size-3 fill-current">
                    <path
                      d="M1 4l3.5 3.5L11 1"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </div>

              <div
                className="flex size-8 shrink-0 items-center justify-center rounded-full"
                style={{ backgroundColor: card.color + "22" }}
              >
                <card.Icon className="size-4" style={{ color: card.color }} />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">{card.label}</p>
                <p className="text-xs text-muted-foreground">
                  {isToRemove
                    ? "Será removida ao finalizar"
                    : isOriginal
                      ? "Já vinculada"
                      : isChosen
                        ? "Nova condição"
                        : card.desc}
                </p>
              </div>

              {isToRemove && (
                <span className="shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-600">
                  A remover
                </span>
              )}
              {!isToRemove && !isOriginal && isChosen && (
                <span className="shrink-0 rounded-full bg-ok-green/10 px-2 py-0.5 text-[10px] font-medium text-ok-green">
                  Nova
                </span>
              )}
            </label>
          );
        })}
      </div>
    </form>
  );
}
