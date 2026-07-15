"use client";

import { useState } from "react";
import { useFilterStore } from "@/stores/filterStore";

const MICROAREAS = ["MA1", "MA2", "MA3", "MA4", "MA5"];
const ALERT_LEVELS = [
  { id: "vermelho", label: "Vermelho (Crítico)", color: "#EF4444" },
  { id: "amarelo", label: "Amarelo (Atenção)", color: "#F59E0B" },
  { id: "verde", label: "Verde (Normal)", color: "#22C55E" },
];

export function FilterPanel() {
  const [isOpen, setIsOpen] = useState(true);
  const microareas = useFilterStore((s) => s.microareas);
  const alertLevels = useFilterStore((s) => s.alertLevels);
  const searchText = useFilterStore((s) => s.searchText);
  const hideUncertain = useFilterStore((s) => s.hideUncertain);
  const setMicroareaFilter = useFilterStore((s) => s.setMicroareaFilter);
  const setAlertFilter = useFilterStore((s) => s.setAlertFilter);
  const setSearch = useFilterStore((s) => s.setSearch);
  const setHideUncertain = useFilterStore((s) => s.setHideUncertain);
  const clearFilters = useFilterStore((s) => s.clearFilters);

  const activeCount =
    microareas.length + alertLevels.length + (searchText ? 1 : 0) + (hideUncertain ? 1 : 0);

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
    <div className="border-t pt-3">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between text-sm font-semibold uppercase tracking-wide text-muted-foreground"
      >
        <span>
          Filtros
          {activeCount > 0 && (
            <span className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] text-white">
              {activeCount}
            </span>
          )}
        </span>
        <span className="text-xs">{isOpen ? "▲" : "▼"}</span>
      </button>

      {isOpen && (
        <div className="mt-3 space-y-4">
          {/* Search */}
          <input
            type="text"
            placeholder="Buscar paciente..."
            value={searchText}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded border px-2 py-1.5 text-sm"
          />

          {/* Microáreas */}
          <div>
            <p className="mb-1 text-xs font-medium text-muted-foreground">
              Microárea
            </p>
            <div className="flex flex-wrap gap-1">
              {MICROAREAS.map((ma) => (
                <button
                  key={ma}
                  onClick={() => toggleMicroarea(ma)}
                  className={`rounded px-2 py-0.5 text-xs font-medium transition-colors ${
                    microareas.includes(ma)
                      ? "bg-primary text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {ma}
                </button>
              ))}
            </div>
          </div>

          {/* Alert Levels */}
          <div>
            <p className="mb-1 text-xs font-medium text-muted-foreground">
              Nível de Alerta
            </p>
            <div className="flex flex-col gap-1">
              {ALERT_LEVELS.map((level) => (
                <label
                  key={level.id}
                  className="flex cursor-pointer items-center gap-2 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={alertLevels.includes(level.id)}
                    onChange={() => toggleAlertLevel(level.id)}
                    className="h-3.5 w-3.5 rounded border-gray-300"
                  />
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: level.color }}
                  />
                  <span>{level.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Geocoding confidence */}
          <div>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={hideUncertain}
                onChange={(e) => setHideUncertain(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-gray-300"
              />
              <span>Ocultar incertos</span>
              <span className="text-xs text-muted-foreground">(confiança &lt; 50%)</span>
            </label>
          </div>

          {/* Clear button */}
          {activeCount > 0 && (
            <button
              onClick={clearFilters}
              className="w-full rounded border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
            >
              Limpar filtros
            </button>
          )}
        </div>
      )}
    </div>
  );
}
