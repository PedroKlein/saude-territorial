"use client";

/**
 * `EnumField` — inline enum control. Segmented for 2 values, Select for 3+.
 *
 * Renders as an inline segmented control when `values.length === 2` and as
 * a Radix Select otherwise. Callers pass canonical enum values + a display
 * label map; the schema layer normalises input, so the UI can trust the
 * canonical form both directions.
 *
 * Consumer contract:
 *   - `value` is the canonical enum value or the empty string when unset.
 *   - `onChange(v)` receives the canonical enum value on selection.
 *   - `aria-invalid` support surfaces via `invalid`; renderers apply the
 *     destructive border/ring on the control.
 */

import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type EnumFieldProps = {
  values: readonly string[];
  labels: Readonly<Record<string, string>>;
  value: string;
  onChange: (v: string) => void;
  ariaLabel: string;
  invalid?: boolean;
  placeholder?: string;
  id?: string;
}

export function EnumField(props: EnumFieldProps) {
  if (props.values.length === 2) {
    return <SegmentedEnumField {...props} />;
  }
  return <SelectEnumField {...props} />;
}

function SegmentedEnumField({
  values,
  labels,
  value,
  onChange,
  ariaLabel,
  invalid,
  id,
}: EnumFieldProps) {
  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- false should omit aria-invalid rather than render aria-invalid="false"; behavior differs in the DOM
  const ariaInvalid = invalid || undefined;
  return (
    <div
      id={id}
      role="radiogroup"
      aria-label={ariaLabel}
      aria-invalid={ariaInvalid}
      className={cn(
        "flex items-center gap-1 rounded-md border border-input bg-background p-0.5",
        invalid && "border-destructive ring-3 ring-destructive/20",
      )}
    >
      {values.map((v) => {
        const active = value === v;
        return (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => { onChange(v); }}
            className={cn(
              "flex-1 rounded px-2.5 py-1.5 text-sm transition",
              active
                ? "bg-primary text-primary-foreground"
                : "text-neutral-700 hover:bg-neutral-100",
            )}
          >
            {labels[v] ?? v}
          </button>
        );
      })}
    </div>
  );
}

function SelectEnumField({
  values,
  labels,
  value,
  onChange,
  ariaLabel,
  invalid,
  placeholder,
  id,
}: EnumFieldProps) {
  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- false should omit aria-invalid rather than render aria-invalid="false"; behavior differs in the DOM
  const ariaInvalid = invalid || undefined;
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger
        id={id}
        aria-label={ariaLabel}
        aria-invalid={ariaInvalid}
        className={cn(
          "w-full",
          invalid && "border-destructive focus-visible:ring-destructive/40",
        )}
      >
        <SelectValue placeholder={placeholder ?? "Selecionar"} />
      </SelectTrigger>
      <SelectContent>
        {values.map((v) => (
          <SelectItem key={v} value={v}>
            {labels[v] ?? v}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
