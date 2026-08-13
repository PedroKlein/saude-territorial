/**
 * Tests for useCreatePatient and useAttachCondition hooks.
 *
 * Covers: 201 success invalidates cache; error propagates structured.
 *
 * LGPD: all patient values are synthetic / fictitious.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { useCreatePatient, useAttachCondition } from "./useCreatePatient";
import { patientKeys } from "./usePatientData";

// ---------------------------------------------------------------------------
// Mock fetch + mapStore
// ---------------------------------------------------------------------------

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

const setSelectedPatientMock = vi.fn();
vi.mock("@/stores/mapStore", () => ({
  useMapStore: (sel: (s: { setSelectedPatient: typeof setSelectedPatientMock }) => unknown) =>
    sel({ setSelectedPatient: setSelectedPatientMock }),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
}

function createWrapper(qc: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    );
  };
}

const SYNTH_CNS = "000000000000020";

beforeEach(() => {
  fetchMock.mockReset();
  setSelectedPatientMock.mockReset();
});

// ---------------------------------------------------------------------------
// useCreatePatient
// ---------------------------------------------------------------------------

describe("useCreatePatient", () => {
  it("on 201 — invalidates patientKeys.all and opens the panel", async () => {
    const qc = createQueryClient();
    const invalidateSpy = vi.spyOn(qc, "invalidateQueries");

    fetchMock.mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ patient: { gestantes: { cns: SYNTH_CNS } } }),
    });

    const { result } = renderHook(() => useCreatePatient(), {
      wrapper: createWrapper(qc),
    });

    await act(async () => {
      result.current.mutate({
        cns: SYNTH_CNS,
        body: {
          cns: SYNTH_CNS,
          base: { nomeCompleto: "PACIENTE_SINTETICO_HOOK" },
          condicao: "gestantes",
          gestantes: {},
        },
      });
    });

    // Allow mutation callbacks to settle
    await act(async () => {});

    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: patientKeys.all }),
    );
    expect(setSelectedPatientMock).toHaveBeenCalledWith(SYNTH_CNS);
  });

  it("on 409 — propagates structured error with status and body", async () => {
    const qc = createQueryClient();
    fetchMock.mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({
        error: "cns_exists",
        patient: { id: "existing-id", cns: SYNTH_CNS, nomeCompleto: "OUTRO" },
      }),
    });

    const { result } = renderHook(() => useCreatePatient(), {
      wrapper: createWrapper(qc),
    });

    result.current.mutate({
      cns: SYNTH_CNS,
      body: {
        cns: SYNTH_CNS,
        base: { nomeCompleto: "PACIENTE_SINTETICO_HOOK" },
        condicao: "gestantes",
        gestantes: {},
      },
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.status).toBe(409);
    expect(result.current.error?.body?.error).toBe("cns_exists");
    // No cache invalidation on error
    expect(setSelectedPatientMock).not.toHaveBeenCalled();
  });

  it("on 422 — propagates requiresManualPin flag", async () => {
    const qc = createQueryClient();
    fetchMock.mockResolvedValue({
      ok: false,
      status: 422,
      json: async () => ({
        error: "Endereço não encontrado.",
        requiresManualPin: true,
      }),
    });

    const { result } = renderHook(() => useCreatePatient(), {
      wrapper: createWrapper(qc),
    });

    act(() => {
      result.current.mutate({
        cns: SYNTH_CNS,
        body: {
          cns: SYNTH_CNS,
          base: { nomeCompleto: "PACIENTE_SINTETICO_HOOK" },
          condicao: "gestantes",
          gestantes: {},
        },
      });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.status).toBe(422);
    expect(result.current.error?.body?.requiresManualPin).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// useAttachCondition
// ---------------------------------------------------------------------------

describe("useAttachCondition", () => {
  it("on 201 — invalidates cache and opens the panel", async () => {
    const qc = createQueryClient();
    const invalidateSpy = vi.spyOn(qc, "invalidateQueries");

    fetchMock.mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ patient: { hipertensao: { cns: SYNTH_CNS } } }),
    });

    const { result } = renderHook(() => useAttachCondition(), {
      wrapper: createWrapper(qc),
    });

    await act(async () => {
      result.current.mutate({
        patientId: "existing-id",
        cns: SYNTH_CNS,
        body: { condicao: "hipertensao", data: {} },
      });
    });
    await act(async () => {});

    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: patientKeys.all }),
    );
    expect(setSelectedPatientMock).toHaveBeenCalledWith(SYNTH_CNS);
  });
});
