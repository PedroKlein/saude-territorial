"use client";

/**
 * DatePicker — shadcn Popover + Calendar compound, PT-BR locale.
 *
 * Shape hardened for form use:
 *  - `value: Date | null` (null represents cleared).
 *  - Formats display via `date-fns/format` with `dd/MM/yyyy`.
 *  - Optional `min` / `max` bounds propagated to `react-day-picker`.
 *  - Trigger is a shadcn `Button` variant="outline"; opens a calendar with
 *    PT-BR month + weekday names and Monday-first weeks.
 *
 * `DateRangePicker` shares the same trigger surface with `mode="range"` for
 * the two range cases the wizard needs: baciloscopia 1ª/2ª and treatment
 * início/encerramento.
 */

import * as React from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale/pt-BR";
import { CalendarIcon } from "lucide-react";
import type { DateRange } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const DATE_FMT = "dd/MM/yyyy";

type CommonProps = {
  /** Optional lower bound (inclusive). */
  min?: Date;
  /** Optional upper bound (inclusive). */
  max?: Date;
  /** Displayed when no date is selected. */
  placeholder?: string;
  /** Disable the whole trigger. */
  disabled?: boolean;
  /** Extra classes on the trigger button. */
  className?: string;
  /** aria-invalid mirror for RHF integration. */
  "aria-invalid"?: boolean;
  /** Called when the picker loses focus (RHF touched tracking). */
  onBlur?: React.FocusEventHandler<HTMLButtonElement>;
  /** aria-label — the trigger has no visible label of its own. */
  ariaLabel?: string;
}

export type DatePickerProps = CommonProps & {
  value: Date | null;
  onChange: (value: Date | null) => void;
};

export function DatePicker({
  value,
  onChange,
  min,
  max,
  placeholder = "Selecionar data",
  disabled,
  className,
  onBlur,
  ariaLabel,
  ...rest
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          onBlur={onBlur}
          aria-label={ariaLabel}
          aria-invalid={rest["aria-invalid"]}
          data-slot="date-picker-trigger"
          className={cn(
            "h-8 w-full justify-start gap-2 px-2.5 font-normal",
            !value && "text-muted-foreground",
            className,
          )}
        >
          <CalendarIcon className="size-4 opacity-70" />
          <span className={cn(value && "font-mono tabular-nums")}>
            {value ? format(value, DATE_FMT, { locale: ptBR }) : placeholder}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="single"
          selected={value ?? undefined}
          onSelect={(next) => {
            onChange(next ?? null);
            setOpen(false);
          }}
          disabled={
            min || max
              ? (d) =>
                  (min !== undefined && d < min) || (max !== undefined && d > max)
              : undefined
          }
          locale={ptBR}
          weekStartsOn={1}
          captionLayout="dropdown"
        />
      </PopoverContent>
    </Popover>
  );
}

export type DateRangePickerProps = CommonProps & {
  value: DateRange | null;
  onChange: (value: DateRange | null) => void;
};

export function DateRangePicker({
  value,
  onChange,
  min,
  max,
  placeholder = "Selecionar período",
  disabled,
  className,
  onBlur,
  ariaLabel,
  ...rest
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false);

  const display = React.useMemo(() => {
    if (!value?.from) return placeholder;
    const from = format(value.from, DATE_FMT, { locale: ptBR });
    if (!value.to) return from;
    return `${from} – ${format(value.to, DATE_FMT, { locale: ptBR })}`;
  }, [value, placeholder]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          onBlur={onBlur}
          aria-label={ariaLabel}
          aria-invalid={rest["aria-invalid"]}
          data-slot="date-range-picker-trigger"
          className={cn(
            "h-8 w-full justify-start gap-2 px-2.5 font-normal",
            !value?.from && "text-muted-foreground",
            className,
          )}
        >
          <CalendarIcon className="size-4 opacity-70" />
          <span className={cn(value?.from && "font-mono tabular-nums")}>{display}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="range"
          selected={value ?? undefined}
          onSelect={(next) => { onChange(next ?? null); }}
          disabled={
            min || max
              ? (d) =>
                  (min !== undefined && d < min) || (max !== undefined && d > max)
              : undefined
          }
          numberOfMonths={2}
          locale={ptBR}
          weekStartsOn={1}
          captionLayout="dropdown"
        />
      </PopoverContent>
    </Popover>
  );
}
