"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpDown, ArrowUp, ArrowDown, Pencil } from "lucide-react";
import { LAYER_CONFIG, type LayerId } from "@/config/layers.config";
import { evaluatePatient, getHighestAlert } from "@/lib/alerts/engine";
import { ALERT_RULES } from "@/config/alert-rules.config";
import type { AlertLevel } from "@/types/alerts";
import type { UnifiedPatient } from "./page";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

type SortKey = "nome" | "microarea" | "updatedAt" | "alerta";
type SortDir = "asc" | "desc";

const ALERT_ORDER: Record<AlertLevel, number> = {
  vermelho: 2,
  amarelo: 1,
  verde: 0,
};

const ALERT_COLOR: Record<AlertLevel, string> = {
  vermelho: "var(--alert-red)",
  amarelo: "var(--alert-amber)",
  verde: "var(--ok-green)",
};

const ALERT_LABEL: Record<AlertLevel, string> = {
  vermelho: "Vermelho",
  amarelo: "Amarelo",
  verde: "Verde",
};

/** Parse BR date dd/MM/yyyy for comparison as YYYYMMDD string. */
function parseBrForSort(s: string | null): string {
  if (!s) return "";
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s);
  if (!m) return "";
  return `${m[3]}${m[2]}${m[1]}`;
}

function getPatientAlertLevel(p: UnifiedPatient): AlertLevel {
  let highest: AlertLevel = "verde";
  for (const layerId of p.conditions) {
    const result = evaluatePatient(ALERT_RULES, p as Record<string, unknown>, layerId);
    highest = getHighestAlert(highest, result.level);
  }
  return highest;
}

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <tr key={i} className="border-b border-border">
          {[120, 80, 140, 90, 50].map((w, j) => (
            <td key={j} className="px-4 py-3">
              <div
                className="h-4 animate-pulse rounded bg-muted"
                style={{ width: w }}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

function SortButton({
  label,
  sortKey,
  current,
  dir,
  onClick,
}: {
  label: string;
  sortKey: SortKey;
  current: SortKey;
  dir: SortDir;
  onClick: () => void;
}) {
  const active = current === sortKey;
  const Icon =
    !active ? ArrowUpDown : dir === "asc" ? ArrowUp : ArrowDown;

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
    >
      {label}
      <Icon className="size-3" />
    </button>
  );
}

export function PatientTable({
  patients,
  isLoading,
  onEdit,
}: {
  patients: UnifiedPatient[];
  isLoading: boolean;
  /** Optional row-action: open the wizard in edit mode for this patient. */
  onEdit?: (patient: UnifiedPatient) => void;
}) {
  const router = useRouter();

  const [sortKey, setSortKey] = useState<SortKey>("nome");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [microareaFilter, setMicroareaFilter] = useState<string>("all");
  const [conditionFilter, setConditionFilter] = useState<Set<LayerId>>(new Set());
  const [nameSearch, setNameSearch] = useState("");

  const microareaOptions = useMemo(() => {
    const seen = new Set<string>();
    for (const p of patients) {
      const ma = (p as Record<string, unknown>).microarea as string | null | undefined;
      if (ma) seen.add(ma);
    }
    return Array.from(seen).sort();
  }, [patients]);

  const activeLayerIds = useMemo<LayerId[]>(() => {
    const seen = new Set<LayerId>();
    for (const p of patients) {
      for (const c of p.conditions) seen.add(c);
    }
    return Array.from(seen);
  }, [patients]);

  function toggleConditionFilter(layerId: LayerId) {
    setConditionFilter((prev) => {
      const next = new Set(prev);
      if (next.has(layerId)) {
        next.delete(layerId);
      } else {
        next.add(layerId);
      }
      return next;
    });
  }

  const rows = useMemo(() => {
    let filtered = patients;

    if (microareaFilter !== "all") {
      filtered = filtered.filter(
        (p) => (p as Record<string, unknown>).microarea === microareaFilter,
      );
    }

    if (conditionFilter.size > 0) {
      filtered = filtered.filter((p) =>
        p.conditions.some((c) => conditionFilter.has(c)),
      );
    }

    if (nameSearch.trim()) {
      const q = nameSearch.trim().toLowerCase();
      filtered = filtered.filter((p) =>
        (p.nomeCompleto ?? "").toLowerCase().includes(q),
      );
    }

    return [...filtered].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "nome") {
        cmp = (a.nomeCompleto ?? "").localeCompare(b.nomeCompleto ?? "", "pt-BR");
      } else if (sortKey === "microarea") {
        const ma = (x: UnifiedPatient) =>
          ((x as Record<string, unknown>).microarea as string | null) ?? "";
        cmp = ma(a).localeCompare(ma(b), "pt-BR");
      } else if (sortKey === "updatedAt") {
        cmp = parseBrForSort(a.dataUltimaAtualizacao).localeCompare(
          parseBrForSort(b.dataUltimaAtualizacao),
        );
      } else if (sortKey === "alerta") {
        cmp = ALERT_ORDER[getPatientAlertLevel(a)] - ALERT_ORDER[getPatientAlertLevel(b)];
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [patients, microareaFilter, conditionFilter, nameSearch, sortKey, sortDir]);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function handleRowClick(p: UnifiedPatient) {
    router.push(`/map?patient=${p.id}`);
  }

  return (
    <div className="rounded-lg border border-border bg-white shadow-sm">
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
        <Input
          placeholder="Buscar por nome..."
          value={nameSearch}
          onChange={(e) => setNameSearch(e.target.value)}
          className="h-8 w-48 text-sm"
        />

        <Select value={microareaFilter} onValueChange={setMicroareaFilter}>
          <SelectTrigger size="sm" className="w-36">
            <SelectValue placeholder="Microárea" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as microáreas</SelectItem>
            {microareaOptions.map((ma) => (
              <SelectItem key={ma} value={ma}>
                {ma}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {activeLayerIds.length > 0 && (
          <div className="flex items-center gap-1">
            {activeLayerIds.map((layerId) => {
              const cfg = LAYER_CONFIG[layerId];
              const active = conditionFilter.has(layerId);
              return (
                <button
                  key={layerId}
                  onClick={() => toggleConditionFilter(layerId)}
                  className={`rounded-full border px-2 py-0.5 text-xs font-medium transition-colors ${
                    active
                      ? "border-transparent text-white"
                      : "border-border bg-transparent text-muted-foreground hover:text-foreground"
                  }`}
                  style={
                    active
                      ? { backgroundColor: `var(--${cfg.colorToken})` }
                      : undefined
                  }
                  aria-pressed={active}
                >
                  {cfg.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="px-4 py-2.5 text-left">
                <SortButton
                  label="Nome"
                  sortKey="nome"
                  current={sortKey}
                  dir={sortDir}
                  onClick={() => handleSort("nome")}
                />
              </th>
              <th className="px-4 py-2.5 text-left">
                <SortButton
                  label="Microárea"
                  sortKey="microarea"
                  current={sortKey}
                  dir={sortDir}
                  onClick={() => handleSort("microarea")}
                />
              </th>
              <th className="px-4 py-2.5 text-left">
                <span className="text-xs font-medium text-muted-foreground">
                  Condições
                </span>
              </th>
              <th className="px-4 py-2.5 text-left">
                <SortButton
                  label="Última atualização"
                  sortKey="updatedAt"
                  current={sortKey}
                  dir={sortDir}
                  onClick={() => handleSort("updatedAt")}
                />
              </th>
              <th className="px-4 py-2.5 text-left">
                <SortButton
                  label="Alerta"
                  sortKey="alerta"
                  current={sortKey}
                  dir={sortDir}
                  onClick={() => handleSort("alerta")}
                />
              </th>
              <th className="w-10 px-2 py-2.5 text-left">
                <span className="sr-only">Ações</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <SkeletonRows />
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">
                  Nenhum paciente encontrado com os filtros selecionados.
                </td>
              </tr>
            ) : (
              rows.map((p) => {
                const alertLevel = getPatientAlertLevel(p);
                const microarea = (p as Record<string, unknown>).microarea as
                  | string
                  | null
                  | undefined;

                return (
                  <tr
                    key={p.id}
                    onClick={() => handleRowClick(p)}
                    className="cursor-pointer border-b border-border transition-colors last:border-0 hover:bg-muted/40"
                  >
                    <td className="px-4 py-3 font-medium text-foreground">
                      {p.nomeCompleto ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {microarea ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {p.conditions.map((layerId) => {
                          const cfg = LAYER_CONFIG[layerId];
                          return (
                            <span
                              key={layerId}
                              className="rounded-full px-2 py-0.5 text-xs font-medium text-white"
                              style={{
                                backgroundColor: `var(--${cfg.colorToken})`,
                              }}
                            >
                              {cfg.label}
                            </span>
                          );
                        })}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {p.dataUltimaAtualizacao ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="inline-flex items-center"
                        title={ALERT_LABEL[alertLevel]}
                        aria-label={ALERT_LABEL[alertLevel]}
                      >
                        <span
                          className="inline-block size-2.5 rounded-full"
                          style={{ backgroundColor: ALERT_COLOR[alertLevel] }}
                        />
                      </span>
                    </td>
                    <td className="px-2 py-3 text-right">
                      {onEdit && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEdit(p);
                          }}
                          className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
                          aria-label={`Editar ${p.nomeCompleto ?? "paciente"}`}
                          title="Editar paciente"
                        >
                          <Pencil className="size-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
