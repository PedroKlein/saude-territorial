"use client";

/**
 * `AddPatientButton` — dashboard-header CTA that opens `PatientWizard`
 * in `new` mode. The old standalone `PatientCreateForm` was retired in
 * UP-3.4; the wizard now owns the create-patient flow end-to-end.
 */

import { useState } from "react";

import { PatientWizard } from "@/components/wizard/PatientWizard";

export function AddPatientButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-brand/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        + Adicionar paciente
      </button>
      <PatientWizard
        open={open}
        mode={{ kind: "new" }}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
