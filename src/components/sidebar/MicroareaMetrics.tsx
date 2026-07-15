"use client";

import { useFilterStore } from "@/stores/filterStore";

interface MicroareaStats {
  id: string;
  total: number;
  red: number;
  yellow: number;
  overdueVisit: number;
}

interface MicroareaMetricsProps {
  patients: Array<{
    microarea?: string;
    alertLevel?: string;
    dataUltimaAtualizacao?: string | null;
  }>;
}

export function MicroareaMetrics({ patients }: MicroareaMetricsProps) {
  const setMicroareaFilter = useFilterStore((s) => s.setMicroareaFilter);

  const now = Date.now();
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

  // Compute stats per microárea
  const statsMap = new Map<string, MicroareaStats>();

  for (const p of patients) {
    const ma = p.microarea ?? "Sem MA";
    if (!statsMap.has(ma)) {
      statsMap.set(ma, { id: ma, total: 0, red: 0, yellow: 0, overdueVisit: 0 });
    }
    const s = statsMap.get(ma)!;
    s.total++;
    if (p.alertLevel === "vermelho") s.red++;
    if (p.alertLevel === "amarelo") s.yellow++;
    if (p.dataUltimaAtualizacao) {
      const lastUpdate = new Date(p.dataUltimaAtualizacao).getTime();
      if (now - lastUpdate > thirtyDaysMs) s.overdueVisit++;
    }
  }

  const stats = Array.from(statsMap.values()).sort((a, b) =>
    a.id.localeCompare(b.id)
  );

  if (stats.length === 0) {
    return (
      <div className="border-t pt-3">
        <p className="text-xs text-muted-foreground">
          Sem dados para métricas
        </p>
      </div>
    );
  }

  return (
    <div className="border-t pt-3">
      <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Microáreas
      </h3>
      <div className="space-y-1">
        {stats.map((s) => (
          <button
            key={s.id}
            onClick={() => setMicroareaFilter([s.id])}
            className="flex w-full items-center justify-between rounded px-2 py-1 text-left text-sm hover:bg-gray-50"
          >
            <span className="font-medium">{s.id}</span>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{s.total} pac.</span>
              {s.red > 0 && (
                <span className="rounded bg-red-100 px-1 text-red-700">
                  {s.red}
                </span>
              )}
              {s.yellow > 0 && (
                <span className="rounded bg-yellow-100 px-1 text-yellow-700">
                  {s.yellow}
                </span>
              )}
              {s.overdueVisit > 0 && (
                <span className="rounded bg-gray-200 px-1" title="Sem visita > 30 dias">
                  ⏱ {s.overdueVisit}
                </span>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
