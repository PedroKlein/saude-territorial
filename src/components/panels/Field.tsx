"use client";

/**
 * Field — panel/wizard/form label + control + hint/error triplet.
 *
 * Shape:
 *  <Field label="Data da última consulta" hint="Preencha se disponível" error={errors.dataUltimaConsulta?.message}>
 *    <DatePicker ... />
 *  </Field>
 *
 * The label uses small-caps typography for editorial-style forms (DS-12).
 * `hint` and `error` share a slot; `error` wins when both are present.
 * `id` propagates so the label's `htmlFor` binds correctly to the control.
 */

import * as React from "react";

import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

type FieldProps = {
  /** Visible label. Renders in small-caps + brand text-muted-foreground. */
  label: React.ReactNode;
  /** Muted hint under the control. Overridden by `error` when set. */
  hint?: React.ReactNode;
  /** Error message from Zod / react-hook-form. */
  error?: React.ReactNode;
  /** `htmlFor` wiring; also forwarded to the child if it accepts `id`. */
  id?: string;
  /** Marks the field required (⁎ suffix). Cosmetic only. */
  required?: boolean;
  /** Slot for the control (Input, DatePicker, Select, etc.). */
  children: React.ReactNode;
  className?: string;
}

export function Field({
  label,
  hint,
  error,
  id,
  required,
  children,
  className,
}: FieldProps) {
  const message = error ?? hint;
  const hasError = Boolean(error);

  return (
    <div className={cn("flex flex-col gap-1.5", className)} data-slot="field">
      <Label
        htmlFor={id}
        className={cn(
          "text-[11px] font-medium uppercase tracking-wide text-muted-foreground",
          hasError && "text-destructive",
        )}
      >
        {label}
        {required && <span aria-hidden className="ml-0.5 text-destructive">*</span>}
      </Label>
      {children}
      {message !== undefined && message !== null && message !== "" && (
        <p
          data-slot="field-message"
          role={hasError ? "alert" : undefined}
          className={cn(
            "text-xs leading-tight",
            hasError ? "text-destructive" : "text-muted-foreground",
          )}
        >
          {message}
        </p>
      )}
    </div>
  );
}
