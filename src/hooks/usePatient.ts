"use client";

/**
 * `usePatient(id)` — TanStack Query hook for GET /api/patients/[id].
 *
 * Returns the unified patient shape (identity + all attached condition rows).
 * LGPD: id is an opaque UUID; no patient data is passed outside the hook.
 */

import { useQuery } from "@tanstack/react-query";
import type { UnifiedPatient } from "@/app/api/patients/[id]/route";

export const patientDetailKeys = {
  detail: (id: string) => ["patient", id] as const,
};

export function usePatient(id: string | null) {
  return useQuery<UnifiedPatient>({
    queryKey: patientDetailKeys.detail(id ?? ""),
    enabled: id != null,
    queryFn: async () => {
      const res = await fetch(`/api/patients/${id}`);
      if (!res.ok) {
        const errCode = res.status;
        throw new Error(`HTTP ${errCode}`);
      }
      const json = (await res.json()) as { patient: UnifiedPatient };
      return json.patient;
    },
    staleTime: 30 * 1000, // 30 seconds
  });
}
