import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { usePatientEdit } from "./usePatientEdit";

const mockFetch = vi.fn();
global.fetch = mockFetch;

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

describe("usePatientEdit", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("calls PUT /api/sheets with correct payload on mutate", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    const { result } = renderHook(() => usePatientEdit(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      spreadsheetId: "sheet-123",
      tabName: "Gestantes",
      rowIndex: 5,
      updates: { Nome: "Teste" },
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockFetch).toHaveBeenCalledWith("/api/sheets", expect.objectContaining({
      method: "PUT",
    }));
  });

  it("sets error state when API returns failure", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 502,
      json: () => Promise.resolve({ error: "Falha ao salvar na planilha." }),
    });

    const { result } = renderHook(() => usePatientEdit(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      spreadsheetId: "sheet-123",
      tabName: "Gestantes",
      rowIndex: 5,
      updates: { Nome: "Teste" },
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeDefined();
  });

  it("provides isPending state during mutation", async () => {
    let resolvePromise: (v: unknown) => void;
    mockFetch.mockImplementationOnce(
      () => new Promise((r) => { resolvePromise = r; })
    );

    const { result } = renderHook(() => usePatientEdit(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      spreadsheetId: "sheet-123",
      tabName: "Gestantes",
      rowIndex: 5,
      updates: { Nome: "Teste" },
    });

    await waitFor(() => expect(result.current.isPending).toBe(true));

    resolvePromise!({ ok: true, json: () => Promise.resolve({ success: true }) });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});
