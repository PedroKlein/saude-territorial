/**
 * Tests for POST /api/patients/[id]/conditions
 * (src/app/api/patients/[id]/conditions/route.ts).
 *
 * Covers: 201 attach new condition, 409 duplicate, 404 unknown patient,
 * 401 unauthed.
 *
 * LGPD: all patient values are synthetic / fictitious.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------

const mocks = vi.hoisted(() => {
  const getSession = vi.fn();
  const findFirst = vi.fn();

  const whereSpy = vi.fn();
  const setSpy = vi.fn();
  const updateSpy = vi.fn();

  const onConflictDoNothing = vi.fn();
  const values = vi.fn();
  const insertSpy = vi.fn();

  const transactionSpy = vi.fn();

  return {
    getSession,
    findFirst,
    whereSpy,
    setSpy,
    updateSpy,
    onConflictDoNothing,
    values,
    insertSpy,
    transactionSpy,
  };
});

vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: mocks.getSession } },
}));

vi.mock("@/db/client", () => ({
  db: {
    query: {
      patients: { findFirst: mocks.findFirst },
    },
    transaction: mocks.transactionSpy,
  },
}));

// ---------------------------------------------------------------------------
// Module under test
// ---------------------------------------------------------------------------

import { POST } from "@/app/api/patients/[id]/conditions/route";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Synthetic data
// ---------------------------------------------------------------------------

const PATIENT_ID = "synth-conditions-uuid-1";

const PATIENT_NO_HAS = {
  id: PATIENT_ID,
  cns: "000000000000010",
  nomeCompleto: "PACIENTE_SINTETICO_CONDITIONS",
  dataNascimento: null,
  idade: null,
  telefone: null,
  rua: null,
  numero: null,
  complemento: null,
  bairro: null,
  microarea: null,
  lat: -30.05,
  lng: -51.2,
  geocodeStatus: "geocoded" as const,
  geocodeReference: null,
  vulnerabilidades: null,
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-01T00:00:00Z"),
  createdBy: "user-1",
  updatedBy: "user-1",
  gestantes: {
    patientId: PATIENT_ID,
    dum: null,
    dpp: null,
    risco: null,
    igAbertura: null,
    dataUltimaConsulta: null,
    dataProximaConsulta: null,
    numeroConsultas: 0,
    hasPreviaTag: null,
    diabetesPreviaTag: null,
    pressaoArterial: null,
    acompanhamentoPesoAltura: null,
    numeroVisitasDomiciliares: 0,
    avaliacaoOdontoStatus: null,
    vacinaDtpa: null,
    trPrimeiroTri: null,
    trSegundoTri: null,
    trTerceiroTri: null,
    resultadoTr: null,
    trHepBHepCPrimeiroTri: null,
    trSifHivTerceiroTri: null,
    isPuerpera: false,
    puerperioConsulta: null,
    puerperioVisitaDomiciliar: null,
    puerperioAvaliacaoOdonto: null,
    isExposta: false,
    updatedAt: new Date("2026-01-01T00:00:00Z"),
  },
  tuberculose: null,
  has: null,
};

const PATIENT_AFTER_ATTACH = {
  ...PATIENT_NO_HAS,
  has: {
    patientId: PATIENT_ID,
    dataUltimaConsulta: null,
    dataProximaConsulta: null,
    dataUltimaAfericaoPa: null,
    pressaoArterial: "140/90",
    registroNotas: null,
    encaminhamentos: null,
    updatedAt: new Date("2026-01-01T00:00:00Z"),
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(body: unknown, id = PATIENT_ID): [NextRequest, { params: Promise<{ id: string }> }] {
  return [
    new NextRequest(`http://localhost/api/patients/${id}/conditions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ id }) },
  ];
}

function primeTransactionMock() {
  mocks.whereSpy.mockResolvedValue(undefined);
  mocks.setSpy.mockReturnValue({ where: mocks.whereSpy });
  mocks.updateSpy.mockReturnValue({ set: mocks.setSpy });
  mocks.values.mockResolvedValue(undefined);
  mocks.insertSpy.mockReturnValue({ values: mocks.values });
  mocks.transactionSpy.mockImplementation(
    async (cb: (tx: unknown) => Promise<void>) => {
      await cb({ update: mocks.updateSpy, insert: mocks.insertSpy });
    },
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getSession.mockResolvedValue({ user: { id: "user-1" } });
  primeTransactionMock();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("POST /api/patients/[id]/conditions", () => {
  it("201 — attaches hipertensao to a patient that already has gestantes", async () => {
    mocks.findFirst
      .mockResolvedValueOnce(PATIENT_NO_HAS)      // verify patient exists
      .mockResolvedValueOnce(PATIENT_AFTER_ATTACH); // re-read after insert

    const [req, params] = makeRequest({
      condicao: "hipertensao",
      data: { pressaoArterial: "140/90" },
    });
    const res = await POST(req, params);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.patient.hipertensao).toBeDefined();
  });

  it("409 — returns condition_exists when the extension already exists", async () => {
    const patientWithHas = { ...PATIENT_NO_HAS, has: PATIENT_AFTER_ATTACH.has };
    mocks.findFirst.mockResolvedValueOnce(patientWithHas);

    const [req, params] = makeRequest({ condicao: "hipertensao", data: {} });
    const res = await POST(req, params);
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toBe("condition_exists");
    expect(mocks.transactionSpy).not.toHaveBeenCalled();
  });

  it("404 — returns not found for unknown patient id", async () => {
    mocks.findFirst.mockResolvedValueOnce(null);

    const [req, params] = makeRequest({ condicao: "hipertensao", data: {} }, "nonexistent-id");
    const res = await POST(req, params);
    expect(res.status).toBe(404);
  });

  it("401 — returns Autenticação necessária when unauthenticated", async () => {
    mocks.getSession.mockResolvedValue(null);

    const [req, params] = makeRequest({ condicao: "hipertensao", data: {} });
    const res = await POST(req, params);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toMatch(/autenti/i);
  });

  it("400 — invalid body is rejected with issues", async () => {
    const [req, params] = makeRequest({ condicao: "invalido", data: {} });
    const res = await POST(req, params);
    expect(res.status).toBe(400);
  });
});
