"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { UnifiedPatient } from "./page";

// ---------------------------------------------------------------------------
// Quality issue definitions
// ---------------------------------------------------------------------------

interface IssueDef {
  id: string;
  title: string;
  /** Deprioritize in card visual — reduced opacity */
  muted?: boolean;
}

interface QualityGroup extends IssueDef {
  patients: UnifiedPatient[];
}

function hasIssue(group: string, p: UnifiedPatient): boolean {
  const r = p as Record<string, unknown>;
  const rua = r.rua as string | null | undefined;
  const lat = p.lat as number | null | undefined;
  const lng = p.lng as number | null | undefined;
  const microarea = r.microarea as string | null | undefined;
  const telefone = r.telefone as string | null | undefined;
  const cep = r.cep as string | null | undefined;
  const confidence = p.confidence;
  const dataNascimento = r.dataNascimento as string | null | undefined;
  const nomeCompleto = p.nomeCompleto;
  const vulnerabilidades = r.vulnerabilidades as unknown[] | null | undefined;
  const geocodeStatus = r.geocodeStatus as string | null | undefined;

  switch (group) {
    case "sem-endereco":
      return !rua && (!lat || !lng);
    case "geocode-incerto":
      return (
        (typeof confidence === "number" && confidence < 0.5) ||
        (!!(lat && lng) && !rua)
      );
    case "sem-microarea":
      return !microarea;
    case "sem-nome":
      return !nomeCompleto || nomeCompleto.trim() === "";
    case "sem-data-nascimento":
      return !dataNascimento;
    case "sem-telefone":
      return !telefone;
    case "sem-cep":
      return !cep;
    case "geocode-manual":
      return geocodeStatus === "manual";
    case "sem-vulnerabilidades":
      return !vulnerabilidades || (vulnerabilidades as unknown[]).length === 0;
    default:
      return false;
  }
}

// Highest-signal groups first; sem-vulnerabilidades is deprioritized (muted).
const ISSUE_DEFS: IssueDef[] = [
  { id: "sem-endereco", title: "Sem endereço" },
  { id: "geocode-incerto", title: "Geocode incerto" },
  { id: "sem-microarea", title: "Sem microárea" },
  { id: "sem-nome", title: "Sem nome" },
  { id: "sem-data-nascimento", title: "Sem data de nascimento" },
  { id: "sem-telefone", title: "Sem telefone" },
  { id: "sem-cep", title: "Sem CEP" },
  { id: "geocode-manual", title: "Geocode manual" },
  { id: "sem-vulnerabilidades", title: "Sem vulnerabilidades", muted: true },
];

const COLLAPSE_AT = 5;

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function SkeletonCards() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="h-28 animate-pulse rounded-lg border border-border bg-white"
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Quality group card
// ---------------------------------------------------------------------------

function QualityCard({
  group,
  totalPatients,
  onEdit,
}: {
  group: QualityGroup;
  totalPatients: number;
  onEdit: (patientId: string) => void;
}) {
  const [showAll, setShowAll] = useState(false);
  const count = group.patients.length;
  const visible = showAll ? group.patients : group.patients.slice(0, COLLAPSE_AT);
  const hiddenCount = count - COLLAPSE_AT;

  return (
    <div
      className={`rounded-lg border border-border bg-white shadow-sm${
        group.muted ? " opacity-60" : ""
      }`}
    >
      {/* Card header: title + count badge + denominator */}
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <h3 className="text-sm font-semibold text-foreground">{group.title}</h3>
        <Badge variant="secondary" className="text-xs">
          {count}
        </Badge>
        <span className="ml-auto text-xs text-muted-foreground">
          {count} de {totalPatients} pacientes
        </span>
      </div>

      {/* Patient rows */}
      <ul className="divide-y divide-border">
        {visible.map((p) => (
          <li key={p.id}>
            <div className="flex items-center gap-2 px-4 py-2.5">
              <span className="flex-1 truncate text-sm font-medium text-foreground">
                {p.nomeCompleto?.trim() || "—"}
              </span>
              <span className="shrink-0 font-mono text-xs text-muted-foreground">
                {p.cns ?? "—"}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit(p.id)}
              >
                Editar
              </Button>
              <a
                href={`/map?patient=${p.id}`}
                className="shrink-0 text-xs text-muted-foreground hover:text-foreground"
              >
                Ver no mapa →
              </a>
            </div>
          </li>
        ))}
      </ul>

      {/* Expand trigger */}
      {!showAll && hiddenCount > 0 && (
        <div className="border-t border-border px-4 py-2">
          <button
            onClick={() => setShowAll(true)}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Mostrar mais {hiddenCount}
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export function QualityView({
  patients,
  isLoading,
  onEdit,
}: {
  patients: UnifiedPatient[];
  isLoading: boolean;
  onEdit: (patientId: string) => void;
}) {
  const groups = useMemo<QualityGroup[]>(() => {
    return ISSUE_DEFS.map(({ id, title, muted }) => ({
      id,
      title,
      muted,
      patients: patients.filter((p) => hasIssue(id, p)),
    })).filter((g) => g.patients.length > 0);
  }, [patients]);

  if (isLoading) return <SkeletonCards />;

  if (groups.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-white px-6 py-12 text-center shadow-sm">
        <p className="text-sm text-muted-foreground">
          Todos os cadastros têm dados básicos preenchidos.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <QualityCard
          key={group.id}
          group={group}
          totalPatients={patients.length}
          onEdit={onEdit}
        />
      ))}
    </div>
  );
}
