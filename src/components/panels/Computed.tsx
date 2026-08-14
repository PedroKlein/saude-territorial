"use client";

/**
 * Computed — dashed-border display for read-only derived values.
 *
 * Used for DPP (Data Provável do Parto — DUM + 280 days) and IG (Idade
 * Gestacional — DUM → today). The dashed border + calculator icon signal
 * to the user that the value is derived, not editable.
 */

import * as React from "react";
import { Calculator } from "lucide-react";

import { cn } from "@/lib/utils";

type ComputedProps = {
  /** The derived value — usually a formatted date or a number. */
  value: React.ReactNode;
  /** Small suffix printed after the value — e.g. `"semanas"`. */
  suffix?: React.ReactNode;
  /** Aria-label for screen readers when the value alone is opaque. */
  ariaLabel?: string;
  className?: string;
};

export function Computed({ value, suffix, ariaLabel, className }: ComputedProps) {
  return (
    <div
      role="status"
      aria-label={ariaLabel}
      data-slot="computed"
      className={cn(
        "flex h-8 w-full items-center gap-2 rounded-lg border border-dashed border-input bg-muted/40 px-2.5 py-1 text-sm text-muted-foreground",
        className,
      )}
    >
      <Calculator className="size-3.5 shrink-0 opacity-70" aria-hidden />
      <span className="font-mono tabular-nums text-foreground">{value}</span>
      {suffix != null && <span className="text-xs">{suffix}</span>}
    </div>
  );
}
