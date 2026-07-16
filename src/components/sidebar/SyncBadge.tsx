"use client";

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

  // Format relative time
  let label = "Nunca sincronizado";
  let colorClass = "text-gray-500 bg-gray-100";

  if (lastSyncTime) {
    const diffMs = Date.now() - lastSyncTime;
    const diffMin = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMin / 60);

    if (diffMin < 1) {
      label = "Agora";
    } else if (diffMin < 60) {
      label = `${diffMin}min atrás`;
    } else if (diffHours < 24) {
      label = `${diffHours}h atrás`;
    } else {
      label = `${Math.floor(diffHours / 24)}d atrás`;
    }

    // Color by staleness
    if (diffMs < 60 * 60 * 1000) {
      colorClass = "text-green-700 bg-green-100";
    } else if (diffMs < 24 * 60 * 60 * 1000) {
      colorClass = "text-yellow-700 bg-yellow-100";
    } else {
      colorClass = "text-red-700 bg-red-100";
    }
  }

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
