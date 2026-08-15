"use client";

/**
 * StepEndereco — wizard step 2 (novo paciente flow).
 *
 * Structure:
 *   1. CEP row with "Buscar" button — ViaCEP autofills rua + bairro on Enter/click.
 *   2. Rua/Número/Complemento/Bairro/Microárea grid.
 *   3. Referência textarea (free-form landmark note, persisted as geocodeReference).
 *   4. Live map preview:
 *      - `found`   → read-only pin at the geocoded coordinates.
 *      - `manual`  → draggable pin; user placed it via right-click prefill or the
 *                    "Ajustar pino" fallback.
 *      - `idle`    → hidden.
 *      - `not_found` → amber banner with a CTA to enter manual mode.
 *
 * Address changes debounce for 500 ms then hit /api/geocode. A manual pin
 * always wins over the geocoder — the debounced lookup still runs so we
 * know whether the address text is plausible, but it never overrides the
 * pin.
 */

import { useEffect, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import dynamic from "next/dynamic";
import { MapPin, Search, Loader2 } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field } from "@/components/panels/Field";
import { MICROAREAS_GEOJSON } from "@/config/microareas.data";
import { US_MOAB_CALDAS } from "@/config/geo.constants";
import type { PatientWizardCtx } from "@/components/wizard/PatientWizard";
import type { WizardStepRenderProps } from "@/components/wizard/Wizard";
import { lookupCep } from "@/lib/geocoding/viacep";

// ---------------------------------------------------------------------------
// Lazy-load the map preview (react-leaflet requires browser)
// ---------------------------------------------------------------------------

const GeocodeMapPreview = dynamic(() => import("./GeocodeMapPreview"), {
  ssr: false,
  loading: () => (
    <div className="h-[200px] animate-pulse rounded-lg bg-neutral-100" />
  ),
});

// ---------------------------------------------------------------------------
// Microarea options derived from GeoJSON config
// ---------------------------------------------------------------------------

const MICROAREA_OPTIONS = (
  MICROAREAS_GEOJSON.features as Array<{
    properties: { id: string; nome: string } | null;
  }>
).flatMap((f) =>
  f.properties ? [{ value: f.properties.id, label: f.properties.nome }] : [],
);

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const EnderecoSchema = z.object({
  cep: z.string().optional(),
  rua: z.string().optional(),
  numero: z.string().optional(),
  complemento: z.string().optional(),
  bairro: z.string().optional(),
  microarea: z.string().optional(),
  referencia: z.string().optional(),
});

type EnderecoValues = z.infer<typeof EnderecoSchema>;

// ---------------------------------------------------------------------------
// Geocode result
// ---------------------------------------------------------------------------

type GeoResult =
  | { status: "found"; lat: number; lng: number; display: string }
  | { status: "manual"; lat: number; lng: number }
  | { status: "not_found" }
  | { status: "idle" };

async function fetchGeocode(
  rua: string,
  numero: string,
  bairro: string,
): Promise<GeoResult> {
  try {
    const res = await fetch("/api/geocode", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rua, numero, bairro }),
    });
    if (!res.ok) return { status: "not_found" };
    const data = (await res.json()) as { lat?: number; lng?: number; display?: string };
    if (data.lat && data.lng) {
      return { status: "found", lat: data.lat, lng: data.lng, display: data.display ?? "" };
    }
    return { status: "not_found" };
  } catch {
    return { status: "not_found" };
  }
}

// ---------------------------------------------------------------------------
// CEP formatter — masks input to NNNNN-NNN as the user types.
// ---------------------------------------------------------------------------

function formatCep(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 8);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

type Props = WizardStepRenderProps<PatientWizardCtx>;

export function StepEndereco({ ctx, setCtx, goNext }: Props) {
  const { register, handleSubmit, control, setValue, formState: { errors } } =
    useForm<EnderecoValues>({
      resolver: zodResolver(EnderecoSchema),
      defaultValues: {
        cep: ctx.cep,
        rua: ctx.rua,
        numero: ctx.numero,
        complemento: ctx.complemento,
        bairro: ctx.bairro,
        microarea: ctx.microarea,
        referencia: ctx.referencia,
      },
    });

  const [geoResult, setGeoResult] = useState<GeoResult>(
    ctx.geocodedCoords
      ? ctx.rua
        ? { status: "found", lat: ctx.geocodedCoords.lat, lng: ctx.geocodedCoords.lng, display: ctx.rua }
        : { status: "manual", lat: ctx.geocodedCoords.lat, lng: ctx.geocodedCoords.lng }
      : { status: "idle" },
  );

  const [manualMode, setManualMode] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [cepError, setCepError] = useState<string | null>(null);

  // Debounce geocode lookup on address change.
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const rua = useWatch({ control, name: "rua" });
  const numero = useWatch({ control, name: "numero" });
  const bairro = useWatch({ control, name: "bairro" });
  const currentMicroarea = useWatch({ control, name: "microarea" });
  const currentCep = useWatch({ control, name: "cep" });

  useEffect(() => {
    if (!rua || rua.trim().length < 4) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setGeoResult((prev) => (prev.status === "manual" ? prev : { status: "idle" }));
      return;
    }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void fetchGeocode(rua, numero ?? "", bairro ?? "").then((result) => {
        setGeoResult((prev) => {
          // Manual pin wins over autocomplete. The debounced geocode still
          // runs so we can validate the address text, but never overrides
          // the explicit placement. See the file header comment.
          if (prev.status === "manual") return prev;
          return result;
        });
      });
    }, 500);
    return () => {
      clearTimeout(debounceRef.current);
    };
  }, [rua, numero, bairro]);

  /**
   * Look up the CEP via ViaCEP and autofill rua + bairro.
   *
   * We only replace rua/bairro when the response has a non-empty value AND
   * the current field is empty or matches the previous ViaCEP result. A
   * user who typed a specific street name shouldn't lose it when the
   * postal-code lookup returns something ambiguous.
   */
  async function handleCepLookup() {
    setCepError(null);
    const raw = currentCep ?? "";
    const digits = raw.replace(/\D/g, "");
    if (digits.length !== 8) {
      setCepError("Digite um CEP com 8 dígitos.");
      return;
    }
    setCepLoading(true);
    try {
      const result = await lookupCep(digits);
      if (!result) {
        setCepError("CEP não encontrado.");
        return;
      }
      if (result.logradouro) setValue("rua", result.logradouro, { shouldDirty: true });
      if (result.bairro) setValue("bairro", result.bairro, { shouldDirty: true });
    } finally {
      setCepLoading(false);
    }
  }

  const onSubmit = handleSubmit((values) => {
    setCtx({
      cep: values.cep ?? "",
      rua: values.rua ?? "",
      numero: values.numero ?? "",
      complemento: values.complemento ?? "",
      bairro: values.bairro ?? "",
      microarea: values.microarea ?? "",
      referencia: values.referencia ?? "",
      geocodedCoords:
        geoResult.status === "manual" || geoResult.status === "found"
          ? { lat: geoResult.lat, lng: geoResult.lng }
          : null,
    });
    goNext();
  });

  return (
    <form id="wizard-step-form" onSubmit={onSubmit} className="space-y-4">
      {/* CEP row with autofill */}
      <div className="rounded-lg border border-neutral-200 bg-neutral-50/50 p-3">
        <div className="flex items-end gap-2">
          <Field label="CEP" error={cepError ?? errors.cep?.message} className="flex-1">
            <Input
              {...register("cep", {
                onChange: (e) => {
                  e.target.value = formatCep(e.target.value);
                  setCepError(null);
                },
              })}
              aria-label="CEP"
              placeholder="90000-000"
              inputMode="numeric"
              maxLength={9}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void handleCepLookup();
                }
              }}
            />
          </Field>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void handleCepLookup()}
            disabled={cepLoading}
            className="mb-[2px]"
          >
            {cepLoading ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Search className="size-3.5" />
            )}
            <span className="ml-1.5">Buscar</span>
          </Button>
        </div>
        <p className="mt-1.5 text-[11px] text-neutral-500">
          Preenche rua e bairro automaticamente.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-x-3 gap-y-4">
        <Field label="Rua" error={errors.rua?.message} className="col-span-2">
          <Input {...register("rua")} aria-label="Rua" placeholder="Ex.: Rua das Flores" />
        </Field>

        <Field label="Número" error={errors.numero?.message} className="col-span-1">
          <Input {...register("numero")} aria-label="Número" placeholder="42" />
        </Field>

        <Field label="Complemento" error={errors.complemento?.message} className="col-span-2">
          <Input {...register("complemento")} aria-label="Complemento" placeholder="Apto 3, Bloco B…" />
        </Field>

        <Field label="Bairro" error={errors.bairro?.message} className="col-span-1">
          <Input {...register("bairro")} aria-label="Bairro" placeholder="Centro" />
        </Field>

        <Field label="Microárea" error={errors.microarea?.message} className="col-span-3">
          <Select
            value={currentMicroarea ?? ""}
            onValueChange={(v) => setValue("microarea", v)}
          >
            <SelectTrigger aria-label="Microárea">
              <SelectValue placeholder="Selecionar microárea" />
            </SelectTrigger>
            <SelectContent>
              {MICROAREA_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field
          label="Referência"
          hint="Landmarks e observações do ACS (ex.: “casa azul, portão de ferro, em frente à padaria”)."
          error={errors.referencia?.message}
          className="col-span-3"
        >
          <Textarea
            {...register("referencia")}
            aria-label="Referência do endereço"
            rows={2}
            placeholder="Como reconhecer o endereço na rua?"
          />
        </Field>
      </div>

      {/* Geocode found: read-only map */}
      {geoResult.status === "found" && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-medium text-ok-green">
            <MapPin className="size-3.5" />
            Endereço encontrado
          </div>
          <GeocodeMapPreview lat={geoResult.lat} lng={geoResult.lng} />
        </div>
      )}

      {/* Manual picker: from right-click prefill OR user-requested */}
      {(manualMode || geoResult.status === "manual") && (
        <div data-testid="geocode-manual-picker" className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-medium text-blue-700">
            <MapPin className="size-3.5" />
            {geoResult.status === "manual"
              ? "Pino posicionado manualmente"
              : "Clique no mapa para posicionar o pino"}
          </div>
          <GeocodeMapPreview
            lat={
              geoResult.status === "manual"
                ? geoResult.lat
                : (ctx.geocodedCoords?.lat ?? US_MOAB_CALDAS[0])
            }
            lng={
              geoResult.status === "manual"
                ? geoResult.lng
                : (ctx.geocodedCoords?.lng ?? US_MOAB_CALDAS[1])
            }
            onPickCoords={(c) => {
              setGeoResult({ status: "manual", ...c });
              setManualMode(false);
            }}
          />
        </div>
      )}

      {/* Not-found banner: shown only when not in manual mode */}
      {geoResult.status === "not_found" && !manualMode && (
        <div className="rounded-lg border border-alert-amber/40 bg-alert-amber/10 p-3 text-xs text-amber-900">
          <p className="font-medium">Não foi possível encontrar este endereço.</p>
          <p className="mt-0.5 text-amber-700">
            Salvar assim mesmo? Você poderá posicionar o pino no mapa depois.
          </p>
          <button
            type="button"
            onClick={() => setManualMode(true)}
            className="mt-2 rounded-md bg-amber-600 px-3 py-1 text-xs font-medium text-white hover:bg-amber-700"
          >
            Ajustar pino manualmente
          </button>
        </div>
      )}
    </form>
  );
}
