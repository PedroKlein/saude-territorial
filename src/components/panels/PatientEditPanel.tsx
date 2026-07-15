"use client";

import { useState } from "react";
import { usePatientEdit } from "@/hooks/usePatientEdit";

interface PatientEditPanelProps {
  patient: Record<string, unknown>;
  columns: string[];
  onCancel: () => void;
  onSaved: () => void;
}

export function PatientEditPanel({
  patient,
  columns,
  onCancel,
  onSaved,
}: PatientEditPanelProps) {
  const [formData, setFormData] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const col of columns) {
      initial[col] = patient[col] != null ? String(patient[col]) : "";
    }
    return initial;
  });

  const editMutation = usePatientEdit();

  const handleSave = () => {
    const spreadsheetId = (patient._spreadsheetId as string) ?? "";
    const tabName = (patient._tabName as string) ?? "";
    const rowIndex = (patient._rowIndex as number) ?? 0;

    editMutation.mutate(
      {
        spreadsheetId,
        tabName,
        rowIndex,
        updates: formData,
      },
      {
        onSuccess: () => onSaved(),
      }
    );
  };

  return (
    <aside className="absolute right-0 top-0 z-[1000] h-full w-80 overflow-y-auto border-l bg-white p-4 shadow-lg">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Editar Paciente</h2>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSave();
        }}
        className="space-y-3"
      >
        {columns.map((col) => (
          <div key={col}>
            <label className="block text-xs font-medium uppercase text-muted-foreground">
              {col}
            </label>
            <input
              type="text"
              value={formData[col] ?? ""}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, [col]: e.target.value }))
              }
              className="mt-1 w-full rounded-md border px-3 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              disabled={editMutation.isPending}
            />
          </div>
        ))}

        {editMutation.isError && (
          <p className="text-sm text-red-600">
            Erro ao salvar. Tente novamente.
          </p>
        )}

        <div className="flex gap-2 pt-2">
          <button
            type="submit"
            disabled={editMutation.isPending}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
          >
            {editMutation.isPending ? "Salvando..." : "Salvar"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={editMutation.isPending}
            className="rounded-md border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-gray-50 disabled:opacity-50"
          >
            Cancelar
          </button>
        </div>
      </form>
    </aside>
  );
}
