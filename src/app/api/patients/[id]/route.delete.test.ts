/**
 * Tests for DELETE /api/patients/[id] (src/app/api/patients/[id]/route.ts).
 *
 * Kept separate from route.test.ts (PATCH) for clarity.
 * LGPD: synthetic patient data only — no real CNS, names, or addresses.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------

const mocks = vi.hoisted(() => {
  const getSession = vi.fn();
  const returningSpy = vi.fn();
  const whereSpy = vi.fn();
  const deleteSpy = vi.fn();

  return { getSession, returningSpy, whereSpy, deleteSpy };
});

vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: mocks.getSession } },
}));

vi.mock("@/db/client", () => ({
  db: {
    delete: mocks.deleteSpy,
    // query.patients.findFirst is used by the PATCH handler in the same module;
    // stub it to a no-op so the module loads cleanly if PATCH is evaluated.
    query: { patients: { findFirst: vi.fn() } },
  },
}));

// ---------------------------------------------------------------------------
// Module under test — import AFTER mocks are hoisted.
// ---------------------------------------------------------------------------

import { DELETE } from "@/app/api/patients/[id]/route";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Synthetic data — LGPD: fictitious patient id
// ---------------------------------------------------------------------------

const PATIENT_ID = "synthetic-uuid-delete-1";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(): NextRequest {
  return new NextRequest(`http://localhost/api/patients/${PATIENT_ID}`, {
    method: "DELETE",
  });
}

function makeParams(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) };
}

function primeDbMocks(): void {
  mocks.returningSpy.mockResolvedValue([{ id: PATIENT_ID }]);
  mocks.whereSpy.mockReturnValue({ returning: mocks.returningSpy });
  mocks.deleteSpy.mockReturnValue({ where: mocks.whereSpy });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getSession.mockResolvedValue({ user: { id: "session-user-1" } });
  primeDbMocks();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("DELETE /api/patients/[id]", () => {
  it("returns 204 when the patient exists — db.delete called with correct chain", async () => {
    const res = await DELETE(makeRequest(), makeParams(PATIENT_ID));
    expect(res.status).toBe(204);
    // Verify the delete was issued
    expect(mocks.deleteSpy).toHaveBeenCalledTimes(1);
    // where() must have been chained
    expect(mocks.whereSpy).toHaveBeenCalledTimes(1);
    // returning() must have been chained
    expect(mocks.returningSpy).toHaveBeenCalledTimes(1);
  });

  it("returns 404 with PT-BR error when the patient does not exist", async () => {
    mocks.returningSpy.mockResolvedValue([]);
    const res = await DELETE(makeRequest(), makeParams("nonexistent-uuid"));
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toBe("Paciente não encontrado.");
  });

  it("returns 401 when the session is absent", async () => {
    mocks.getSession.mockResolvedValue(null);
    const res = await DELETE(makeRequest(), makeParams(PATIENT_ID));
    expect(res.status).toBe(401);
    // Delete must never be issued without a valid session
    expect(mocks.deleteSpy).not.toHaveBeenCalled();
  });

  it("returns 500 when the db throws", async () => {
    mocks.deleteSpy.mockImplementation(() => {
      throw new TypeError("DB unavailable");
    });
    const res = await DELETE(makeRequest(), makeParams(PATIENT_ID));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe("Erro ao excluir. Tente novamente.");
  });
});
