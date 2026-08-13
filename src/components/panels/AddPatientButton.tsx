"use client";

/**
 * `AddPatientButton` — primary button in the dashboard header that opens the
 * `PatientCreateForm` modal.
 */

import { useCreateFormStore } from "@/stores/createFormStore";
import { PatientCreateForm } from "@/components/panels/PatientCreateForm";

export function AddPatientButton() {
  const open = useCreateFormStore((s) => s.open);
  const isOpen = useCreateFormStore((s) => s.isOpen);

  return (
    <>
      <button
        type="button"
        onClick={() => open()}
        className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
      >
        + Adicionar paciente
      </button>
      {isOpen && <PatientCreateForm />}
    </>
  );
}
