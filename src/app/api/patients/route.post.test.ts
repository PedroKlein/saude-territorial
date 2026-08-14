/**
 * Tests for POST /api/patients (src/app/api/patients/route.ts).
 *
 * Covers: 201 happy path (gestantes / tuberculose / hipertensao),
 * 409 CNS collision, 422 unresolvable address, direct-coord path,
 * 401 unauthed, 400 invalid body.
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
  const insertSpy = vi.fn();
  const values = vi.fn();
  const returning = vi.fn();
  const transactionSpy = vi.fn();
  const geocodeWithCache = vi.fn();

  return {
    getSession,
    findFirst,
    insertSpy,
    values,
    returning,
    transactionSpy,
    geocodeWithCache,
  };
});

vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: mocks.getSession } },
}));

vi.mock("@/db/client", () => ({
  db: {
    query: { patients: { findFirst: mocks.findFirst } },
    transaction: mocks.transactionSpy,
  },
}));

vi.mock("@/lib/geocoding/cache", () => ({
  geocodeWithCache: mocks.geocodeWithCache,
}));

vi.mock("@/lib/geocoding/normalize", () => ({
  normalizeAddress: (rua: string, num: string, bairro?: string) => ({
    street: rua,
    number: num,
    city: "Porto Alegre",
    state: "RS",
    country: "br",
    bairro,
  }),
}));

// ---------------------------------------------------------------------------
// Module under test — import AFTER mocks
// ---------------------------------------------------------------------------

import { POST } from "@/app/api/patients/route";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Synthetic data — LGPD: fictitious
// ---------------------------------------------------------------------------
/**
 * Valid synthetic CNS values — the create schema now enforces the DATASUS
 * checksum (UP-1.4), so bare `0000...` strings no longer parse. Computing
 * the tail from `computeCnsChecksum` gives us deterministic, unique CNS
 * values that satisfy the schema without pinning to any real card.
 */
import { computeCnsChecksum } from "@/lib/patients/cns";

const makeCns = (suffix: number): string => {
  const prefix = `100000000${suffix.toString().padStart(2, "0")}`;
  return prefix + computeCnsChecksum(prefix);
};
const CNS_GESTANTE = makeCns(1);
const CNS_TB = makeCns(2);
const CNS_HAS = makeCns(3);
const CNS_COORD = makeCns(4);

const PATIENT_UUID = "synth-create-uuid-1";

const BASE_GESTANTE_BODY = {
  cns: CNS_GESTANTE,
  base: {
    nomeCompleto: "PACIENTE_SINTETICO_CREATE",
    rua: "Rua Fictícia",
    numero: "100",
    bairro: "Bairro Teste",
  },
  condicao: "gestantes" as const,
  gestantes: {},
};

const CREATED_GESTANTE = {
  id: PATIENT_UUID,
  cns: CNS_GESTANTE,
  nomeCompleto: "PACIENTE_SINTETICO_CREATE",
  dataNascimento: null,
  idade: null,
  telefone: null,
  rua: "Rua Fictícia",
  numero: "100",
  complemento: null,
  bairro: "Bairro Teste",
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
    patientId: PATIENT_UUID,
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

const CREATED_TB = {
  ...CREATED_GESTANTE,
  cns: CNS_TB,
  gestantes: null,
  tuberculose: {
    patientId: PATIENT_UUID,
    tipo: "Pulmonar",
    galRegistro: null,
    baciloscopiaPrimeiraData: null,
    baciloscopiaSegundaData: null,
    baciloscopiaResultado: null,
    trmPrimeiraData: null,
    trmSegundaData: null,
    trmResultado: null,
    culturaMTuberculosis: null,
    ppdMm: null,
    histopatologia: null,
    rxTorax: null,
    outrosExames: null,
    formaClinica: null,
    tipoEntrada: null,
    esquema: null,
    dataInicio: null,
    formaTratamento: null,
    tdoStatus: null,
    encerramentoMotivo: null,
    encerramentoData: null,
    contatosCoabitantes: null,
    contatosExaminados: null,
    todosContatosExaminados: null,
    contatosLista: null,
    updatedAt: new Date("2026-01-01T00:00:00Z"),
  },
};

const CREATED_HAS = {
  ...CREATED_GESTANTE,
  cns: CNS_HAS,
  lat: null,
  lng: null,
  geocodeStatus: "unresolved" as const,
  gestantes: null,
  has: {
    patientId: PATIENT_UUID,
    dataUltimaConsulta: null,
    dataProximaConsulta: null,
    dataUltimaAfericaoPa: null,
    pressaoArterial: null,
    registroNotas: null,
    encaminhamentos: null,
    updatedAt: new Date("2026-01-01T00:00:00Z"),
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/patients", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/** Wire up the transaction mock to invoke the callback with a fake tx. */
function primeTransactionMock(insertedId = PATIENT_UUID) {
  mocks.returning.mockResolvedValue([{ id: insertedId }]);
  mocks.values.mockReturnValue({ returning: mocks.returning });
  mocks.insertSpy.mockReturnValue({ values: mocks.values });
  mocks.transactionSpy.mockImplementation(
    async (cb: (tx: unknown) => Promise<void>) => {
      await cb({ insert: mocks.insertSpy });
    },
  );
}

beforeEach(() => {
  // mockReset clears both call history AND queued mockResolvedValueOnce values.
  mocks.findFirst.mockReset();
  mocks.geocodeWithCache.mockReset();
  mocks.transactionSpy.mockReset();
  mocks.insertSpy.mockReset();
  mocks.values.mockReset();
  mocks.returning.mockReset();
  mocks.getSession.mockReset();

  mocks.getSession.mockResolvedValue({ user: { id: "user-1" } });
  mocks.geocodeWithCache.mockResolvedValue({
    lat: -30.05,
    lng: -51.2,
    confidence: "high",
    importance: 0.9,
  });
  primeTransactionMock();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("POST /api/patients", () => {
  it("201 — creates a gestante patient and returns the shape", async () => {
    // findFirst: no CNS collision, then re-read returns the created row.
    mocks.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(CREATED_GESTANTE);

    const res = await POST(makeRequest(BASE_GESTANTE_BODY));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.patient.gestantes).toBeDefined();
    expect(body.patient.tuberculose).toBeUndefined();
  });

  it("201 — creates a tuberculose patient", async () => {
    mocks.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(CREATED_TB);

    const tbBody = {
      cns: CNS_TB,
      base: { nomeCompleto: "PACIENTE_SINTETICO_TB" },
      condicao: "tuberculose" as const,
      tuberculose: { tipo: "Pulmonar" },
    };

    const res = await POST(makeRequest(tbBody));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.patient.tuberculose).toBeDefined();
    expect(body.patient.gestantes).toBeUndefined();
  });

  it("201 — creates a hipertensao patient (no address → unresolved)", async () => {
    // No rua/numero/bairro: geocode branch skipped.
    mocks.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(CREATED_HAS);

    const hasBody = {
      cns: CNS_HAS,
      base: { nomeCompleto: "PACIENTE_SINTETICO_HAS" },
      condicao: "hipertensao" as const,
      hipertensao: {},
    };

    const res = await POST(makeRequest(hasBody));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.patient.hipertensao).toBeDefined();
  });

  it("409 — CNS collision returns existing shape without writing to DB", async () => {
    // findFirst returns the existing patient (collision on first call).
    mocks.findFirst.mockResolvedValueOnce(CREATED_GESTANTE);

    const res = await POST(makeRequest(BASE_GESTANTE_BODY));
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toBe("cns_exists");
    expect(body.patient).toBeDefined();
    expect(body.patient.id).toBe(PATIENT_UUID);
    expect(mocks.transactionSpy).not.toHaveBeenCalled();
  });

  it("422 — unresolvable address returns requiresManualPin without DB write", async () => {
    mocks.findFirst.mockResolvedValueOnce(null);
    mocks.geocodeWithCache.mockResolvedValue(null);

    const res = await POST(makeRequest(BASE_GESTANTE_BODY));
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.requiresManualPin).toBe(true);
    expect(mocks.transactionSpy).not.toHaveBeenCalled();
  });

  it("201 — direct-coord path skips geocoding, geocodeStatus=manual", async () => {
    const directBody = {
      cns: CNS_COORD,
      base: {
        nomeCompleto: "PACIENTE_SINTETICO_COORD",
        lat: -30.05,
        lng: -51.2,
      },
      condicao: "gestantes" as const,
      gestantes: {},
    };
    const createdManual = { ...CREATED_GESTANTE, geocodeStatus: "manual" as const };
    mocks.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(createdManual);

    const res = await POST(makeRequest(directBody));
    expect(res.status).toBe(201);
    expect(mocks.geocodeWithCache).not.toHaveBeenCalled();
  });

  it("401 — returns 401 when session missing", async () => {
    mocks.getSession.mockResolvedValue(null);

    const res = await POST(makeRequest(BASE_GESTANTE_BODY));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toMatch(/autenti/i);
  });

  it("400 — returns issues array for invalid body", async () => {
    // cns: "WRONG" fails the 15-digit regex; base.nomeCompleto empty fails requiredText.
    const res = await POST(
      makeRequest({ cns: "WRONG", base: { nomeCompleto: "" }, condicao: "gestantes", gestantes: {} }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(Array.isArray(body.issues)).toBe(true);
  });
});
