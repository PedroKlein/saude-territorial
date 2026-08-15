"use client";

/**
 * PlanSaveDialog — modal for saving the current plan to the API.
 * Fields: date (defaults today), acsName, notes.
 */

import { useState } from "react";
import { Save } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { usePlannerStore } from "@/stores/plannerStore";

interface PlanSaveDialogProps {
  open: boolean;
  onClose: () => void;
  /**
   * ACS name entered in the planner drawer header. Passed down so this
   * dialog doesn't re-ask; it becomes a read-only summary line below.
   * Nullable when the user left it blank.
   */
  acsName: string | null;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function PlanSaveDialog({ open, onClose, acsName }: PlanSaveDialogProps) {
  const { stops, profile, loadPlan } = usePlannerStore();
  const [date, setDate] = useState(todayIso);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (stops.length === 0) return;
    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/plans", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          date,
          acsName: acsName || null,
          profile,
          notes: notes || null,
          stops: stops.map((s) => ({ patientId: s.patientId, order: s.order })),
        }),
      });

      if (!res.ok) {
        const body = await res.json();
        setError(body.error ?? "Erro ao salvar.");
        return;
      }

      const body = await res.json();
      loadPlan({ id: body.plan.id, stops, profile });
      onClose();
    } catch {
      setError("Falha ao conectar. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Salvar plano do dia</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="plan-date">Data</Label>
            <Input
              id="plan-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <p className="rounded-md border border-dashed border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-neutral-600">
            {acsName ? (
              <>Plano de <span className="font-medium text-neutral-900">{acsName}</span></>
            ) : (
              <span className="text-neutral-500">Sem ACS atribuído · edite no cabeçalho do planejamento se necessário</span>
            )}
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="plan-notes">Observações</Label>
            <Textarea
              id="plan-notes"
              placeholder="Opcional"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <p className="text-xs text-neutral-500">
            {stops.length} parada{stops.length !== 1 ? "s" : ""} · perfil: {profile === "foot" ? "a pé" : "carro"}
          </p>

          {error && (
            <p className="text-xs text-red-600">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving || stops.length === 0}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Salvando…" : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
