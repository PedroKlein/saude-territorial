import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { usePatientData } from "./usePatientData";

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

describe("usePatientData", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("returns loading state initially", () => {
    mockFetch.mockImplementation(() => new Promise(() => {})); // never resolves
    const { result } = renderHook(() => usePatientData(), {
      wrapper: createWrapper(),
    });
    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();
  });

  it("returns grouped patient data on success", async () => {
    const mockResponse = {
      layers: {
        gestantes: [
          {
            cns: "111222333444555",
            nomeCompleto: "Paciente A",
            lat: -30.03,
            lng: -51.22,
          },
        ],
        tuberculose: [
          {
            cns: "555444333222111",
            nomeCompleto: "Paciente B",
            lat: -30.04,
            lng: -51.23,
          },
        ],
      },
    };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const { result } = renderHook(() => usePatientData(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.gestantes).toHaveLength(1);
    expect(result.current.data?.tuberculose).toHaveLength(1);
    expect(mockFetch).toHaveBeenCalledWith("/api/patients");
  });

  it("returns error state on fetch failure", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
    });

    const { result } = renderHook(() => usePatientData(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeDefined();
  });

  it("returns error state on 401 unauthorized", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
    });

    const { result } = renderHook(() => usePatientData(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as Error).message).toContain("401");
  });

  it("returns empty layer map when response has no rows", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ layers: { gestantes: [], tuberculose: [], hipertensao: [] } }),
    });

    const { result } = renderHook(() => usePatientData(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.gestantes).toEqual([]);
    expect(result.current.data?.tuberculose).toEqual([]);
    expect(result.current.data?.hipertensao).toEqual([]);
  });
});
