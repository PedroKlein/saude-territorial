"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PatientWizard } from "@/components/wizard/PatientWizard";

export function AddPatientButton({
  className,
  compactOnMobile = false,
  label = "Adicionar paciente",
}: {
  className?: string;
  compactOnMobile?: boolean;
  label?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        aria-label={compactOnMobile ? label : undefined}
        className={className}
        onClick={() => { setOpen(true); }}
      >
        <Plus data-icon="inline-start" />
        <span className={compactOnMobile ? "hidden sm:inline" : undefined}>
          {label}
        </span>
      </Button>
      <PatientWizard
        open={open}
        mode={{ kind: "new" }}
        onClose={() => { setOpen(false); }}
      />
    </>
  );
}
