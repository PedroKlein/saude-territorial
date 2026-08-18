"use client";

/**
 * FilterChips — microárea / condition / alert-level chips for the planner drawer.
 * Selected chips narrow the candidate set for "Adicionar todos ao plano".
 */

import { Baby, Wind, HeartPulse, X, Plus } from "lucide-react";
import { usePlannerStore, PLAN_LIMIT } from "@/stores/plannerStore";
import type { LayerId } from "@/config/layers.config";
import type { AlertLevel } from "@/types/alerts";
import type { PatientRecord } from "@/hooks/usePatientData";

interface FilterChipsProps {
  /** All candidate patients to count and bulk-add. */
  candidates: PatientRecord[];
}

const MICROAREAS = ["MA 01", "MA 02", "MA 03", "MA 04", "MA 05", "MA 06", "MA 07", "MA 08", "MA 09", "MA 10", "MA 11"];

const CONDITIONS: { id: LayerId; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "gestantes", label: "Gestante", Icon: Baby },
  { id: "tuberculose", label: "TB", Icon: Wind },
  { id: "hipertensao", label: "HAS", Icon: HeartPulse },
];

const ALERT_LEVELS: { id: AlertLevel; label: string; colorClass: string }[] = [
  { id: "vermelho", label: "Crítico", colorClass: "border-[oklch(85%_0.10_25)] bg-[oklch(97%_0.03_25)] text-[oklch(38%_0.15_25)]" },
  { id: "amarelo", label: "Atenção", colorClass: "border-[oklch(85%_0.12_75)] bg-[oklch(97%_0.04_75)] text-[oklch(40%_0.14_75)]" },
];

function Chip({
  active,
  onToggle,
  onRemove,
  children,
  activeClass = "border-brand/40 bg-brand/5 text-brand",
}: {
  active: boolean;
  onToggle: () => void;
  onRemove?: () => void;
  children: React.ReactNode;
  activeClass?: string;
}) {
  return (
    <span
      role="button"
      tabIndex={0}
      onClick={onToggle}
      onKeyDown={(e) => e.key === "Enter" && onToggle()}
      className={`inline-flex cursor-pointer items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium transition select-none ${
        active
          ? activeClass
          : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50"
      }`}
    >
      {children}
      {active && onRemove && (
        <X
          className="h-2.5 w-2.5 shrink-0"
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          aria-label="Remover filtro"
        />
      )}
    </span>
  );
}

export function FilterChips({ candidates }: FilterChipsProps) {
  const { filters, setFilters, stops, addStopsUpTo, setLimitBannerVisible } = usePlannerStore();

  function toggleMicroarea(ma: string) {
    const next = filters.microarea.includes(ma)
      ? filters.microarea.filter((m) => m !== ma)
      : [...filters.microarea, ma];
    setFilters({ microarea: next });
  }

  function toggleCondition(id: LayerId) {
    const next = filters.conditions.includes(id)
      ? filters.conditions.filter((c) => c !== id)
      : [...filters.conditions, id];
    setFilters({ conditions: next });
  }

  function toggleAlert(level: AlertLevel) {
    const next = filters.alertLevels.includes(level)
      ? filters.alertLevels.filter((l) => l !== level)
      : [...filters.alertLevels, level];
    setFilters({ alertLevels: next });
  }

  const alreadyInPlan = new Set(stops.map((s) => s.patientId));
  const addable = candidates.filter((p) => !alreadyInPlan.has(p.id));
  const canAdd = Math.max(0, Math.min(addable.length, PLAN_LIMIT - stops.length));

  return (
    <div className="space-y-2">
      <div>
        <div className="mb-1 text-[10px] font-medium uppercase tracking-wider text-neutral-500">
          Microárea
        </div>
        <div className="flex flex-wrap gap-1">
          {MICROAREAS.map((ma) => (
            <Chip
              key={ma}
              active={filters.microarea.includes(ma)}
              onToggle={() => toggleMicroarea(ma)}
              onRemove={() => toggleMicroarea(ma)}
            >
              {ma}
            </Chip>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-1 text-[10px] font-medium uppercase tracking-wider text-neutral-500">
          Condição
        </div>
        <div className="flex flex-wrap gap-1">
          {CONDITIONS.map(({ id, label, Icon }) => (
            <Chip
              key={id}
              active={filters.conditions.includes(id)}
              onToggle={() => toggleCondition(id)}
              onRemove={() => toggleCondition(id)}
            >
              <Icon className="h-3 w-3" />
              {label}
            </Chip>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-1 text-[10px] font-medium uppercase tracking-wider text-neutral-500">
          Nível de alerta
        </div>
        <div className="flex flex-wrap gap-1">
          {ALERT_LEVELS.map(({ id, label, colorClass }) => (
            <Chip
              key={id}
              active={filters.alertLevels.includes(id)}
              onToggle={() => toggleAlert(id)}
              onRemove={() => toggleAlert(id)}
              activeClass={colorClass}
            >
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: id === "vermelho" ? "oklch(58% 0.19 25)" : "oklch(75% 0.14 75)" }}
                aria-hidden
              />
              {label}
            </Chip>
          ))}
        </div>
      </div>

      {canAdd > 0 && (
        <button
          onClick={() => {
            const added = addStopsUpTo(addable.map((p) => p.id));
            if (added < addable.length) setLimitBannerVisible(true);
          }}
          className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-md border border-neutral-300 bg-white py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
        >
          <Plus className="h-3.5 w-3.5" />
          Adicionar todos ({canAdd})
        </button>
      )}
    </div>
  );
}
