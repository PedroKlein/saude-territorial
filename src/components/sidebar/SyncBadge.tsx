"use client";

import { useMemo } from "react";
import { useSyncStore } from "@/hooks/usePatientData";
import { useQueryClient } from "@tanstack/react-query";
import { patientKeys } from "@/hooks/usePatientData";
/**
 * Shows data freshness badge + manual sync button.
 * Colors: green (<1h), yellow (1-24h), red (>24h).
 */
export function SyncBadge() {
  const lastSyncTime = useSyncStore((s) => s.lastSyncTime);
  const isSyncing = useSyncStore((s) => s.isSyncing);
  const queryClient = useQueryClient();

  function handleSync() {
    queryClient.invalidateQueries({ queryKey: patientKeys.all });
  }

  // Frozen snapshot: recompute the badge only when `lastSyncTime` changes,
  // not on every render. The badge is a coarse indicator; a ticking clock
  // would just churn the DOM every render.
  const { label, colorClass } = useMemo(() => {
    if (!lastSyncTime) {
      return { label: "Nunca sincronizado", colorClass: "text-gray-500 bg-gray-100" };
    }
    const diffMs = Date.now() - lastSyncTime;
    const diffMin = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMin / 60);
    let relLabel: string;
    if (diffMin < 1) relLabel = "Agora";
    else if (diffMin < 60) relLabel = `${diffMin}min atrás`;
    else if (diffHours < 24) relLabel = `${diffHours}h atrás`;
    else relLabel = `${Math.floor(diffHours / 24)}d atrás`;
    let cls: string;
    if (diffMs < 60 * 60 * 1000) cls = "text-green-700 bg-green-100";
    else if (diffMs < 24 * 60 * 60 * 1000) cls = "text-yellow-700 bg-yellow-100";
    else cls = "text-red-700 bg-red-100";
    return { label: relLabel, colorClass: cls };
  }, [lastSyncTime]);

  return (
    <div className="flex items-center gap-2 border-t px-4 py-2">
      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${colorClass}`}>
        {isSyncing ? "Sincronizando..." : label}
      </span>
      <button
        onClick={handleSync}
        disabled={isSyncing}
        className="rounded px-2 py-1 text-xs text-muted-foreground hover:bg-gray-100 disabled:opacity-50"
      >
        {isSyncing ? "⏳" : "🔄"} Sincronizar
      </button>
    </div>
  );
}
