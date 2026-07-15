import { useMutation, useQueryClient } from "@tanstack/react-query";
import { patientKeys } from "./usePatientData";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PatientEditInput {
  spreadsheetId: string;
  tabName: string;
  rowIndex: number;
  updates: Record<string, string>;
}

// ---------------------------------------------------------------------------
// Mutation function
// ---------------------------------------------------------------------------

async function editPatient(input: PatientEditInput): Promise<{ success: boolean }> {
  const res = await fetch("/api/sheets", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? "Erro ao salvar. Tente novamente.");
  }

  return res.json();
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function usePatientEdit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: editPatient,
    onSuccess: () => {
      // Invalidate all patient data queries to refetch fresh data
      queryClient.invalidateQueries({ queryKey: patientKeys.all });
    },
  });
}
