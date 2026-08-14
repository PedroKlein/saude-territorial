"use client";

/**
 * Wizard — generic multi-step modal shell.
 *
 * Pattern:
 *  - Each step renders a <form id="wizard-step-form"> whose onSubmit calls
 *    `setCtx(values)` then `goNext()`. The footer "Avançar" button is wired
 *    via `form="wizard-step-form" type="submit"`, so RHF validation gates
 *    advancement.
 *  - Steps with `isFinalize: true` (= confirmar) show a "Finalizar" button
 *    that calls `onFinish(ctx)` and then advances.
 *  - Steps with `noFooter: true` (= sucesso) hide the footer entirely.
 *  - Steps with `shouldSkip(ctx)` are skipped over on advance/back.
 *
 * LGPD: ctx values are never logged here.
 */

import { useState, useCallback, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import type { z } from "zod";

import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type WizardStep<Ctx> = {
  id: string;
  /** Short label shown in the progress bar. */
  label: string;
  /** If true, the footer is hidden and the step renders its own CTAs. */
  noFooter?: boolean;
  /**
   * If true, the footer renders "Finalizar" which calls `onFinish(ctx)` then
   * advances. The step should NOT render a <form> (it is purely display).
   */
  isFinalize?: boolean;
  /**
   * Optional: if the predicate returns true the wizard skips this step on
   * advance/back. Used by condition-data pages when a condition was not chosen.
   */
  shouldSkip?: (ctx: Ctx) => boolean;
  /**
   * Owned Zod schema — unused at the wizard shell level (each step runs its
   * own RHF + zodResolver). Kept in the type for documentation and potential
   * server-side re-validation.
   */
  schema?: z.ZodTypeAny;
  render: (props: {
    ctx: Ctx;
    setCtx: (patch: Partial<Ctx>) => void;
    /** Navigate to the next non-skipped step. */
    goNext: () => void;
    /** Navigate to the previous non-skipped step. */
    goBack: () => void;
  }) => React.ReactNode;
};

export type WizardProps<Ctx> = {
  open: boolean;
  steps: WizardStep<Ctx>[];
  initialCtx: Ctx;
  onClose: () => void;
  /**
   * Called when the user clicks "Finalizar" on the confirmar step.
   * If it throws the wizard stays on confirmar (error surfaced externally).
   */
  onFinish: (ctx: Ctx) => void | Promise<void>;
  /** Sub-headline shown in the header above the step label. */
  headline?: string;
};

// ---------------------------------------------------------------------------
// Wizard
// ---------------------------------------------------------------------------

export function Wizard<Ctx>({
  open,
  steps,
  initialCtx,
  onClose,
  onFinish,
  headline,
}: WizardProps<Ctx>) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [ctx, setCtxState] = useState<Ctx>(initialCtx);
  const [isPending, setIsPending] = useState(false);
  const [finishError, setFinishError] = useState<string | null>(null);
  // 1 = forward slide, -1 = backward slide
  const [dir, setDir] = useState<1 | -1>(1);

  // Keep a ref so async callbacks (onFinish) always see the latest ctx.
  const ctxRef = useRef(ctx);
  useEffect(() => {
    ctxRef.current = ctx;
  }, [ctx]);

  const setCtx = useCallback((patch: Partial<Ctx>) => {
    setCtxState((prev) => ({ ...prev, ...patch }));
  }, []);

  // -------------------------------------------------------------------------
  // Navigation helpers
  // -------------------------------------------------------------------------

  const nextIdx = useCallback(
    (from: number) => {
      let next = from + 1;
      while (next < steps.length && steps[next].shouldSkip?.(ctxRef.current)) {
        next++;
      }
      return Math.min(next, steps.length - 1);
    },
    [steps],
  );

  const prevIdx = useCallback(
    (from: number) => {
      let prev = from - 1;
      while (prev > 0 && steps[prev].shouldSkip?.(ctxRef.current)) {
        prev--;
      }
      return Math.max(0, prev);
    },
    [steps],
  );

  const advance = useCallback(() => {
    setFinishError(null);
    setDir(1);
    setCurrentIdx((i) => nextIdx(i));
  }, [nextIdx]);

  const goBack = useCallback(() => {
    setFinishError(null);
    setDir(-1);
    setCurrentIdx((i) => prevIdx(i));
  }, [prevIdx]);

  const handleFinalize = useCallback(async () => {
    setFinishError(null);
    setIsPending(true);
    try {
      await onFinish(ctxRef.current);
      advance();
    } catch (err) {
      // Surface the failure inline instead of swallowing it as an unhandled
      // rejection. `onFinish` may re-throw a rich error object (see
      // `PatientWizard`'s 409-collision handling) or a plain Error; either
      // way we show the message. LGPD: `err.message` here is a
      // server-sanitized string, never patient PII.
      const message =
        err instanceof Error && err.message
          ? err.message
          : "Ocorreu um erro ao finalizar. Tente novamente.";
      setFinishError(message);
    } finally {
      setIsPending(false);
    }
  }, [onFinish, advance]);

  // -------------------------------------------------------------------------
  // Derived display state
  // -------------------------------------------------------------------------

  const step = steps[currentIdx] ?? steps[0];
  const isNoFooter = Boolean(step.noFooter);
  const isFinalize = Boolean(step.isFinalize);
  const canBack = currentIdx > 0 && !isNoFooter;

  // Progress bar: exclude the sucesso step (noFooter).
  const progressSteps = steps.filter((s) => !s.noFooter);
  const progressIdx = progressSteps.findIndex((s) => s.id === step.id);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="max-w-2xl gap-0 overflow-hidden p-0"
        /* Prevent accidental close on overlay click — user must use X */
        onInteractOutside={(e) => e.preventDefault()}
        /* Wizard renders its own X in the header (line ~208). Disable the
         * default shadcn close so there's exactly one close affordance. */
        showCloseButton={false}
      >
        <DialogTitle className="sr-only">{headline ?? "Assistente"}</DialogTitle>

        {/* ---------------------------------------------------------------- */}
        {/* Header                                                           */}
        {/* ---------------------------------------------------------------- */}
        {!isNoFooter && (
          <div className="border-b px-5 pb-3 pt-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                {headline && (
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    {headline}
                  </p>
                )}
                <h2 className="mt-0.5 text-base font-semibold text-foreground">
                  {step.label}
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-neutral-100 hover:text-foreground"
                aria-label="Fechar"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Colored progress bar */}
            {progressSteps.length > 1 && (
              <div className="mt-3 flex items-end gap-1.5">
                {progressSteps.map((s, i) => {
                  const done = i < progressIdx;
                  const active = i === progressIdx;
                  return (
                    <div
                      key={s.id}
                      className="flex flex-1 flex-col items-start gap-1"
                    >
                      <div
                        className={[
                          "h-1 w-full rounded-full transition-colors duration-200",
                          done || active ? "bg-brand" : "bg-neutral-200",
                        ].join(" ")}
                      />
                      <span
                        className={[
                          "text-[10px] font-medium",
                          active
                            ? "text-foreground"
                            : done
                              ? "text-muted-foreground"
                              : "text-neutral-400",
                        ].join(" ")}
                      >
                        {s.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Body with step transition                                         */}
        {/* ---------------------------------------------------------------- */}
        <div className="max-h-[540px] overflow-y-auto">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={step.id}
              initial={{ x: dir * 24, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: dir * -24, opacity: 0 }}
              transition={{ duration: 0.18, ease: "easeInOut" }}
              className="px-5 py-5"
            >
              {step.render({ ctx, setCtx, goNext: advance, goBack })}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Inline finalize error — surfaces onFinish throws. Cleared on
            next step transition (see advance/goBack). */}
        {finishError && (
          <div
            role="alert"
            className="mx-5 mb-3 rounded-md border border-alert-red/40 bg-alert-red/10 px-3 py-2 text-xs text-red-900"
          >
            {finishError}
          </div>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Footer                                                            */}
        {/* ---------------------------------------------------------------- */}
        {!isNoFooter && (
          <div className="flex items-center justify-between gap-3 border-t bg-neutral-50 px-5 py-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={!canBack}
              onClick={goBack}
              className="flex items-center gap-1 text-neutral-700"
            >
              <ChevronLeft className="size-4" />
              Voltar
            </Button>

            {isFinalize ? (
              <Button
                type="button"
                size="sm"
                className="flex items-center gap-1 bg-brand text-white hover:bg-brand/80"
                disabled={isPending}
                onClick={() => void handleFinalize()}
              >
                {isPending ? "Salvando…" : "Finalizar"}
                <ChevronRight className="size-4" />
              </Button>
            ) : (
              <Button
                form="wizard-step-form"
                type="submit"
                size="sm"
                className="flex items-center gap-1 bg-brand text-white hover:bg-brand/80"
              >
                Avançar
                <ChevronRight className="size-4" />
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
