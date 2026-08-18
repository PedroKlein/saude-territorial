import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { LayerId } from "@/config/layers.config";
import {
  patientKeys,
  type LayeredPatientData,
  type PatientRecord,
} from "@/hooks/usePatientData";
import { patientDetailKeys } from "@/hooks/usePatient";
import type { ExtensionLayer } from "@/lib/patients/schemas";
import { useMapStore } from "@/stores/mapStore";

/**
 * `useDeletePatient` — TanStack Query mutation for `DELETE /api/patients/[id]`.
 *
 * Optimistic-update pattern mirrors `useUpdatePatient`:
 *  1. `onMutate` snapshots the cache and removes the patient from every layer.
 *  2. `onError` rolls back to the snapshot.
 *  3. `onSettled` invalidates `patientKeys.all` for an authoritative refetch.
 *  4. `onSuccess` closes the detail panel via `setSelectedPatient(null)`.
 *
 * Retry policy: no retry on 4xx; one retry on 5xx / network.
 */

export interface DeletePatientInput {
  /** Patient UUID. */
  id: string;
}

export interface DeleteConditionInput {
  /** Patient UUID. */
  id: string;
  /** Extension layer to remove. */
  condicao: ExtensionLayer;
}

export interface DeletePatientError extends Error {
  status?: number;
  body?: { error?: string };
}

interface MutationContext {
  /** Snapshot of `patientKeys.all` before the optimistic write. */
  previous: LayeredPatientData | undefined;
}

export function useDeletePatient() {
  const queryClient = useQueryClient();
  const setSelectedPatient = useMapStore((s) => s.setSelectedPatient);

  return useMutation<unknown, DeletePatientError, DeletePatientInput, MutationContext>({
    mutationFn: async ({ id }) => {
      const res = await fetch(`/api/patients/${id}`, { method: "DELETE" });

      if (!res.ok) {
        let parsed: DeletePatientError["body"];
        try {
          parsed = (await res.json()) as DeletePatientError["body"];
        } catch {
          parsed = undefined;
        }
        const err: DeletePatientError = new Error(
          parsed?.error ?? `HTTP ${res.status}`,
        );
        err.status = res.status;
        err.body = parsed;
        throw err;
      }

      // 204 has no body; return void
      return undefined;
    },

    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey: patientKeys.all });
      const previous = queryClient.getQueryData<LayeredPatientData>(patientKeys.all);
      if (previous) {
        const next = removePatientFromAllLayers(previous, id);
        queryClient.setQueryData<LayeredPatientData>(patientKeys.all, next);
      }
      return { previous };
    },

    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData<LayeredPatientData>(patientKeys.all, context.previous);
      }
    },

    onSuccess: () => {
      setSelectedPatient(null);
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: patientKeys.all });
    },

    retry: (failureCount, error) => {
      if (error.status != null && error.status >= 400 && error.status < 500) {
        return false;
      }
      return failureCount < 1;
    },
  });
}

export function useDeleteCondition() {
  const queryClient = useQueryClient();

  return useMutation<unknown, DeletePatientError, DeleteConditionInput, MutationContext>({
    mutationFn: async ({ id, condicao }) => {
      const res = await fetch(`/api/patients/${id}/conditions/${condicao}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        let parsed: DeletePatientError["body"];
        try {
          parsed = (await res.json()) as DeletePatientError["body"];
        } catch {
          parsed = undefined;
        }
        const err: DeletePatientError = new Error(
          parsed?.error ?? `HTTP ${res.status}`,
        );
        err.status = res.status;
        err.body = parsed;
        throw err;
      }

      return undefined;
    },

    onMutate: async ({ id, condicao }) => {
      await queryClient.cancelQueries({ queryKey: patientKeys.all });
      const previous = queryClient.getQueryData<LayeredPatientData>(patientKeys.all);
      if (previous) {
        const next = removePatientFromLayer(previous, id, condicao);
        queryClient.setQueryData<LayeredPatientData>(patientKeys.all, next);
      }
      return { previous };
    },

    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData<LayeredPatientData>(patientKeys.all, context.previous);
      }
    },

    onSettled: (_data, _err, variables) => {
      queryClient.invalidateQueries({ queryKey: patientKeys.all });
      queryClient.invalidateQueries({
        queryKey: patientDetailKeys.detail(variables.id),
      });
    },

    retry: (failureCount, error) => {
      if (error.status != null && error.status >= 400 && error.status < 500) {
        return false;
      }
      return failureCount < 1;
    },
  });
}

function removePatientFromAllLayers(
  data: LayeredPatientData,
  id: string,
): LayeredPatientData {
  const next: LayeredPatientData = {};
  for (const [layerId, records] of Object.entries(data) as Array<
    [LayerId, PatientRecord[] | undefined]
  >) {
    if (!records) continue;
    next[layerId] = records.filter((p) => p.id !== id);
  }
  return next;
}

function removePatientFromLayer(
  data: LayeredPatientData,
  id: string,
  condicao: ExtensionLayer,
): LayeredPatientData {
  const next = { ...data };
  const layer = data[condicao];
  if (layer) {
    next[condicao] = layer.filter((p) => p.id !== id);
  }
  return next;
}
