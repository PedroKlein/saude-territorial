"use client";

/**
 * Masked input wrappers built on `react-imask` + the shadcn `Input` styling.
 *
 * Each wrapper:
 *  - Renders an underlying `<input>` styled with the same Tailwind class list
 *    used by `Input`, so masked and unmasked fields sit flush in the same
 *    form grid.
 *  - Emits the UNMASKED value through `onValueChange(unmasked, masked)` so
 *    forms persist storage-friendly strings (`"12345678901234567890"`) while
 *    still being able to render the mask on read.
 *  - Forwards a ref to the DOM `<input>` element so `react-hook-form`'s
 *    controller can focus / scroll the field on error.
 *
 * Masks (from DS-15 + the pivot execution schema):
 *  - CNS: `000 0000 0000 0000` — 15 digits, four groups per SUS spec.
 *  - Phone (celular): `(00) 00000-0000` — 11 digits (DDD + 9-digit mobile).
 *  - Pressão Arterial: `000/000` — sistólica/diastólica, 2–3 digits each.
 */

import * as React from "react";
import { IMaskInput } from "react-imask";

import { cn } from "@/lib/utils";

/** Shared class list — kept in one place so future edits to the shadcn
 * `Input` primitive translate immediately here. */
const INPUT_CLASSES =
  "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30";

/**
 * Base props every wrapper accepts. We keep the surface narrow on purpose —
 * additional react-imask options can be surfaced per-wrapper if a form asks.
 */
type BaseProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "onChange" | "value" | "defaultValue" | "onBlur"
> & {
  /** Storage-friendly value (unmasked digits). Empty string clears the field. */
  value?: string;
  /** Fires with (unmasked, masked). Persist `unmasked`; render `masked`. */
  onValueChange?: (unmasked: string, masked: string) => void;
  /** Forwarded onBlur — used by react-hook-form for touched tracking. */
  onBlur?: React.FocusEventHandler<HTMLInputElement>;
  className?: string;
  /** Aria-label alias (camelCase) for consistency with our other primitives. */
  ariaLabel?: string;
};

type MaskedInputInternalProps = BaseProps & {
  mask: string;
  placeholder?: string;
  ariaLabel?: string;
};

const MaskedInputInternal = React.forwardRef<HTMLInputElement, MaskedInputInternalProps>(
  function MaskedInputInternal(
    { value, onValueChange, onBlur, mask, className, placeholder, ariaLabel, ...rest },
    ref,
  ) {
    // With `unmask=true`, react-imask expects the incoming `value` to be
    // the raw unmasked digits (e.g. "51919104707" for phone). Legacy DB
    // rows sometimes contain formatting like "51 919104707" or "(51)
    // 91910-4707" — feeding those directly makes the mask parser bail
    // after the first invalid character, leaving the field looking empty.
    // Normalizing to digits here keeps every existing row round-trippable
    // without a data migration.
    const normalized = React.useMemo(
      () => (value == null ? "" : String(value).replace(/\D/g, "")),
      [value],
    );
    return (
      <IMaskInput
        mask={mask}
        // We store unmasked so form state matches the DB column shape.
        unmask
        lazy={false}
        placeholderChar="_"
        // react-imask forwards to a plain <input>; the ref hop lets RHF focus it.
        inputRef={ref as React.Ref<HTMLInputElement>}
        value={normalized}
        onAccept={(unmasked: string, maskRef) => {
          onValueChange?.(unmasked, maskRef.value);
        }}
        onBlur={onBlur}
        aria-label={ariaLabel}
        placeholder={placeholder}
        data-slot="input"
        className={cn(INPUT_CLASSES, "font-mono tabular-nums", className)}
        {...rest}
      />
    );
  },
);

/**
 * CNS — Cartão Nacional de Saúde (15 digits, formatted as four groups).
 * Storage: raw digits. Display: `000 0000 0000 0000`.
 */
export const CnsInput = React.forwardRef<HTMLInputElement, BaseProps>(
  function CnsInput(props, ref) {
    return (
      <MaskedInputInternal
        ref={ref}
        mask="000 0000 0000 0000"
        placeholder="___ ____ ____ ____"
        ariaLabel="CNS"
        {...props}
      />
    );
  },
);

/**
 * Phone (celular). 11 digits, formatted `(DD) 9XXXX-XXXX`.
 * Storage: raw digits. Display: `(00) 00000-0000`.
 */
export const PhoneInput = React.forwardRef<HTMLInputElement, BaseProps>(
  function PhoneInput(props, ref) {
    return (
      <MaskedInputInternal
        ref={ref}
        mask="(00) 00000-0000"
        placeholder="(51) 99999-9999"
        ariaLabel="Telefone"
        {...props}
      />
    );
  },
);

/**
 * Pressão Arterial — sistólica/diastólica, up to 3 digits each.
 * We DO allow 2-digit entries by making the trailing digit optional via a
 * pattern block; the emitted unmasked value is `sss/ddd` or `ss/dd` etc.
 *
 * NOTE: the unmasked value here still contains the `/` because the mask
 * pattern preserves it as a fixed placeholder. Downstream form code should
 * treat this as a display-shaped string, not raw digits.
 */
export const PressureInput = React.forwardRef<HTMLInputElement, BaseProps>(
  function PressureInput(props, ref) {
    return (
      <MaskedInputInternal
        ref={ref}
        mask="000/000"
        placeholder="120/80"
        ariaLabel="Pressão arterial"
        {...props}
      />
    );
  },
);
