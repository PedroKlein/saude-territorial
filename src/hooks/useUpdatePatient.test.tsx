/**
 * Tests for useUpdatePatient (src/hooks/useUpdatePatient.ts).
 *
 * fetch is stubbed globally; no real HTTP calls.
 * A fresh QueryClient is created per test.
 * SYNTHETIC DATA ONLY — no real patient names, CNS, or addresses.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { useUpdatePatient } from "./useUpdatePatient";
import type { UpdatePatientError } from "./useUpdatePatient";
import { patientKeys, type LayeredPatientData } from "./usePatientData";

// ---------------------------------------------------------------------------
// Mock fetch globally
// ---------------------------------------------------------------------------

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
}

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

// ---------------------------------------------------------------------------
// Synthetic test data — LGPD: fictitious names and CNS numbers
// ---------------------------------------------------------------------------

/** SYNTHETIC patient UUID — not a real record */
const PATIENT_ID = "synthetic-patient-uuid-1";

/**
 * The same patient appears in two layers (gestantes + hipertensao) to cover
 * the multi-condition optimistic-patch path.
 */
const SEEDED_DATA: LayeredPatientData = {
  gestantes: [
    {
      id: PATIENT_ID,
      cns: "111222333444555",
      nomeCompleto: "Nome Sintético Inicial",
      lat: -30.034,
      lng: -51.217,
    },
  ],
  hipertensao: [
    {
      id: PATIENT_ID,
      cns: "111222333444555",
      nomeCompleto: "Nome Sintético Inicial",
      lat: -30.034,
      lng: -51.217,
    },
  ],
};

beforeEach(() => {
  fetchMock.mockReset();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useUpdatePatient", () => {
  it("on success: cache reflects the optimistic patch after mutateAsync resolves", async () => {
    const queryClient = createQueryClient();
    queryClient.setQueryData(patientKeys.all, SEEDED_DATA);

    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => ({ patient: { gestantes: { id: PATIENT_ID, nomeCompleto: "Nome Novo" } } }),
    });

    const { result } = renderHook(() => useUpdatePatient(), {
      wrapper: createWrapper(queryClient),
    });

    await result.current.mutateAsync({
      id: PATIENT_ID,
      body: { base: { nomeCompleto: "Nome Novo" } },
      optimisticPatch: { nomeCompleto: "Nome Novo" },
    });

    const cached = queryClient.getQueryData<LayeredPatientData>(patientKeys.all);
    expect(cached?.gestantes?.[0]!.nomeCompleto).toBe("Nome Novo");
  });

  it("on 422 requiresManualPin: surfaces status+body and rolls back the cache", async () => {
    const queryClient = createQueryClient();
    queryClient.setQueryData(patientKeys.all, SEEDED_DATA);

    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 422,
      json: () => ({
        error: "Endereço não encontrado. Arraste o pin para posicionar.",
        requiresManualPin: true,
      }),
    });

    const { result } = renderHook(() => useUpdatePatient(), {
      wrapper: createWrapper(queryClient),
    });

    let error: UpdatePatientError | undefined;
    try {
      await result.current.mutateAsync({
        id: PATIENT_ID,
        body: { base: { rua: "Rua Fictícia 999", numero: "1" } },
        optimisticPatch: { rua: "Rua Fictícia 999" },
      });
    } catch (e) {
      error = e as UpdatePatientError;
    }

    expect(error).toBeDefined();
    expect(error?.status).toBe(422);
    expect(error?.body?.requiresManualPin).toBe(true);

    // Cache must be rolled back to the pre-mutation snapshot
    const cached = queryClient.getQueryData<LayeredPatientData>(patientKeys.all);
    expect(cached?.gestantes?.[0]!.nomeCompleto).toBe("Nome Sintético Inicial");
  });

  it("on generic 500: surfaces status and rolls back the cache", async () => {
    const queryClient = createQueryClient();
    queryClient.setQueryData(patientKeys.all, SEEDED_DATA);

    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => ({ error: "Erro ao salvar. Tente novamente." }),
    });

    const { result } = renderHook(() => useUpdatePatient(), {
      wrapper: createWrapper(queryClient),
    });

    let error: UpdatePatientError | undefined;
    try {
      await result.current.mutateAsync({
        id: PATIENT_ID,
        body: { base: { nomeCompleto: "Nome Novo" } },
        optimisticPatch: { nomeCompleto: "Nome Novo" },
      });
    } catch (e) {
      error = e as UpdatePatientError;
    }

    expect(error?.status).toBe(500);

    const cached = queryClient.getQueryData<LayeredPatientData>(patientKeys.all);
    expect(cached?.gestantes?.[0]!.nomeCompleto).toBe("Nome Sintético Inicial");
    expect(cached?.hipertensao?.[0]!.nomeCompleto).toBe("Nome Sintético Inicial");
  });

  it("applies optimistic patch to every layer where the patient id matches", async () => {
    const queryClient = createQueryClient();
    queryClient.setQueryData(patientKeys.all, SEEDED_DATA);

    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => ({ patient: {} }),
    });

    const { result } = renderHook(() => useUpdatePatient(), {
      wrapper: createWrapper(queryClient),
    });

    await result.current.mutateAsync({
      id: PATIENT_ID,
      body: { base: { nomeCompleto: "Novo Nome Multi-Layer" } },
      optimisticPatch: { nomeCompleto: "Novo Nome Multi-Layer" },
    });

    const cached = queryClient.getQueryData<LayeredPatientData>(patientKeys.all);
    // Patch must appear in the gestantes layer
    expect(cached?.gestantes?.[0]!.nomeCompleto).toBe("Novo Nome Multi-Layer");
    // Patch must also appear in the hipertensao layer (same patient id)
    expect(cached?.hipertensao?.[0]!.nomeCompleto).toBe("Novo Nome Multi-Layer");
  });
});
