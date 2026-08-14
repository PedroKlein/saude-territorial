"use client";

/**
 * PlanPickerDialog — lists saved plans and lets the user reload one.
 */

import { useEffect, useState } from "react";
import { CalendarDays, Footprints, Car, Loader2 } from "lucide-react";
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
  const [error, setError] = useState<string | null>(null);

  // Fetch list whenever dialog opens. React Compiler flags setState in
  // effects as "cascading renders"; the pattern is intentional here (kick
  // off the request as soon as the dialog opens), so the rule is suppressed
  // for this effect only.
  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
              {plans.map((plan) => (
                <button
                  key={plan.id}
                  onClick={() => handleLoad(plan.id)}
                  disabled={loadingId === plan.id}
                  className="flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition hover:bg-neutral-50 disabled:opacity-60"
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
                      <span>{plan.stopCount} parada{plan.stopCount !== 1 ? "s" : ""}</span>
                    </div>
                  </div>
                  {loadingId === plan.id && (
                    <Loader2 className="mt-0.5 h-4 w-4 animate-spin text-neutral-400" />
                  )}
                </button>
              ))}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
