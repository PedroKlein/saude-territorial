"use client";

import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import type { AlertLevel } from "@/types/alerts";
import { AlertShape } from "@/components/ui/AlertShape";
import { useFilterStore } from "@/stores/filterStore";

const MICROAREAS = ["MA1", "MA2", "MA3", "MA4", "MA5"];
const ALERT_LEVELS: { id: AlertLevel; label: string }[] = [
  { id: "vermelho", label: "Crítico" },
  { id: "amarelo", label: "Atenção" },
  { id: "verde", label: "Normal" },
];

/**
 * Filtros section — microárea + alert-level chip filters.
 *
 * The search input that used to live here has been moved to the sidebar
 * header (`SearchInput`). Active chips use brand-teal fill.
 */
export function FilterPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const microareas = useFilterStore((s) => s.microareas);
  const alertLevels = useFilterStore((s) => s.alertLevels);
  const hideUncertain = useFilterStore((s) => s.hideUncertain);
  const setMicroareaFilter = useFilterStore((s) => s.setMicroareaFilter);
  const setAlertFilter = useFilterStore((s) => s.setAlertFilter);
  const setHideUncertain = useFilterStore((s) => s.setHideUncertain);
  const clearFilters = useFilterStore((s) => s.clearFilters);

  const activeCount =
    microareas.length + alertLevels.length + (hideUncertain ? 1 : 0);

  function toggleMicroarea(id: string) {
    if (microareas.includes(id)) {
      setMicroareaFilter(microareas.filter((m) => m !== id));
    } else {
      setMicroareaFilter([...microareas, id]);
    }
  }

  function toggleAlertLevel(id: string) {
    if (alertLevels.includes(id)) {
      setAlertFilter(alertLevels.filter((l) => l !== id));
    } else {
      setAlertFilter([...alertLevels, id]);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between py-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-500 hover:text-neutral-700"
      >
        <span className="flex items-center gap-1.5">
          <SlidersHorizontal className="h-3 w-3" />
          Refinar
          {activeCount > 0 && (
            <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-brand text-[9px] font-bold text-white">
              {activeCount}
            </span>
          )}
        </span>
        <span className="text-[10px]">{isOpen ? "▲" : "▼"}</span>
      </button>

      {isOpen && (
        <div className="mt-2 space-y-3">
          <div>
            <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-neutral-400">
              Microárea
            </p>
            <div className="flex flex-wrap gap-1">
              {MICROAREAS.map((ma) => (
                <button
                  key={ma}
                  type="button"
                  onClick={() => toggleMicroarea(ma)}
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition ${
                    microareas.includes(ma)
                      ? "bg-brand text-white"
                      : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                  }`}
                >
                  {ma}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-neutral-400">
              Nível de Alerta
            </p>
            <div className="flex flex-wrap gap-1">
              {ALERT_LEVELS.map((level) => (
                <button
                  key={level.id}
                  type="button"
                  onClick={() => toggleAlertLevel(level.id)}
                  className={`flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium transition ${
                    alertLevels.includes(level.id)
                      ? "bg-brand text-white"
                      : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                  }`}
                >
                  <AlertShape level={level.id} size={10} />
                  {level.label}
                </button>
              ))}
            </div>
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-xs text-neutral-600">
            <input
              type="checkbox"
              checked={hideUncertain}
              onChange={(e) => setHideUncertain(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-neutral-300 accent-brand"
            />
            <span>Ocultar incertos</span>
            <span className="text-neutral-400">(confiança &lt; 50%)</span>
          </label>

          {activeCount > 0 && (
            <button
              type="button"
              onClick={clearFilters}
              className="w-full rounded-md border border-neutral-200 px-2 py-1 text-xs text-neutral-500 hover:bg-neutral-50"
            >
              Limpar filtros
            </button>
          )}
        </div>
      )}
    </div>
  );
}
