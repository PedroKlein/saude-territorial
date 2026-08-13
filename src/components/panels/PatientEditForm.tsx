"use client";

import { useState, type FormEvent } from "react";

import { LAYER_CONFIG, type LayerId } from "@/config/layers.config";
import {
  useUpdatePatient,
  type UpdatePatientError,
} from "@/hooks/useUpdatePatient";
import { useMapStore } from "@/stores/mapStore";
import type { PatientPatch } from "@/lib/patients/schemas";
import type { PatientRecord } from "@/hooks/usePatientData";
import { LAYER_FIELDS, EDITABLE_LAYERS } from "@/components/panels/layerFields";

/**
 * `PatientEditForm` — layer-aware inline edit form for a single patient.
 *
 * The form is inline (renders inside `PatientDetailPanel`) rather than a
 * modal because the panel is already a slide-over; nesting modals fights the
 * mobile drawer layout.
 *
 * Fields:
 *  - Shared: nomeCompleto, telefone, address (rua/numero/complemento/bairro).
 *  - Layer-specific: sourced per the schema for that layer. Values shown
 *    are the current record's flat fields (formatted `dd/MM/yyyy` for dates
 *    by the API layer); on save, dates are round-tripped as-is — the API's
 *    Zod schema accepts either format.
 *
 * Save path:
 *  - Constructs a structured PATCH body from the form's diff against the
 *    original record. Only fields the user touched land in the body.
 *  - On address change, the API blocks on geocoding. On 422 with
 *    `requiresManualPin: true`, this form fires `setPinningPatient` so the
 *    user can drop a pin on the map instead.
 *
 * See `plans/pivot-execution.md#pe-5` (T5.4).
 */

interface PatientEditFormProps {
  patientId: string;
  cns: string;
  nomeCompleto: string | null;
  layer: LayerId;
  record: Record<string, unknown>;
  onDone: () => void;
}

// Which fields we render per layer and which layers support editing are
// imported from the shared module so PatientCreateForm stays consistent.

const SHARED_FIELDS: ReadonlyArray<{ key: string; label: string; type: "text" }> = [
  { key: "nomeCompleto", label: "Nome completo", type: "text" },
  { key: "telefone", label: "Telefone", type: "text" },
  { key: "rua", label: "Rua", type: "text" },
  { key: "numero", label: "Número (ou s/n)", type: "text" },
  { key: "complemento", label: "Complemento", type: "text" },
  { key: "bairro", label: "Bairro", type: "text" },
];

/** Read a form value for a key; missing = empty string. */
function initial(record: Record<string, unknown>, key: string): string {
  const v = record[key];
  if (v == null) return "";
  return String(v);
}

export function PatientEditForm({
  patientId,
  cns,
  nomeCompleto,
  layer,
  record,
  onDone,
}: PatientEditFormProps) {
  const setPinningPatient = useMapStore((s) => s.setPinningPatient);
  const update = useUpdatePatient();

  // Build initial state from the current record for both shared + layer fields.
  const layerFields = layer in EDITABLE_LAYERS
    ? LAYER_FIELDS[layer as keyof typeof LAYER_FIELDS]
    : [];

  const [values, setValues] = useState<Record<string, string>>(() => {
    const seed: Record<string, string> = {};
    for (const f of SHARED_FIELDS) seed[f.key] = initial(record, f.key);
    for (const f of layerFields) seed[f.key] = initial(record, f.key);
    return seed;
  });

  const [manualPinPrompt, setManualPinPrompt] = useState<string | null>(null);

  const set = (k: string, v: string) => setValues((s) => ({ ...s, [k]: v }));

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setManualPinPrompt(null);

    // Compute deltas — only send what changed.
    const base: Record<string, string | number | null> = {};
    for (const f of SHARED_FIELDS) {
      const before = initial(record, f.key);
      const after = values[f.key] ?? "";
      if (before === after) continue;
      base[f.key] = after === "" ? null : after;
    }

    const ext: Record<string, string | number | boolean | null> = {};
    for (const f of layerFields) {
      const before = initial(record, f.key);
      const after = values[f.key] ?? "";
      if (before === after) continue;
      if (f.type === "number") {
        ext[f.key] = after === "" ? null : Number(after);
      } else {
        ext[f.key] = after === "" ? null : after;
      }
    }

    const body: PatientPatch = {};
    if (Object.keys(base).length > 0) {
      body.base = base as PatientPatch["base"];
    }
    if (Object.keys(ext).length > 0) {
      if (layer === "gestantes") body.gestantes = ext as PatientPatch["gestantes"];
      else if (layer === "tuberculose") body.tuberculose = ext as PatientPatch["tuberculose"];
      else if (layer === "hipertensao") body.hipertensao = ext as PatientPatch["hipertensao"];
    }

    if (!body.base && !body.gestantes && !body.tuberculose && !body.hipertensao) {
      // Nothing changed; close silently.
      onDone();
      return;
    }

    // Optimistically reflect the diff in the visible record so the panel
    // shows the new values right away.
    const optimistic: Partial<PatientRecord> = { ...base, ...ext } as Partial<PatientRecord>;

    update.mutate(
      { id: patientId, body, optimisticPatch: optimistic },
      {
        onSuccess: () => {
          onDone();
        },
        onError: (err: UpdatePatientError) => {
          if (err.status === 422 && err.body?.requiresManualPin) {
            setManualPinPrompt(
              err.body.error ??
                "Endereço não encontrado. Arraste o pin para posicionar.",
            );
          }
          // 4xx validation etc. → error banner rendered below.
        },
      },
    );
  };

  const startManualPin = () => {
    setPinningPatient({ id: patientId, cns, nomeCompleto });
    onDone();
  };

  return (
    <form onSubmit={onSubmit} className="mt-2 space-y-4">
      <Section title="Identificação e endereço">
        {SHARED_FIELDS.map((f) => (
          <Field key={f.key} label={f.label}>
            <input
              type="text"
              value={values[f.key] ?? ""}
              onChange={(e) => set(f.key, e.target.value)}
              className="w-full rounded border px-2 py-1 text-sm"
            />
          </Field>
        ))}
      </Section>

      {layerFields.length > 0 && (
        <Section title={`Camada: ${LAYER_CONFIG[layer].label}`}>
          {layerFields.map((f) => {
            const value = values[f.key] ?? "";
            if (f.type === "select" && f.options) {
              return (
                <Field key={f.key} label={f.label}>
                  <select
                    value={value}
                    onChange={(e) => set(f.key, e.target.value)}
                    className="w-full rounded border px-2 py-1 text-sm"
                  >
                    <option value="">—</option>
                    {f.options.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                </Field>
              );
            }
            return (
              <Field key={f.key} label={f.label}>
                <input
                  type={f.type === "number" ? "number" : "text"}
                  placeholder={f.type === "date" ? "dd/mm/aaaa" : ""}
                  value={value}
                  onChange={(e) => set(f.key, e.target.value)}
                  className="w-full rounded border px-2 py-1 text-sm"
                />
              </Field>
            );
          })}
        </Section>
      )}

      {manualPinPrompt && (
        <div className="rounded border border-yellow-300 bg-yellow-50 p-2 text-xs text-yellow-900">
          {manualPinPrompt}
          <button
            type="button"
            onClick={startManualPin}
            className="ml-2 rounded bg-yellow-200 px-2 py-0.5 text-xs font-medium hover:bg-yellow-300"
          >
            Posicionar pin no mapa
          </button>
        </div>
      )}

      {update.isError && !manualPinPrompt && (
        <p className="text-xs text-red-700">
          {update.error?.body?.error ?? "Erro ao salvar. Tente novamente."}
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={update.isPending}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:bg-gray-400"
        >
          {update.isPending ? "Salvando..." : "Salvar"}
        </button>
        <button
          type="button"
          onClick={onDone}
          disabled={update.isPending}
          className="rounded-md border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Presentation helpers
// ---------------------------------------------------------------------------

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-xs font-semibold uppercase text-muted-foreground">
        {title}
      </h3>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
