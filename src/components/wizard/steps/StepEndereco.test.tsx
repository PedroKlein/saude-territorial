/**
 * StepEndereco — unit tests for hydrated-coords guard (#6).
 *
 * Key invariant: if `ctx.geocodedCoords` is present at mount, the step
 * initialises as `manual` and the debounced geocode effect CANNOT override
 * the saved coordinates.
 *
 * LGPD: all addresses and coordinates are fictitious.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import "@testing-library/jest-dom";

// ---------------------------------------------------------------------------
// Module mocks — must be hoisted before imports
// ---------------------------------------------------------------------------

// Replace next/dynamic so the lazy GeocodeMapPreview renders synchronously
// and exposes its lat/lng props for assertion.
vi.mock("next/dynamic", () => ({
  default: (_importFn: unknown) => {
    return function MockMapPreview({
      lat,
      lng,
    }: {
      lat?: number;
      lng?: number;
      onPickCoords?: (c: { lat: number; lng: number }) => void;
    }) {
      return (
        <div
          data-testid="map-preview"
          data-lat={String(lat)}
          data-lng={String(lng)}
        />
      );
    };
  },
}));

vi.mock("@/config/microareas.data", () => ({
  MICROAREAS_GEOJSON: { features: [] },
}));

vi.mock("@/config/geo.constants", () => ({
  US_MOAB_CALDAS: [-30.0, -51.0],
}));

vi.mock("@/lib/geocoding/viacep", () => ({
  lookupCep: vi.fn().mockResolvedValue(null),
}));

// ---------------------------------------------------------------------------
// Import component under test (after mocks)
// ---------------------------------------------------------------------------

import { StepEndereco } from "./StepEndereco";
import type { PatientWizardCtx } from "@/components/wizard/PatientWizard";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const BASE_CTX: PatientWizardCtx = {
  cns: "",
  nomeCompleto: "",
  dataNascimento: "",
  telefone: "",
  vulnerabilidades: "",
  cep: "",
  rua: "",
  numero: "",
  complemento: "",
  bairro: "",
  microarea: "",
  geocodedCoords: null,
  referencia: "",
  chosenConditions: [],
  originalConditions: [],
  toRemove: [],
  gestantes: {},
  tuberculose: {},
  hipertensao: {},
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("StepEndereco — hydrated coords guard", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Mock fetch so the geocode POST returns a *different* lat/lng — the guard
    // must prevent this from overwriting the initial hydrated coords.
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            lat: -30.1,
            lng: -51.3,
            display: "Endereço Geocodificado",
          }),
      }),
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("shows 'Localização salva' banner when ctx has hydrated geocodedCoords", async () => {
    const ctx: PatientWizardCtx = {
      ...BASE_CTX,
      rua: "Rua das Flores",
      numero: "42",
      bairro: "Jardim",
      geocodedCoords: { lat: -30.05, lng: -51.2 },
    };

    render(
      <StepEndereco
        ctx={ctx}
        setCtx={vi.fn()}
        goNext={vi.fn()}
        goBack={vi.fn()}
      />,
    );

    // Banner must appear immediately (not after debounce).
    expect(screen.getByText(/Localização salva/i)).toBeInTheDocument();
  });

  it("debounce does NOT overwrite hydrated coords after 500 ms", async () => {
    const ctx: PatientWizardCtx = {
      ...BASE_CTX,
      rua: "Rua das Flores",
      numero: "42",
      bairro: "Jardim",
      geocodedCoords: { lat: -30.05, lng: -51.2 },
    };

    render(
      <StepEndereco
        ctx={ctx}
        setCtx={vi.fn()}
        goNext={vi.fn()}
        goBack={vi.fn()}
      />,
    );

    // Advance past the 500 ms debounce and flush any pending microtasks.
    await act(async () => {
      vi.advanceTimersByTime(600);
      // Drain promise queue so the fetch mock can resolve.
      await Promise.resolve();
      await Promise.resolve();
    });

    // GeocodeMapPreview must still show the original hydrated lat/lng.
    const mapPreview = screen.getByTestId("map-preview");
    expect(mapPreview).toHaveAttribute("data-lat", "-30.05");
    expect(mapPreview).toHaveAttribute("data-lng", "-51.2");

    // Banner remains "Localização salva", NOT "Pino posicionado manualmente".
    expect(screen.getByText(/Localização salva/i)).toBeInTheDocument();
    expect(screen.queryByText(/Pino posicionado manualmente/i)).toBeNull();
  });

  it("shows idle state (no map preview) when ctx has no geocodedCoords", () => {
    render(
      <StepEndereco
        ctx={BASE_CTX}
        setCtx={vi.fn()}
        goNext={vi.fn()}
        goBack={vi.fn()}
      />,
    );

    expect(screen.queryByTestId("map-preview")).toBeNull();
    expect(screen.queryByText(/Localização salva/i)).toBeNull();
  });
});
