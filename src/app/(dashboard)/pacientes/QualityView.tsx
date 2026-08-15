"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import type { UnifiedPatient } from "./page";

// ---------------------------------------------------------------------------
// Quality issue definitions
// ---------------------------------------------------------------------------

interface QualityGroup {
  id: string;
  title: string;
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
    case "sem-telefone":
      return !telefone;
    case "sem-cep":
      return !cep;
    default:
      return false;
  }
}

const ISSUE_DEFS: Array<{ id: string; title: string }> = [
  { id: "sem-endereco", title: "Sem endereço" },
  { id: "geocode-incerto", title: "Geocode incerto" },
  { id: "sem-microarea", title: "Sem microárea" },
  { id: "sem-telefone", title: "Sem telefone" },
  { id: "sem-cep", title: "Sem CEP" },
];

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
  onNavigate,
}: {
  group: QualityGroup;
  onNavigate: (id: string) => void;
}) {
  return (
    <div className="rounded-lg border border-border bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h3 className="text-sm font-semibold text-foreground">{group.title}</h3>
        <Badge variant="secondary" className="text-xs">
          {group.patients.length}
        </Badge>
      </div>
      <ul className="divide-y divide-border">
        {group.patients.map((p) => (
          <li key={p.id}>
            <button
              onClick={() => onNavigate(p.id)}
              className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm transition-colors hover:bg-muted/40"
            >
              <span className="flex-1 font-medium text-foreground">
                {p.nomeCompleto ?? "—"}
              </span>
              <span className="shrink-0 font-mono text-xs text-muted-foreground">
                {p.cns ?? "—"}
              </span>
              <span className="shrink-0 text-xs text-muted-foreground">
                Ver no mapa →
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export function QualityView({
  patients,
  isLoading,
}: {
  patients: UnifiedPatient[];
  isLoading: boolean;
}) {
  const router = useRouter();

  const groups = useMemo<QualityGroup[]>(() => {
    return ISSUE_DEFS.map(({ id, title }) => ({
      id,
      title,
      patients: patients.filter((p) => hasIssue(id, p)),
    })).filter((g) => g.patients.length > 0);
  }, [patients]);

  function handleNavigate(patientId: string) {
    router.push(`/map?patient=${patientId}`);
  }

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
        <QualityCard key={group.id} group={group} onNavigate={handleNavigate} />
      ))}
    </div>
  );
}
