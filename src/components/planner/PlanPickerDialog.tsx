"use client";

/**
 * PlanPickerDialog — lists saved plans and lets the user reload one.
 */

import { useEffect, useState } from "react";
import { CalendarDays, Footprints, Car, Loader2, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { usePlannerStore } from "@/stores/plannerStore";
import type { Stop } from "@/stores/plannerStore";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PlanSummary {
  id: string;
  date: string;
  acsName: string | null;
  profile: string;
  notes: string | null;
  stopCount: number;
}

interface PlanPickerDialogProps {
  open: boolean;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PlanPickerDialog({ open, onClose }: PlanPickerDialogProps) {
  const loadPlan = usePlannerStore((s) => s.loadPlan);
  const [plans, setPlans] = useState<PlanSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch list whenever dialog opens. React Compiler flags setState in
  // effects as "cascading renders"; the pattern is intentional here (kick
  // off the request as soon as the dialog opens), so the rule is suppressed
  // for this effect only.
  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
     
    setError(null);

    fetch("/api/plans?limit=30")
      .then((r) => r.json())
      .then((body) => setPlans(body.plans ?? []))
      .catch(() => setError("Falha ao carregar planos."))
      .finally(() => setLoading(false));
  }, [open]);

  async function handleLoad(planId: string) {
    setLoadingId(planId);
    try {
      const res = await fetch(`/api/plans/${planId}`);
      if (!res.ok) {
        setError("Erro ao carregar plano.");
        return;
      }
      const body = await res.json();
      const stops: Stop[] = (body.plan.stops as { patientId: string; order: number }[]).map(
        (s) => ({ patientId: s.patientId, order: s.order }),
      );
      loadPlan({ id: planId, stops, profile: body.plan.profile as "foot" | "car" });
      onClose();
    } catch {
      setError("Falha ao conectar.");
    } finally {
      setLoadingId(null);
    }
  }

  async function handleDelete(planId: string) {
    setDeletingId(planId);
    try {
      const res = await fetch(`/api/plans/${planId}`, { method: "DELETE" });
      if (!res.ok) {
        setError("Erro ao excluir plano.");
        return;
      }
      setPlans((prev) => prev.filter((p) => p.id !== planId));
      setConfirmDeleteId(null);
    } catch {
      setError("Falha ao conectar.");
    } finally {
      setDeletingId(null);
    }
  }

  function formatDate(iso: string): string {
    const [yyyy, mm, dd] = iso.split("-");
    return `${dd}/${mm}/${yyyy}`;
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Carregar plano salvo</DialogTitle>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-8 text-neutral-400">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Carregando…
          </div>
        )}

        {error && !loading && (
          <p className="py-4 text-center text-sm text-red-600">{error}</p>
        )}

        {!loading && !error && plans.length === 0 && (
          <p className="py-4 text-center text-sm text-neutral-400">
            Nenhum plano salvo ainda.
          </p>
        )}

        {!loading && plans.length > 0 && (
          <ScrollArea className="max-h-[400px]">
            <div className="space-y-1 py-1">
              {plans.map((plan) => {
                const isConfirming = confirmDeleteId === plan.id;
                const isDeleting = deletingId === plan.id;
                return (
                  <div
                    key={plan.id}
                    className="flex items-start gap-2 rounded-lg px-3 py-2.5 transition hover:bg-neutral-50"
                  >
                    <button
                      type="button"
                      onClick={() => handleLoad(plan.id)}
                      disabled={loadingId === plan.id || isDeleting}
                      className="flex flex-1 items-start gap-3 text-left disabled:opacity-60"
                    >
                      <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-neutral-900">
                            {formatDate(plan.date)}
                          </span>
                          {plan.acsName && (
                            <span className="text-xs text-neutral-500">— {plan.acsName}</span>
                          )}
                        </div>
                        <div className="mt-0.5 flex items-center gap-2 text-xs text-neutral-500">
                          {plan.profile === "foot" ? (
                            <Footprints className="h-3 w-3" />
                          ) : (
                            <Car className="h-3 w-3" />
                          )}
                          <span>
                            {plan.stopCount} parada{plan.stopCount !== 1 ? "s" : ""}
                          </span>
                        </div>
                      </div>
                      {loadingId === plan.id && (
                        <Loader2 className="mt-0.5 h-4 w-4 animate-spin text-neutral-400" />
                      )}
                    </button>
                    {isConfirming ? (
                      <div className="flex shrink-0 items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleDelete(plan.id)}
                          disabled={isDeleting}
                          className="rounded-md bg-alert-red px-2 py-1 text-xs font-medium text-white shadow-sm hover:bg-alert-red/90 disabled:opacity-60"
                          aria-label={`Confirmar exclusão do plano de ${formatDate(plan.date)}`}
                        >
                          {isDeleting ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            "Excluir"
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          disabled={isDeleting}
                          className="rounded-md px-2 py-1 text-xs text-neutral-600 hover:bg-neutral-100"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(plan.id)}
                        disabled={loadingId === plan.id}
                        className="mt-0.5 shrink-0 rounded-md p-1.5 text-neutral-400 hover:bg-red-50 hover:text-alert-red disabled:opacity-40"
                        aria-label={`Excluir plano de ${formatDate(plan.date)}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
