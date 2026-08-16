"use client";

/**
 * Prototype: enum field render styles.
 *
 * Three columns, each render style applied to three enum shapes:
 *   - 2 values (`risco`)
 *   - 4 values (`status_realizacao`)
 *   - 7 values (`encerramento_motivo_tb`)
 *
 * Purpose: pick a default render style before wiring the real forms.
 * Interactive — click / tab through to feel touch targets + keyboard flow.
 */

import * as React from "react";

import {
  ENCERRAMENTO_MOTIVO_TB_LABELS,
  ENCERRAMENTO_MOTIVO_TB_VALUES,
  RISCO_LABELS,
  RISCO_VALUES,
  STATUS_REALIZACAO_LABELS,
  STATUS_REALIZACAO_VALUES,
} from "@/lib/patients/enums";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

type FieldSpec = {
  key: string;
  label: string;
  values: readonly string[];
  labels: Record<string, string>;
};

const SPECS: readonly FieldSpec[] = [
  {
    key: "risco",
    label: "Risco (2 valores)",
    values: RISCO_VALUES,
    labels: RISCO_LABELS as Record<string, string>,
  },
  {
    key: "status",
    label: "Avaliação odonto (4 valores)",
    values: STATUS_REALIZACAO_VALUES,
    labels: STATUS_REALIZACAO_LABELS as Record<string, string>,
  },
  {
    key: "encerramento",
    label: "Motivo de encerramento TB (7 valores)",
    values: ENCERRAMENTO_MOTIVO_TB_VALUES,
    labels: ENCERRAMENTO_MOTIVO_TB_LABELS as Record<string, string>,
  },
];

// ---------------------------------------------------------------------------
// Variant A — Select (dropdown)
// ---------------------------------------------------------------------------

function VariantSelect({ spec }: { spec: FieldSpec }) {
  const [value, setValue] = React.useState("");
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {spec.label}
      </Label>
      <Select value={value} onValueChange={setValue}>
        <SelectTrigger aria-label={spec.label}>
          <SelectValue placeholder="Selecione…" />
        </SelectTrigger>
        <SelectContent>
          {spec.values.map((v) => (
            <SelectItem key={v} value={v}>
              {spec.labels[v]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Variant B — Segmented control (radio-styled buttons in a row)
// ---------------------------------------------------------------------------

function VariantSegmented({ spec }: { spec: FieldSpec }) {
  const [value, setValue] = React.useState("");
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {spec.label}
      </Label>
      <div
        role="radiogroup"
        aria-label={spec.label}
        className="flex flex-wrap gap-1 rounded-md border border-input bg-background p-0.5"
      >
        {spec.values.map((v) => {
          const active = value === v;
          return (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setValue(v)}
              className={cn(
                "rounded px-2.5 py-1.5 text-sm transition",
                active
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-neutral-100",
              )}
            >
              {spec.labels[v]}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Variant C — Radio group (vertical list)
// ---------------------------------------------------------------------------

function VariantRadio({ spec }: { spec: FieldSpec }) {
  const [value, setValue] = React.useState("");
  const id = React.useId();
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {spec.label}
      </Label>
      <RadioGroup value={value} onValueChange={setValue} aria-label={spec.label}>
        {spec.values.map((v) => {
          const rid = `${id}-${v}`;
          return (
            <div key={v} className="flex items-center gap-2">
              <RadioGroupItem value={v} id={rid} />
              <Label htmlFor={rid} className="text-sm font-normal">
                {spec.labels[v]}
              </Label>
            </div>
          );
        })}
      </RadioGroup>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const VARIANTS: ReadonlyArray<{
  key: string;
  title: string;
  body: string;
  render: (spec: FieldSpec) => React.ReactElement;
}> = [
  {
    key: "select",
    title: "A — Select (dropdown)",
    body: "Compact. Works for every enum size. Requires a click to see options.",
    render: (spec) => <VariantSelect spec={spec} />,
  },
  {
    key: "segmented",
    title: "B — Segmented control",
    body: "One tap. Best for 2–4 short options. Wraps ugly past ~5.",
    render: (spec) => <VariantSegmented spec={spec} />,
  },
  {
    key: "radio",
    title: "C — Radio group (vertical)",
    body: "Explicit review; long labels breathe. Vertical real estate cost.",
    render: (spec) => <VariantRadio spec={spec} />,
  },
];

export default function EnumFieldsPrototype() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <header className="max-w-2xl">
        <h1 className="text-2xl font-medium">Enum field render styles</h1>
        <p className="mt-2 text-sm text-neutral-600">
          Pick one to wire the wizard + panel edit form. Each column is a
          variant; each row is a real Phase A enum. Interact freely — nothing
          persists.
        </p>
      </header>

      <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {VARIANTS.map((variant) => (
          <section
            key={variant.key}
            className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm"
          >
            <header>
              <h2 className="text-base font-medium">{variant.title}</h2>
              <p className="mt-1 text-xs text-neutral-600">{variant.body}</p>
            </header>
            <div className="mt-6 space-y-6">
              {SPECS.map((spec) => (
                <div key={spec.key}>{variant.render(spec)}</div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
