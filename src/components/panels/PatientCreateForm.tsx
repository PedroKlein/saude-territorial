"use client";

/**
 * `PatientCreateForm` — modal overlay for creating a new patient with one
 * condition extension.
 *
 * Handles:
 *  - 201 success: closes the form; hook opens the detail panel.
 *  - 409 cns_exists: opens `CnsCollisionDialog`.
 *  - 422 requiresManualPin: shows inline banner + "Posicionar pin no mapa"
 *    button that enters pin-drop mode (draft stashed in `createFormStore`).
 *  - 400 issues[]: field-level error banner.
 *
 * LGPD: no patient identifiers are passed to console.* anywhere here.
 */

import { useState, useRef, type FormEvent, type ChangeEvent } from "react";
import { LAYER_CONFIG } from "@/config/layers.config";
import { LAYER_FIELDS } from "@/components/panels/layerFields";
import { useCreatePatient } from "@/hooks/useCreatePatient";
import { useCreateFormStore, type CreateDraft } from "@/stores/createFormStore";
import { CnsCollisionDialog } from "@/components/panels/CnsCollisionDialog";
import type { ConditionAttach } from "@/lib/patients/schemas";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Condicao = "gestantes" | "tuberculose" | "hipertensao";

interface CollisionPayload {
  id: string;
  cns: string;
  nomeCompleto: string | null;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CONDICAO_OPTIONS: ReadonlyArray<{ value: Condicao; label: string }> = [
  { value: "gestantes", label: "Gestantes" },
  { value: "tuberculose", label: "Tuberculose" },
  { value: "hipertensao", label: "Hipertensão" },
];

/** Shared identity + address fields rendered above the layer section. */
const COMMON_FIELDS: ReadonlyArray<{
  key: string;
  label: string;
  required?: boolean;
}> = [
  { key: "nomeCompleto", label: "Nome completo", required: true },
  { key: "dataNascimento", label: "Data de nascimento (dd/mm/aaaa)" },
  { key: "telefone", label: "Telefone" },
  { key: "rua", label: "Rua" },
  { key: "numero", label: "Número" },
  { key: "complemento", label: "Complemento" },
  { key: "bairro", label: "Bairro" },
  { key: "microarea", label: "Microárea" },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PatientCreateForm() {
  const { isOpen, prefilledCoords, draft, close, enterPinDropMode } =
    useCreateFormStore();

  const create = useCreatePatient();
  const cnsRef = useRef<HTMLInputElement>(null);

  const [condicao, setCondicao] = useState<Condicao>(
    (draft?.condicao as Condicao | undefined) ?? "gestantes",
  );
  const [cns, setCns] = useState(draft?.cns ?? "");
  const [baseValues, setBaseValues] = useState<Record<string, string>>(() => {
    const seed: Record<string, string> = {};
    for (const f of COMMON_FIELDS) {
      const draftVal = (draft?.base as Record<string, unknown> | undefined)?.[f.key];
      seed[f.key] = draftVal != null ? String(draftVal) : "";
    }
    // Pre-fill coords from right-click or pin-drop resume.
    if (prefilledCoords) {
      seed.__lat = String(prefilledCoords.lat);
      seed.__lng = String(prefilledCoords.lng);
    }
    return seed;
  });
  const [extValues, setExtValues] = useState<Record<string, string>>(() => {
    const source =
      draft?.condicao === condicao
        ? ((draft as unknown as Record<string, unknown>)[condicao] as
            | Record<string, unknown>
            | undefined)
        : undefined;
    const seed: Record<string, string> = {};
    for (const f of LAYER_FIELDS[condicao] ?? []) {
      const v = source?.[f.key];
      seed[f.key] = v != null ? String(v) : "";
    }
    return seed;
  });

  const [collision, setCollision] = useState<CollisionPayload | null>(null);
  const [manualPinBanner, setManualPinBanner] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<string | null>(null);

  // ---- helpers -----------------------------------------------------------

  const setBase = (k: string, v: string) =>
    setBaseValues((s) => ({ ...s, [k]: v }));

  const setExt = (k: string, v: string) =>
    setExtValues((s) => ({ ...s, [k]: v }));

  const switchCondicao = (next: Condicao) => {
    setCondicao(next);
    // Reset layer-specific fields when switching conditions.
    const seed: Record<string, string> = {};
    for (const f of LAYER_FIELDS[next] ?? []) seed[f.key] = "";
    setExtValues(seed);
  };

  const buildExtBody = (): Record<string, string | number | null> => {
    const ext: Record<string, string | number | null> = {};
    for (const f of LAYER_FIELDS[condicao] ?? []) {
      const v = extValues[f.key] ?? "";
      if (v === "") continue;
      ext[f.key] = f.type === "number" ? Number(v) : v;
    }
    return ext;
  };

  // ---- submit ------------------------------------------------------------

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setManualPinBanner(false);
    setFieldErrors(null);

    const body = {
      cns: cns.replace(/\s/g, ""),
      base: {
        nomeCompleto: baseValues.nomeCompleto ?? "",
        ...(baseValues.dataNascimento
          ? { dataNascimento: baseValues.dataNascimento }
          : {}),
        ...(baseValues.telefone ? { telefone: baseValues.telefone } : {}),
        ...(baseValues.rua ? { rua: baseValues.rua } : {}),
        ...(baseValues.numero ? { numero: baseValues.numero } : {}),
        ...(baseValues.complemento
          ? { complemento: baseValues.complemento }
          : {}),
        ...(baseValues.bairro ? { bairro: baseValues.bairro } : {}),
        ...(baseValues.microarea ? { microarea: baseValues.microarea } : {}),
        // Coords from right-click or pin-drop
        ...(prefilledCoords
          ? { lat: prefilledCoords.lat, lng: prefilledCoords.lng }
          : {}),
      },
      condicao,
      [condicao]: buildExtBody(),
    };

    create.mutate(
      { body: body as Parameters<typeof create.mutate>[0]["body"], cns: body.cns },
      {
        onSuccess: () => close(),
        onError: (err) => {
          if (err.status === 409 && err.body?.error === "cns_exists") {
            const p = err.body.patient as Record<string, unknown> | undefined;
            if (p) {
              setCollision({
                id: String(p.id ?? ""),
                cns: String(p.cns ?? ""),
                nomeCompleto:
                  p.nomeCompleto != null ? String(p.nomeCompleto) : null,
              });
            }
            return;
          }
          if (err.status === 422 && err.body?.requiresManualPin) {
            setManualPinBanner(true);
            return;
          }
          if (err.status === 400 && err.body?.issues) {
            setFieldErrors("Verifique os campos e tente novamente.");
            return;
          }
        },
      },
    );
  };

  // ---- pin-drop path -----------------------------------------------------

  const handleEnterPinDrop = () => {
    const currentDraft: CreateDraft = {
      cns: cns.replace(/\s/g, ""),
      condicao,
      base: { ...baseValues },
      [condicao]: buildExtBody(),
    };
    enterPinDropMode(currentDraft);
  };

  // ---- render ------------------------------------------------------------

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9000] flex items-start justify-end overflow-y-auto bg-black/40"
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="relative flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b px-5 py-4">
          <h2 className="text-base font-semibold text-gray-900">
            Adicionar paciente
          </h2>
          <button
            type="button"
            onClick={close}
            className="rounded p-1 text-gray-500 hover:bg-gray-100"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>

        {/* Scrollable body */}
        <form
          onSubmit={onSubmit}
          className="flex-1 space-y-5 overflow-y-auto px-5 py-4"
        >
          {/* Condition selector */}
          <fieldset>
            <legend className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
              Condição
            </legend>
            <div className="flex gap-3">
              {CONDICAO_OPTIONS.map(({ value, label }) => (
                <label key={value} className="flex cursor-pointer items-center gap-1.5 text-sm">
                  <input
                    type="radio"
                    name="condicao"
                    value={value}
                    checked={condicao === value}
                    onChange={() => switchCondicao(value)}
                    className="accent-blue-600"
                  />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>

          {/* CNS */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">
              CNS <span className="text-red-500">*</span>
            </label>
            <input
              ref={cnsRef}
              type="text"
              inputMode="numeric"
              maxLength={15}
              value={cns}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setCns(e.target.value.replace(/\D/g, ""))
              }
              placeholder="000 0000 0000 000"
              required
              className="w-full rounded border px-2 py-1.5 text-sm font-mono"
            />
          </div>

          {/* Common fields */}
          <section>
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
              Identificação e endereço
            </h3>
            <div className="space-y-3">
              {COMMON_FIELDS.map((f) => (
                <div key={f.key}>
                  <label className="mb-1 block text-xs font-medium text-gray-700">
                    {f.label}
                    {f.required && (
                      <span className="ml-0.5 text-red-500">*</span>
                    )}
                  </label>
                  <input
                    type="text"
                    value={baseValues[f.key] ?? ""}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      setBase(f.key, e.target.value)
                    }
                    required={f.required}
                    className="w-full rounded border px-2 py-1 text-sm"
                  />
                </div>
              ))}
            </div>
          </section>

          {/* Layer-specific fields */}
          <section>
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
              {LAYER_CONFIG[condicao].label}
            </h3>
            <div className="space-y-3">
              {(LAYER_FIELDS[condicao] ?? []).map((f) => {
                const value = extValues[f.key] ?? "";
                if (f.type === "select" && f.options) {
                  return (
                    <div key={f.key}>
                      <label className="mb-1 block text-xs font-medium text-gray-700">
                        {f.label}
                      </label>
                      <select
                        value={value}
                        onChange={(e) => setExt(f.key, e.target.value)}
                        className="w-full rounded border px-2 py-1 text-sm"
                      >
                        <option value="">—</option>
                        {f.options.map((o) => (
                          <option key={o} value={o}>
                            {o}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                }
                return (
                  <div key={f.key}>
                    <label className="mb-1 block text-xs font-medium text-gray-700">
                      {f.label}
                    </label>
                    <input
                      type={f.type === "number" ? "number" : "text"}
                      placeholder={f.type === "date" ? "dd/mm/aaaa" : ""}
                      value={value}
                      onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        setExt(f.key, e.target.value)
                      }
                      className="w-full rounded border px-2 py-1 text-sm"
                    />
                  </div>
                );
              })}
            </div>
          </section>

          {/* 422 — manual pin banner */}
          {manualPinBanner && (
            <div className="rounded border border-yellow-300 bg-yellow-50 p-3 text-xs text-yellow-900">
              Endereço não encontrado. Posicione o paciente manualmente no mapa.
              <button
                type="button"
                onClick={handleEnterPinDrop}
                className="ml-2 rounded bg-yellow-200 px-2 py-0.5 text-xs font-medium hover:bg-yellow-300"
              >
                Posicionar pin no mapa
              </button>
            </div>
          )}

          {/* Generic error */}
          {create.isError && !manualPinBanner && !collision && (
            <p className="text-xs text-red-700">
              {fieldErrors ??
                create.error?.body?.error ??
                "Erro ao criar. Tente novamente."}
            </p>
          )}

          {/* Footer */}
          <div className="flex gap-2 pb-4 pt-2">
            <button
              type="submit"
              disabled={create.isPending}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:bg-gray-400"
            >
              {create.isPending ? "Criando..." : "Criar paciente"}
            </button>
            <button
              type="button"
              onClick={close}
              disabled={create.isPending}
              className="rounded-md border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>

      {/* 409 collision dialog — rendered on top */}
      {collision && (
        <CnsCollisionDialog
          existing={collision}
          condicao={condicao}
          extensionData={buildExtBody() as ConditionAttach["data"]}
          onSuccess={() => {
            setCollision(null);
            close();
          }}
          onCancel={() => {
            setCollision(null);
            setTimeout(() => cnsRef.current?.focus(), 50);
          }}
        />
      )}
    </div>
  );
}
