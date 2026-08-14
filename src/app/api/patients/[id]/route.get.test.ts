/**
 * Tests for GET /api/patients/[id] (unified single-patient endpoint).
 *
 * Powers the UP-2.2 unified `PatientDetailPanel`. Auth + DB mocked at the
 * module boundary; no real IO.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  findFirst: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: mocks.getSession } },
}));

vi.mock("@/db/client", () => ({
  db: { query: { patients: { findFirst: mocks.findFirst } } },
}));

// Module under test — import AFTER mocks.
import { GET } from "@/app/api/patients/[id]/route";
import { NextRequest } from "next/server";

const PATIENT_ID = "synth-get-uuid-1";

const BASE = {
  id: PATIENT_ID,
  cns: "100000000015000",
  nomeCompleto: "PACIENTE_SINTETICO_GET",
  dataNascimento: "1990-01-01",
  idade: 35,
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
  updatedAt: new Date("2026-01-05T00:00:00Z"),
  createdBy: null,
  updatedBy: null,
};

function makeRequest(): NextRequest {
  return new NextRequest("http://localhost/api/patients/x", { method: "GET" });
}
function makeParams(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/patients/[id] — unified shape", () => {
  it("401 when unauthenticated", async () => {
    mocks.getSession.mockResolvedValue(null);
    const res = await GET(makeRequest(), makeParams(PATIENT_ID));
    expect(res.status).toBe(401);
  });

  it("404 when the row is missing", async () => {
    mocks.getSession.mockResolvedValue({ user: { id: "u1" } });
    mocks.findFirst.mockResolvedValue(undefined);
    const res = await GET(makeRequest(), makeParams(PATIENT_ID));
    expect(res.status).toBe(404);
  });

  it("200 with condition blocks null for a base-only patient", async () => {
    mocks.getSession.mockResolvedValue({ user: { id: "u1" } });
    mocks.findFirst.mockResolvedValue({
      ...BASE,
      gestantes: null,
      tuberculose: null,
      has: null,
    });
    const res = await GET(makeRequest(), makeParams(PATIENT_ID));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.patient.id).toBe(PATIENT_ID);
    expect(body.patient.gestante).toBeNull();
    expect(body.patient.tuberculose).toBeNull();
    expect(body.patient.has).toBeNull();
    expect(body.patient.updatedAt).toBe("05/01/2026");
  });

  it("200 with gestante and computed IG when the extension row exists", async () => {
    mocks.getSession.mockResolvedValue({ user: { id: "u1" } });
    // 100 days before "today" — IG in weeks ~= 14
    const dum = new Date();
    dum.setDate(dum.getDate() - 100);
    const dumIso = dum.toISOString().slice(0, 10);

    mocks.findFirst.mockResolvedValue({
      ...BASE,
      gestantes: {
        patientId: PATIENT_ID,
        dum: dumIso,
        dpp: "2026-08-08",
        risco: "alto",
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
        updatedAt: new Date("2026-01-04T00:00:00Z"),
      },
      tuberculose: null,
      has: null,
    });
    const res = await GET(makeRequest(), makeParams(PATIENT_ID));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.patient.gestante).not.toBeNull();
    expect(body.patient.gestante.risco).toBe("alto");
    // 100 days // 7 = 14 weeks
    expect(body.patient.gestante.ig).toBe(14);
    expect(body.patient.gestante.dpp).toBe("08/08/2026");
    expect(body.patient.tuberculose).toBeNull();
    expect(body.patient.has).toBeNull();
  });
});
