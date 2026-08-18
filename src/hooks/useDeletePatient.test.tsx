/**
 * Tests for useDeletePatient + useDeleteCondition
 * (src/hooks/useDeletePatient.ts).
 *
 * LGPD: synthetic patient data only — no real CNS, names, or addresses.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { useDeletePatient, useDeleteCondition } from "./useDeletePatient";
import { patientKeys, type LayeredPatientData } from "./usePatientData";

// ---------------------------------------------------------------------------
// Globals
// ---------------------------------------------------------------------------

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

// ---------------------------------------------------------------------------
// Mock useMapStore — useDeletePatient calls setSelectedPatient on success.
// ---------------------------------------------------------------------------

const mocks = vi.hoisted(() => ({
  setSelectedPatient: vi.fn(),
}));

vi.mock("@/stores/mapStore", () => ({
  useMapStore: (
    selector: (s: { setSelectedPatient: (v: string | null) => void }) => unknown,
  ) => selector({ setSelectedPatient: mocks.setSelectedPatient }),
}));

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

const PATIENT_ID = "synthetic-delete-uuid-1";

/** Patient lives in two layers to verify multi-layer removal + rollback. */
const SEEDED_DATA: LayeredPatientData = {
  gestantes: [
    {
      id: PATIENT_ID,
      cns: "111222333444555",
      nomeCompleto: "Nome Sintético Deleção",
      lat: -30.034,
      lng: -51.217,
    },
  ],
  hipertensao: [
    {
      id: PATIENT_ID,
      cns: "111222333444555",
      nomeCompleto: "Nome Sintético Deleção",
      lat: -30.034,
      lng: -51.217,
    },
  ],
};

beforeEach(() => {
  fetchMock.mockReset();
  mocks.setSelectedPatient.mockClear();
});

// ---------------------------------------------------------------------------
// useDeletePatient
// ---------------------------------------------------------------------------

describe("useDeletePatient", () => {
  it("happy path: calls DELETE on the correct URL and closes the panel", async () => {
    const queryClient = createQueryClient();
    queryClient.setQueryData(patientKeys.all, SEEDED_DATA);

    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 204,
      json: () => ({}),
    });

    const { result } = renderHook(() => useDeletePatient(), {
      wrapper: createWrapper(queryClient),
    });

    await result.current.mutateAsync({ id: PATIENT_ID });

    expect(fetchMock).toHaveBeenCalledWith(
      `/api/patients/${PATIENT_ID}`,
      expect.objectContaining({ method: "DELETE" }),
    );
    // Hook closes the panel on success
    expect(mocks.setSelectedPatient).toHaveBeenCalledWith(null);
  });

  it("removes patient from all layers after successful deletion", async () => {
    const queryClient = createQueryClient();
    queryClient.setQueryData(patientKeys.all, SEEDED_DATA);

    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 204,
      json: () => ({}),
    });

    const { result } = renderHook(() => useDeletePatient(), {
      wrapper: createWrapper(queryClient),
    });

    await result.current.mutateAsync({ id: PATIENT_ID });

    // After settlement the patient must be absent from both layers
    const cached = queryClient.getQueryData<LayeredPatientData>(patientKeys.all);
    expect(cached?.gestantes?.find((p) => p.id === PATIENT_ID)).toBeUndefined();
    expect(cached?.hipertensao?.find((p) => p.id === PATIENT_ID)).toBeUndefined();
  });

  it("on error: rolls back the cache to the snapshot", async () => {
    const queryClient = createQueryClient();
    queryClient.setQueryData(patientKeys.all, SEEDED_DATA);

    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => ({ error: "Erro ao excluir. Tente novamente." }),
    });

    const { result } = renderHook(() => useDeletePatient(), {
      wrapper: createWrapper(queryClient),
    });

    try {
      await result.current.mutateAsync({ id: PATIENT_ID });
    } catch {
      // expected
    }

    const cached = queryClient.getQueryData<LayeredPatientData>(patientKeys.all);
    // Both layers must be restored
    expect(cached?.gestantes?.[0].id).toBe(PATIENT_ID);
    expect(cached?.hipertensao?.[0].id).toBe(PATIENT_ID);
    // Panel must not be closed on error
    expect(mocks.setSelectedPatient).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// useDeleteCondition
// ---------------------------------------------------------------------------

describe("useDeleteCondition", () => {
  it("hits the correct condition URL for gestantes", async () => {
    const queryClient = createQueryClient();
    queryClient.setQueryData(patientKeys.all, SEEDED_DATA);

    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 204,
      json: () => ({}),
    });

    const { result } = renderHook(() => useDeleteCondition(), {
      wrapper: createWrapper(queryClient),
    });

    await result.current.mutateAsync({ id: PATIENT_ID, condicao: "gestantes" });

    expect(fetchMock).toHaveBeenCalledWith(
      `/api/patients/${PATIENT_ID}/conditions/gestantes`,
      expect.objectContaining({ method: "DELETE" }),
    );
    // Panel stays open (setSelectedPatient not called for condition delete)
    expect(mocks.setSelectedPatient).not.toHaveBeenCalled();
  });

  it("removes patient from the targeted layer only, leaving other layers intact", async () => {
    const queryClient = createQueryClient();
    queryClient.setQueryData(patientKeys.all, SEEDED_DATA);

    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 204,
      json: () => ({}),
    });

    const { result } = renderHook(() => useDeleteCondition(), {
      wrapper: createWrapper(queryClient),
    });

    await result.current.mutateAsync({ id: PATIENT_ID, condicao: "gestantes" });

    const cached = queryClient.getQueryData<LayeredPatientData>(patientKeys.all);
    // gestantes layer must be cleared
    expect(cached?.gestantes?.find((p) => p.id === PATIENT_ID)).toBeUndefined();
    // hipertensao layer must be untouched
    expect(cached?.hipertensao?.find((p) => p.id === PATIENT_ID)).toBeDefined();
  });

  it("on error: rolls back the cache snapshot", async () => {
    const queryClient = createQueryClient();
    queryClient.setQueryData(patientKeys.all, SEEDED_DATA);

    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => ({ error: "Erro ao remover condição." }),
    });

    const { result } = renderHook(() => useDeleteCondition(), {
      wrapper: createWrapper(queryClient),
    });

    try {
      await result.current.mutateAsync({ id: PATIENT_ID, condicao: "gestantes" });
    } catch {
      // expected
    }

    const cached = queryClient.getQueryData<LayeredPatientData>(patientKeys.all);
    // gestantes layer must be restored
    expect(cached?.gestantes?.[0].id).toBe(PATIENT_ID);
  });
});
