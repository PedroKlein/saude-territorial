import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { LayerId } from "@/config/layers.config";
import {
  patientKeys,
  type LayeredPatientData,
  type PatientRecord,
} from "@/hooks/usePatientData";
import { patientDetailKeys } from "@/hooks/usePatient";
import type { PatientPatch } from "@/lib/patients/schemas";

/**
 * `useUpdatePatient` — TanStack Query mutation for `PATCH /api/patients/[id]`.
 *
 * Optimistic-update pattern per `.agents/skills/tanstack-query/SKILL.md`:
 *  1. `onMutate` snapshots the current `patientKeys.all` cache, applies a
 *     shallow diff to every layer array that carries this patient, and
 *     cancels in-flight refetches so a stale GET can't clobber the diff.
 *  2. `onError` rolls back to the snapshot and returns the raw response for
 *     the caller to surface (e.g. `requiresManualPin: true` on 422 → banner
 *     + pin-drop mode).
 *  3. `onSettled` invalidates `patientKeys.all` so the next paint hydrates
 *     from the authoritative server envelope (with recomputed `ig`, updated
 *     `dataUltimaAtualizacao`, and merged fields we didn't optimistically
 *     patch).
 *
 * Retry policy: none. A 4xx from the API is either validation (400) or a
 * user-recoverable state (409/422) — retrying either would be wrong. A 5xx
 * is worth surfacing once, not retrying blindly on a stale UI state.
 */

export type UpdatePatientInput = {
  /** Patient UUID (from `PatientRecord.id`). */
  id: string;
  /** Structured PATCH body — see `PatientPatchSchema`. */
  body: PatientPatch;
  /**
   * Optional flat delta to apply optimistically to the visible record. When
   * omitted, the mutation is not optimistic (waits for server round trip).
   *
   * The API's authoritative response replaces this on `onSettled`, so a
   * mismatch between `optimisticPatch` and `body` corrects itself within
   * one paint after the network completes.
   */
  optimisticPatch?: Partial<PatientRecord>;
}

/** Server error surface. `body.requiresManualPin` maps to the 422 fallback. */
export type UpdatePatientError = {
  status?: number;
  body?: {
    error?: string;
    requiresManualPin?: boolean;
    issues?: unknown[];
  };
} & Error

type MutationContext = {
  /** Snapshot of `patientKeys.all` before the optimistic write. */
  previous: LayeredPatientData | undefined;
}

export function useUpdatePatient() {
  const queryClient = useQueryClient();

  return useMutation<unknown, UpdatePatientError, UpdatePatientInput, MutationContext>({
    mutationFn: async ({ id, body }) => {
      const res = await fetch(`/api/patients/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        // Best-effort JSON parse; server always sends JSON, but a proxy 502
        // could interject HTML — treat that as opaque.
        let parsed: UpdatePatientError["body"];
        try {
          parsed = (await res.json()) as UpdatePatientError["body"];
        } catch {
          parsed = undefined;
        }
        const err: UpdatePatientError = new Error(
          parsed?.error ?? `HTTP ${res.status}`,
        );
        err.status = res.status;
        err.body = parsed;
        throw err;
      }

      return res.json() as Promise<unknown>;
    },

    onMutate: async ({ id, optimisticPatch }) => {
      // Cancel in-flight refetches so the optimistic write survives.
      await queryClient.cancelQueries({ queryKey: patientKeys.all });

      const previous = queryClient.getQueryData<LayeredPatientData>(patientKeys.all);
      if (previous && optimisticPatch) {
        const next = applyOptimisticPatch(previous, id, optimisticPatch);
        queryClient.setQueryData<LayeredPatientData>(patientKeys.all, next);
      }
      return { previous };
    },

    onError: (_err, _vars, context) => {
      // Rollback. The caller (edit form, drag handler) surfaces the toast
      // + PT-BR error text — this hook doesn't own UI.
      if (context?.previous) {
        queryClient.setQueryData<LayeredPatientData>(
          patientKeys.all,
          context.previous,
        );
      }
    },

    onSettled: (_data, _err, variables) => {
      // Invalidate the list AND this patient's detail so the open panel
      // hydrates from the authoritative server envelope (recomputed ig,
      // updated dataUltimaAtualizacao, merged fields).
      void queryClient.invalidateQueries({ queryKey: patientKeys.all });
      void queryClient.invalidateQueries({
        queryKey: patientDetailKeys.detail(variables.id),
      });
    },

    retry: false,
  });
}

function applyOptimisticPatch(
  data: LayeredPatientData,
  id: string,
  patch: Partial<PatientRecord>,
): LayeredPatientData {
  const next: LayeredPatientData = {};
  let changed = false;

  for (const [layerId, patients] of Object.entries(data) as [LayerId, PatientRecord[] | undefined][]) {
    if (!patients) {
      continue;
    }
    if (patients.some((p) => p.id === id)) {
      changed = true;
      next[layerId] = patients.map((p) => p.id === id ? { ...p, ...patch } : p);
    } else {
      next[layerId] = patients;
    }
  }

  return changed ? next : data;
}
