/**
 * Tests for DELETE /api/patients/[id]/conditions/[condicao].
 *
 * LGPD: synthetic patient data only — no real CNS, names, or addresses.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------

const mocks = vi.hoisted(() => {
  const getSession = vi.fn();

  const returningSpy = vi.fn();
  const whereDeleteSpy = vi.fn();
  const deleteSpy = vi.fn();

  const whereUpdateSpy = vi.fn();
  const setSpy = vi.fn();
  const updateSpy = vi.fn();

  const transactionSpy = vi.fn();

  return {
    getSession,
    returningSpy,
    whereDeleteSpy,
    deleteSpy,
    whereUpdateSpy,
    setSpy,
    updateSpy,
    transactionSpy,
  };
});

vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: mocks.getSession } },
}));

vi.mock("@/db/client", () => ({
  db: {
    transaction: mocks.transactionSpy,
  },
}));

// ---------------------------------------------------------------------------
// Module under test — import AFTER mocks are hoisted.
// ---------------------------------------------------------------------------

import { DELETE } from "@/app/api/patients/[id]/conditions/[condicao]/route";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Synthetic data
// ---------------------------------------------------------------------------

const PATIENT_ID = "synthetic-uuid-cond-1";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(): NextRequest {
  return new NextRequest("http://localhost/api/patients/x/conditions/gestantes", {
    method: "DELETE",
  });
}

function makeParams(
  id: string,
  condicao: string,
): { params: Promise<{ id: string; condicao: string }> } {
  return { params: Promise.resolve({ id, condicao }) };
}

function primeDbMocks(deleteCount = 1): void {
  mocks.returningSpy.mockResolvedValue(
    deleteCount > 0 ? [{ patientId: PATIENT_ID }] : [],
  );
  mocks.whereDeleteSpy.mockReturnValue({ returning: mocks.returningSpy });
  mocks.deleteSpy.mockReturnValue({ where: mocks.whereDeleteSpy });

  mocks.whereUpdateSpy.mockResolvedValue(undefined);
  mocks.setSpy.mockReturnValue({ where: mocks.whereUpdateSpy });
  mocks.updateSpy.mockReturnValue({ set: mocks.setSpy });

  mocks.transactionSpy.mockImplementation(
    async (cb: (tx: unknown) => Promise<void>) => {
      await cb({
        delete: mocks.deleteSpy,
        update: mocks.updateSpy,
      });
    },
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getSession.mockResolvedValue({ user: { id: "session-user-1" } });
  primeDbMocks();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("DELETE /api/patients/[id]/conditions/[condicao]", () => {
  it("204 when gestantes extension is found — verifies delete + update both called", async () => {
    const res = await DELETE(makeRequest(), makeParams(PATIENT_ID, "gestantes"));
    expect(res.status).toBe(204);
    expect(mocks.deleteSpy).toHaveBeenCalledTimes(1);
    expect(mocks.updateSpy).toHaveBeenCalledTimes(1);
  });

  it("204 for tuberculose extension", async () => {
    const res = await DELETE(makeRequest(), makeParams(PATIENT_ID, "tuberculose"));
    expect(res.status).toBe(204);
  });

  it("204 for hipertensao extension", async () => {
    const res = await DELETE(makeRequest(), makeParams(PATIENT_ID, "hipertensao"));
    expect(res.status).toBe(204);
  });

  it("404 when extension row does not exist for this patient", async () => {
    primeDbMocks(0); // returning [] → not found
    const res = await DELETE(makeRequest(), makeParams(PATIENT_ID, "gestantes"));
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toBe("Condição não encontrada para este paciente.");
    // Base patient row must not be touched
    expect(mocks.updateSpy).not.toHaveBeenCalled();
  });

  it("400 on unknown condicao value", async () => {
    const res = await DELETE(makeRequest(), makeParams(PATIENT_ID, "diabetes"));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("Condição inválida.");
    // Transaction must never be opened for an invalid condicao
    expect(mocks.transactionSpy).not.toHaveBeenCalled();
  });

  it("401 when unauthenticated", async () => {
    mocks.getSession.mockResolvedValue(null);
    const res = await DELETE(makeRequest(), makeParams(PATIENT_ID, "gestantes"));
    expect(res.status).toBe(401);
    expect(mocks.transactionSpy).not.toHaveBeenCalled();
  });

  it("500 when the transaction throws", async () => {
    mocks.transactionSpy.mockRejectedValue(new TypeError("DB error"));
    const res = await DELETE(makeRequest(), makeParams(PATIENT_ID, "gestantes"));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe("Erro ao remover condição. Tente novamente.");
  });
});
