/**
 * `useCreatePatient` / `useAttachCondition` — mutation hooks for the patient
 * create flow (PE-6).
 *
 * Conventions mirror `useUpdatePatient`:
 *  - Error shape `{ status, body }` so callers branch on status codes.
 *  - No retries on 4xx; one retry on 5xx network errors.
 *  - No optimistic update — creates go through and the invalidation refetches.
 *
 * LGPD: never logs patient data.  Error messages surface codes only.
 */

"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMapStore } from "@/stores/mapStore";
import { patientKeys } from "@/hooks/usePatientData";
import type { PatientCreate, ConditionAttach } from "@/lib/patients/schemas";

// ---------------------------------------------------------------------------
// Shared error shape
// ---------------------------------------------------------------------------

/** Matches the `UpdatePatientError` convention from `useUpdatePatient`. */
export interface CreatePatientError extends Error {
  status: number;
  body: {
    error?: string;
    requiresManualPin?: boolean;
    issues?: unknown[];
    patient?: Record<string, unknown>;
  };
}

function isCreatePatientError(e: unknown): e is CreatePatientError {
  return e instanceof Error && "status" in e;
}

export { isCreatePatientError };

// ---------------------------------------------------------------------------
// Internal fetch helper
// ---------------------------------------------------------------------------

async function postJson<TBody>(
  url: string,
  body: TBody,
): Promise<{ status: number; data: unknown }> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  let data: unknown;
  try {
    data = await res.json();
  } catch {
    data = {};
  }

  if (!res.ok) {
    const err = new Error(
      (data as Record<string, unknown>)?.error as string ??
        "Erro desconhecido.",
    ) as CreatePatientError;
    err.status = res.status;
    err.body = data as CreatePatientError["body"];
    throw err;
  }

  return { status: res.status, data };
}

// ---------------------------------------------------------------------------
// useCreatePatient
// ---------------------------------------------------------------------------

/**
 * POST /api/patients — creates a new patient with one extension row.
 *
 * On success: invalidates `patientKeys.all` and opens the detail panel for
 * the newly created patient via `setSelectedPatient(id)` (patient UUID from
 * the response envelope).
 *
 * On 4xx: propagates `CreatePatientError` without retrying.
 * On 5xx network: one automatic retry.
 */
export function useCreatePatient() {
  const queryClient = useQueryClient();
  const setSelectedPatient = useMapStore((s) => s.setSelectedPatient);

  return useMutation<
    { status: number; data: unknown },
    CreatePatientError,
    { body: PatientCreate }
  >({
    mutationFn: ({ body }) => postJson("/api/patients", body),
    retry: (failureCount, error) => {
      if (isCreatePatientError(error) && error.status < 500) return false;
      return failureCount < 1;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: patientKeys.all });
      const d = result.data as { patient?: { id?: string } } | undefined;
      const id = d?.patient?.id;
      if (id) setSelectedPatient(id);
    },
  });
}

// ---------------------------------------------------------------------------
// useAttachCondition
// ---------------------------------------------------------------------------

/**
 * POST /api/patients/[id]/conditions — attaches a new condition row to an
 * existing patient (used by the 409-collision dialog).
 *
 * On success: invalidates `patientKeys.all` and opens the detail panel.
 * On 4xx: propagates without retrying.
 * On 5xx: one automatic retry.
 */
export function useAttachCondition() {
  const queryClient = useQueryClient();
  const setSelectedPatient = useMapStore((s) => s.setSelectedPatient);

  return useMutation<
    { status: number; data: unknown },
    CreatePatientError,
    { patientId: string; body: ConditionAttach }
  >({
    mutationFn: ({ patientId, body }) =>
      postJson(`/api/patients/${patientId}/conditions`, body),
    retry: (failureCount, error) => {
      if (isCreatePatientError(error) && error.status < 500) return false;
      return failureCount < 1;
    },
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: patientKeys.all });
      setSelectedPatient(variables.patientId);
    },
  });
}
