"use client";

/**
 * PatientPickerCombobox — searchable patient picker for "+ Adicionar paciente".
 * Uses shadcn Command + Popover.
 */

import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { usePlannerStore } from "@/stores/plannerStore";
import type { PatientRecord } from "@/hooks/usePatientData";

interface PatientPickerComboboxProps {
  patients: PatientRecord[];
}

export function PatientPickerCombobox({ patients }: PatientPickerComboboxProps) {
  const [open, setOpen] = useState(false);
  const { stops, addStop } = usePlannerStore();

  const inPlan = new Set(stops.map((s) => s.patientId));

  function handleSelect(patientId: string) {
    if (!inPlan.has(patientId)) {
      addStop(patientId);
    }
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between text-sm font-normal text-neutral-500"
        >
          + Adicionar paciente
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[380px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar por nome ou CNS…" />
          <CommandList>
            <CommandEmpty>Nenhum paciente encontrado.</CommandEmpty>
            <CommandGroup>
              {patients.map((p) => {
                const already = inPlan.has(p.id);
                return (
                  <CommandItem
                    key={p.id}
                    value={`${p.nomeCompleto ?? ""} ${p.cns}`}
                    onSelect={() => handleSelect(p.id)}
                    disabled={already}
                    className={already ? "opacity-50" : ""}
                  >
                    <Check
                      className={`mr-2 h-4 w-4 ${already ? "opacity-100" : "opacity-0"}`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">
                        {p.nomeCompleto ?? "—"}
                      </div>
                      <div className="font-mono text-xs text-neutral-400">{p.cns}</div>
                    </div>
                    {already && (
                      <span className="ml-2 text-[10px] text-neutral-400">no plano</span>
                    )}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
