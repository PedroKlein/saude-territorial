/**
 * Tests for PATCH /api/patients/[id] (src/app/api/patients/[id]/route.ts).
 *
 * Auth, DB, and geocoding are mocked at module boundaries. No real IO.
 * LGPD: SYNTHETIC data only. Assertions target the important side effects —
 * geocode call presence/absence and the `geocodeStatus` value ending up on
 * the base update — not every column shape.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Hoisted mocks so factories in vi.mock can close over them.
// ---------------------------------------------------------------------------

const mocks = vi.hoisted(() => {
  const getSession = vi.fn();

  const findFirst = vi.fn();

  const setSpy = vi.fn();
  const whereSpy = vi.fn();
  const updateSpy = vi.fn();

  const onConflictDoUpdate = vi.fn();
  const values = vi.fn();
  const insertSpy = vi.fn();

  const transactionSpy = vi.fn();

  const geocodeWithCache = vi.fn();

  return {
    getSession,
    findFirst,
    setSpy,
    whereSpy,
    updateSpy,
    onConflictDoUpdate,
    values,
    insertSpy,
    transactionSpy,
    geocodeWithCache,
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

vi.mock("@/lib/geocoding/cache", () => ({
  geocodeWithCache: mocks.geocodeWithCache,
}));

// ---------------------------------------------------------------------------
// Module under test — import AFTER mocks are hoisted.
// ---------------------------------------------------------------------------

import { PATCH } from "@/app/api/patients/[id]/route";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Synthetic data — LGPD: fictitious patient
// ---------------------------------------------------------------------------

const PATIENT_ID = "synthetic-uuid-1";

const SYNTHETIC_CURRENT = {
  id: PATIENT_ID,
  cns: "000000000000001",
  nomeCompleto: "PACIENTE_SINTETICO_01",
  dataNascimento: "1990-01-01",
  idade: 34,
  telefone: null,
  rua: "Rua Fictícia",
  numero: "10",
  complemento: null,
  bairro: null,
  microarea: "MA1",
  lat: -30.05,
  lng: -51.2,
  geocodeStatus: "geocoded" as const,
  geocodeReference: null,
  vulnerabilidades: null,
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-01T00:00:00Z"),
  createdBy: null,
  updatedBy: null,
  gestantes: {
    patientId: PATIENT_ID,
    dum: "2025-11-01",
    dpp: "2026-08-08",
    risco: "habitual",
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/patients/x", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeParams(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) };
}

/** Rebuild the DB call chains between tests. */
function primeDbMocks(): void {
  // update chain: db.tx.update(patients).set(...).where(...)
  mocks.whereSpy.mockResolvedValue(undefined);
  mocks.setSpy.mockReturnValue({ where: mocks.whereSpy });
  mocks.updateSpy.mockReturnValue({ set: mocks.setSpy });

  // insert chain: db.tx.insert(table).values(...).onConflictDoUpdate(...)
  mocks.onConflictDoUpdate.mockResolvedValue(undefined);
  mocks.values.mockReturnValue({ onConflictDoUpdate: mocks.onConflictDoUpdate });
  mocks.insertSpy.mockReturnValue({ values: mocks.values });

  // transaction: immediately invoke callback with a tx object.
  mocks.transactionSpy.mockImplementation(async (cb: (tx: unknown) => Promise<void>) => {
    await cb({
      update: mocks.updateSpy,
      insert: mocks.insertSpy,
    });
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  primeDbMocks();
  mocks.getSession.mockResolvedValue({ user: { id: "user-1" } });
  mocks.findFirst.mockResolvedValue(SYNTHETIC_CURRENT);
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("PATCH /api/patients/[id]", () => {
  it("returns 401 without a session", async () => {
    mocks.getSession.mockResolvedValueOnce(null);
    const res = await PATCH(
      makeRequest({ base: { nomeCompleto: "Nova" } }),
      makeParams(PATIENT_ID),
    );
    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: string };
    expect(body.error).toMatch(/Autentica[çc][ãa]o/i);
  });

  it("returns 400 on invalid JSON body", async () => {
    // Construct a request with a broken JSON stream.
    const req = new NextRequest("http://localhost/api/patients/x", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: "not-json",
    });
    const res = await PATCH(req, makeParams(PATIENT_ID));
    expect(res.status).toBe(400);
  });

  it("returns 400 on empty patch (nothing to update)", async () => {
    const res = await PATCH(makeRequest({}), makeParams(PATIENT_ID));
    expect(res.status).toBe(400);
  });

  it("returns 404 when the patient does not exist", async () => {
    mocks.findFirst.mockResolvedValueOnce(undefined);
    const res = await PATCH(
      makeRequest({ base: { nomeCompleto: "Nova" } }),
      makeParams("missing"),
    );
    expect(res.status).toBe(404);
    expect(mocks.transactionSpy).not.toHaveBeenCalled();
  });

  it("happy field edit — no geocode call, transaction runs", async () => {
    // After the transaction, the re-read returns an updated row so the
    // response can be shaped. Second findFirst return covers the re-read.
    mocks.findFirst.mockResolvedValueOnce(SYNTHETIC_CURRENT);
    mocks.findFirst.mockResolvedValueOnce({
      ...SYNTHETIC_CURRENT,
      nomeCompleto: "Nova",
    });

    const res = await PATCH(
      makeRequest({ base: { nomeCompleto: "Nova" } }),
      makeParams(PATIENT_ID),
    );

    expect(res.status).toBe(200);
    expect(mocks.geocodeWithCache).not.toHaveBeenCalled();
    expect(mocks.transactionSpy).toHaveBeenCalledTimes(1);

    const setArg = mocks.setSpy.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(setArg.nomeCompleto).toBe("Nova");
    // geocodeStatus is untouched on a pure field edit.
    expect(setArg.geocodeStatus).toBeUndefined();

    const body = (await res.json()) as { patient: { gestantes?: unknown } };
    expect(body.patient.gestantes).toBeDefined();
  });

  it("address change (resolvable) — geocoded, status='geocoded'", async () => {
    mocks.geocodeWithCache.mockResolvedValueOnce({
      lat: -30.06,
      lng: -51.21,
      confidence: "high",
      importance: 0.8,
      displayName: "Nova Rua, 99, Porto Alegre",
    });
    mocks.findFirst.mockResolvedValueOnce(SYNTHETIC_CURRENT);
    mocks.findFirst.mockResolvedValueOnce({
      ...SYNTHETIC_CURRENT,
      rua: "Nova Rua",
      numero: "99",
      lat: -30.06,
      lng: -51.21,
    });

    const res = await PATCH(
      makeRequest({ base: { rua: "Nova Rua", numero: "99" } }),
      makeParams(PATIENT_ID),
    );

    expect(res.status).toBe(200);
    expect(mocks.geocodeWithCache).toHaveBeenCalledTimes(1);
    const geocodeArg = mocks.geocodeWithCache.mock.calls[0]?.[0];
    expect(geocodeArg).toMatchObject({
      street: "Nova Rua",
      number: "99",
      city: "Porto Alegre",
    });

    const setArg = mocks.setSpy.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(setArg.lat).toBe(-30.06);
    expect(setArg.lng).toBe(-51.21);
    expect(setArg.geocodeStatus).toBe("geocoded");
  });

  it("address change (unresolvable) — 422 + requiresManualPin, no write", async () => {
    mocks.geocodeWithCache.mockResolvedValueOnce(null);

    const res = await PATCH(
      makeRequest({ base: { rua: "Rua Gibberish Zzzz", numero: "0" } }),
      makeParams(PATIENT_ID),
    );

    expect(res.status).toBe(422);
    const body = (await res.json()) as { requiresManualPin?: boolean };
    expect(body.requiresManualPin).toBe(true);
    expect(mocks.transactionSpy).not.toHaveBeenCalled();
  });

  it("direct coord update — status='manual', no geocode call", async () => {
    mocks.findFirst.mockResolvedValueOnce(SYNTHETIC_CURRENT);
    mocks.findFirst.mockResolvedValueOnce({
      ...SYNTHETIC_CURRENT,
      lat: -30.07,
      lng: -51.22,
      geocodeStatus: "manual",
    });

    const res = await PATCH(
      makeRequest({ base: { lat: -30.07, lng: -51.22 } }),
      makeParams(PATIENT_ID),
    );

    expect(res.status).toBe(200);
    expect(mocks.geocodeWithCache).not.toHaveBeenCalled();

    const setArg = mocks.setSpy.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(setArg.lat).toBe(-30.07);
    expect(setArg.lng).toBe(-51.22);
    expect(setArg.geocodeStatus).toBe("manual");
  });

  it("gestantes extension patch — upserts via onConflictDoUpdate", async () => {
    mocks.findFirst.mockResolvedValueOnce(SYNTHETIC_CURRENT);
    mocks.findFirst.mockResolvedValueOnce({
      ...SYNTHETIC_CURRENT,
      gestantes: { ...SYNTHETIC_CURRENT.gestantes!, dpp: "2026-09-01" },
    });

    const res = await PATCH(
      makeRequest({ gestantes: { dpp: "01/09/2026" } }),
      makeParams(PATIENT_ID),
    );

    expect(res.status).toBe(200);
    expect(mocks.insertSpy).toHaveBeenCalledTimes(1);
    // values should carry patientId + ISO-normalized dpp.
    const valuesArg = mocks.values.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(valuesArg.patientId).toBe(PATIENT_ID);
    expect(valuesArg.dpp).toBe("2026-09-01");

    const onConflictArg = mocks.onConflictDoUpdate.mock.calls[0]?.[0] as {
      set: Record<string, unknown>;
    };
    expect(onConflictArg.set.dpp).toBe("2026-09-01");
  });
});
