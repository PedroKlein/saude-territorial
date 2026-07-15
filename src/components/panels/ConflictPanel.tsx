"use client";

import { useState } from "react";
import type { DetectedConflict } from "@/lib/sheets/dedup";

interface ConflictPanelProps {
  conflicts: DetectedConflict[];
  onResolve?: (cns: string, field: string, chosenLayer: string) => void;
}

/**
 * Panel showing field-by-field comparison for CNS dedup conflicts.
 * User picks which layer's value is correct.
 */
export function ConflictPanel({ conflicts, onResolve }: ConflictPanelProps) {
  const [resolvedKeys, setResolvedKeys] = useState<Set<string>>(new Set());

  if (conflicts.length === 0) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        Nenhum conflito detectado.
      </div>
    );
  }

  const unresolvedConflicts = conflicts.filter(
    (c) => !resolvedKeys.has(`${c.cns}:${c.field}`)
  );

  function handleResolve(cns: string, field: string, chosenLayer: string) {
    setResolvedKeys((prev) => new Set([...prev, `${cns}:${field}`]));
    onResolve?.(cns, field, chosenLayer);
  }

  return (
    <div className="flex flex-col gap-3 p-4">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        ⚠ Conflitos ({unresolvedConflicts.length})
      </h3>

      {unresolvedConflicts.map((conflict) => (
        <div
          key={`${conflict.cns}:${conflict.field}`}
          className="rounded-md border border-yellow-200 bg-yellow-50 p-3"
        >
          <p className="text-xs text-muted-foreground">
            CNS: {conflict.cns} • Campo: <strong>{conflict.field}</strong>
          </p>
          <div className="mt-2 flex flex-col gap-1">
            {Object.entries(conflict.values).map(([layerId, value]) => (
              <button
                key={layerId}
                onClick={() => handleResolve(conflict.cns, conflict.field, layerId)}
                className="flex items-center justify-between rounded px-2 py-1 text-left text-sm hover:bg-yellow-100"
              >
                <span className="text-xs text-muted-foreground">{layerId}:</span>
                <span className="font-medium">{String(value ?? "—")}</span>
              </button>
            ))}
          </div>
        </div>
      ))}

      {unresolvedConflicts.length === 0 && (
        <p className="text-sm text-green-700">
          ✓ Todos os conflitos resolvidos!
        </p>
      )}
    </div>
  );
}
