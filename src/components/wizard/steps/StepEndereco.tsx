"use client";

/**
 * StepEndereco — wizard step 2 for new-patient flow.
 *
 * Fields: rua, numero, complemento, bairro (Inputs) + microarea (Select).
 * After the fields, a debounced geocode preview panel:
 *  - On change (500ms debounce) calls POST /api/geocode.
 *  - Success → small react-leaflet MapContainer preview + green badge.
 *  - Failure → amber banner ("Endereço não encontrado. Salvar assim mesmo?").
 *
 * NOTE: Manual pin-drop after 422 geocode failure is deferred to post-save
 * (existing pinningPatient flow in mapStore). This step just saves coords
 * from the geocode result; if geocode fails, patient saves without coords and
 * the ACS can pin-drop later from the map.
 *
 * LGPD: never log street or coord values.
 */

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import dynamic from "next/dynamic";
import { MapPin } from "lucide-react";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field } from "@/components/panels/Field";
import { MICROAREAS_GEOJSON } from "@/config/microareas.data";
import type { WizardStep } from "@/components/wizard/Wizard";
import type { PatientWizardCtx } from "@/components/wizard/PatientWizard";

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
  rua: z.string().optional(),
  numero: z.string().optional(),
  complemento: z.string().optional(),
  bairro: z.string().optional(),
  microarea: z.string().optional(),
});

type EnderecoValues = z.infer<typeof EnderecoSchema>;

// ---------------------------------------------------------------------------
// Geocode result
// ---------------------------------------------------------------------------

type GeoResult =
  | { status: "found"; lat: number; lng: number; display: string }
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
// Component
// ---------------------------------------------------------------------------

type Props = Parameters<WizardStep<PatientWizardCtx>["render"]>[0];

export function StepEndereco({ ctx, setCtx, goNext }: Props) {
  const { register, handleSubmit, watch, setValue, formState: { errors } } =
    useForm<EnderecoValues>({
      resolver: zodResolver(EnderecoSchema),
      defaultValues: {
        rua: ctx.rua,
        numero: ctx.numero,
        complemento: ctx.complemento,
        bairro: ctx.bairro,
        microarea: ctx.microarea,
      },
    });

  const [geoResult, setGeoResult] = useState<GeoResult>(
    ctx.geocodedCoords
      ? { status: "found", lat: ctx.geocodedCoords.lat, lng: ctx.geocodedCoords.lng, display: ctx.rua }
      : { status: "idle" },
  );

  // Debounce geocode lookup on address change.
  // Using `undefined` (not null) so clearTimeout receives an acceptable type.
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const rua = watch("rua");
  const numero = watch("numero");
  const bairro = watch("bairro");

  useEffect(() => {
    if (!rua || rua.trim().length < 4) {
      setGeoResult({ status: "idle" });
      return;
    }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void fetchGeocode(rua, numero ?? "", bairro ?? "").then(setGeoResult);
    }, 500);
    return () => {
      clearTimeout(debounceRef.current);
    };
  }, [rua, numero, bairro]);

  const onSubmit = handleSubmit((values) => {
    setCtx({
      rua: values.rua ?? "",
      numero: values.numero ?? "",
      complemento: values.complemento ?? "",
      bairro: values.bairro ?? "",
      microarea: values.microarea ?? "",
      geocodedCoords:
        geoResult.status === "found"
          ? { lat: geoResult.lat, lng: geoResult.lng }
          : null,
    });
    goNext();
  });

  return (
    <form id="wizard-step-form" onSubmit={onSubmit} className="space-y-4">
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
            value={watch("microarea") ?? ""}
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
      </div>

      {/* Geocode preview */}
      {geoResult.status === "found" && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-medium text-ok-green">
            <MapPin className="size-3.5" />
            Endereço encontrado
          </div>
          <GeocodeMapPreview lat={geoResult.lat} lng={geoResult.lng} />
        </div>
      )}

      {geoResult.status === "not_found" && (
        <div className="rounded-lg border border-alert-amber/40 bg-alert-amber/10 p-3 text-xs text-amber-900">
          <p className="font-medium">Não foi possível encontrar este endereço.</p>
          <p className="mt-0.5 text-amber-700">
            Salvar assim mesmo? Você poderá posicionar o pino no mapa depois.
            {/* NOTE: pin-drop is deferred to post-save via the pinningPatient flow
                in mapStore. Advance without coords; a map-level affordance lets
                the ACS drag the pin to the correct location. */}
          </p>
        </div>
      )}
    </form>
  );
}
