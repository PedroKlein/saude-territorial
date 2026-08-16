"use client";

/**
 * Prototype: cross-field error affordances.
 *
 * All three variants exercise the same rule:
 *   `dataProximaConsulta > dataUltimaConsulta`
 *
 * The Zod schema is the same across variants; only the presentation of the
 * error differs. Purpose: pick a default before wiring the real forms.
 */

import * as React from "react";
import { AlertTriangle } from "lucide-react";

import { GestantesPatchSchema } from "@/lib/patients/schemas";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Errors = { dataUltimaConsulta?: string; dataProximaConsulta?: string };

/**
 * Run the Zod schema and pluck the two date errors. Kept local so each
 * variant renders against the same source of truth.
 */
function useDatePairErrors(ultima: string, proxima: string): Errors {
  return React.useMemo(() => {
    const result = GestantesPatchSchema.safeParse({
      dataUltimaConsulta: ultima || null,
      dataProximaConsulta: proxima || null,
    });
    if (result.success) return {};
    const map: Errors = {};
    for (const issue of result.error.issues) {
      const path = issue.path[0];
      if (path === "dataUltimaConsulta" || path === "dataProximaConsulta") {
        map[path] = issue.message;
      }
    }
    return map;
  }, [ultima, proxima]);
}

// ---------------------------------------------------------------------------
// Variant A — Error under the later field, both fields flagged red
// ---------------------------------------------------------------------------

function VariantUnderField() {
  const [ultima, setUltima] = React.useState("15/03/2025");
  const [proxima, setProxima] = React.useState("10/03/2025");
  const errors = useDatePairErrors(ultima, proxima);
  const bothInvalid = Boolean(errors.dataProximaConsulta);

  return (
    <VariantShell
      title="A — Erro sob o campo (borda vermelha em ambos)"
      body={
        "O erro aparece no campo 'depende de' (próxima). Ambos os campos "
        + "ficam com borda vermelha para sinalizar a relação, mas só um "
        + "carrega a mensagem."
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <Field
          label="Data última consulta"
          value={ultima}
          onChange={setUltima}
          invalid={bothInvalid}
        />
        <Field
          label="Data próxima consulta"
          value={proxima}
          onChange={setProxima}
          invalid={bothInvalid}
          error={errors.dataProximaConsulta}
        />
      </div>
    </VariantShell>
  );
}

// ---------------------------------------------------------------------------
// Variant B — Section-top banner with jump-to-field link
// ---------------------------------------------------------------------------

function VariantBanner() {
  const [ultima, setUltima] = React.useState("15/03/2025");
  const [proxima, setProxima] = React.useState("10/03/2025");
  const errors = useDatePairErrors(ultima, proxima);
  const proximaId = React.useId();
  return (
    <VariantShell
      title="B — Banner no topo (com âncora)"
      body={
        "Um único banner acumula problemas da seção. Cada linha é um link que "
        + "focaliza o campo. Escala para muitas regras cruzadas."
      }
    >
      {errors.dataProximaConsulta && (
        <div
          role="alert"
          className="mb-3 flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <div>
            <div className="font-medium">1 problema na seção</div>
            <a
              href={`#${proximaId}`}
              className="mt-0.5 block underline underline-offset-2 hover:text-amber-950"
            >
              {errors.dataProximaConsulta}
            </a>
          </div>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <Field
          label="Data última consulta"
          value={ultima}
          onChange={setUltima}
        />
        <Field
          id={proximaId}
          label="Data próxima consulta"
          value={proxima}
          onChange={setProxima}
        />
      </div>
    </VariantShell>
  );
}

// ---------------------------------------------------------------------------
// Variant C — Inline pill between the two fields
// ---------------------------------------------------------------------------

function VariantInlinePill() {
  const [ultima, setUltima] = React.useState("15/03/2025");
  const [proxima, setProxima] = React.useState("10/03/2025");
  const errors = useDatePairErrors(ultima, proxima);
  const hasError = Boolean(errors.dataProximaConsulta);
  return (
    <VariantShell
      title="C — Pílula inline entre os campos"
      body={
        "A relação vira parte visível do layout: um chip 'última < próxima' "
        + "muda de cor quando quebra. Espacialmente óbvio, mas custa espaço."
      }
    >
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <Field
            label="Data última"
            value={ultima}
            onChange={setUltima}
          />
        </div>
        <div className="mb-2 flex flex-col items-center">
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-medium tracking-tight",
              hasError
                ? "bg-red-100 text-red-700 ring-1 ring-red-300"
                : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
            )}
          >
            última &lt; próxima
          </span>
        </div>
        <div className="flex-1">
          <Field
            label="Data próxima"
            value={proxima}
            onChange={setProxima}
          />
        </div>
      </div>
      {hasError && (
        <p className="mt-2 text-xs text-red-700">{errors.dataProximaConsulta}</p>
      )}
    </VariantShell>
  );
}

// ---------------------------------------------------------------------------
// Shared field cell + shell
// ---------------------------------------------------------------------------

type FieldProps = {
  label: string;
  value: string;
  onChange: (v: string) => void;
  invalid?: boolean;
  error?: string;
  id?: string;
};

function Field({ label, value, onChange, invalid, error, id }: FieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label
        htmlFor={id}
        className={cn(
          "text-[11px] font-medium uppercase tracking-wide text-muted-foreground",
          error && "text-destructive",
        )}
      >
        {label}
      </Label>
      <Input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="dd/MM/yyyy"
        aria-invalid={invalid || Boolean(error)}
        className={cn(
          (invalid || error) && "border-destructive focus-visible:ring-destructive/40",
        )}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function VariantShell({
  title,
  body,
  children,
}: {
  title: string;
  body: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
      <header className="mb-4">
        <h2 className="text-base font-medium">{title}</h2>
        <p className="mt-1 text-xs text-neutral-600">{body}</p>
      </header>
      {children}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function CrossFieldErrorsPrototype() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <header className="max-w-2xl">
        <h1 className="text-2xl font-medium">Cross-field errors</h1>
        <p className="mt-2 text-sm text-neutral-600">
          Rule under test:{" "}
          <code className="rounded bg-neutral-100 px-1.5 py-0.5 text-xs">
            data.proximaConsulta &gt; data.ultimaConsulta
          </code>
          . Edit the dates to break / fix each variant.
        </p>
      </header>

      <div className="mt-10 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <VariantUnderField />
        <VariantBanner />
        <VariantInlinePill />
      </div>
    </main>
  );
}
