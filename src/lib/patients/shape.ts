/**
 * `shape` — response shaping helper shared by POST /api/patients and
 * PATCH /api/patients/[id].
 *
 * Converts a Drizzle row with eager-loaded extension joins into the flat
 * `dd/MM/yyyy` envelope that `usePatientData` already consumes.  One patient
 * may appear in multiple output slots when it carries multiple extensions.
 *
 * LGPD: this module emits patient data to callers that are already
 * authenticated.  It never writes to logs.
 */

import type { Patient } from "@/db/schema/patients";
import type { GestanteData } from "@/db/schema/gestantes";
import type { TuberculoseData } from "@/db/schema/tuberculose";
import type { HasData } from "@/db/schema/has";

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

/** ISO `YYYY-MM-DD` → Brazilian `dd/MM/yyyy`. Returns null for null/malformed input. */
export function toBRDate(iso: string | Date | null | undefined): string | null {
  if (!iso) return null;
  const s =
    iso instanceof Date
      ? iso.toISOString().slice(0, 10)
      : String(iso).slice(0, 10);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : null;
}

/** Timestamp → dd/MM/yyyy (drops time portion). */
export function timestampToBRDate(
  value: Date | string | null | undefined,
): string | null {
  if (!value) return null;
  const iso = value instanceof Date ? value.toISOString() : String(value);
  return toBRDate(iso.slice(0, 10));
}

/** Weeks between DUM and today.  Null if DUM missing/invalid. */
export function computeIg(dumIso: string | null | undefined): number | null {
  if (!dumIso) return null;
  const dum = new Date(dumIso);
  if (isNaN(dum.getTime())) return null;
  const ms = Date.now() - dum.getTime();
  return Math.floor(ms / (7 * 24 * 60 * 60 * 1000));
}

// ---------------------------------------------------------------------------
// Loaded type — a Patient row with its extension joins populated
// ---------------------------------------------------------------------------

/**
 * A patient row with all three extension relations eagerly loaded.
 * Matches the shape returned by:
 *   db.query.patients.findFirst({ with: { gestantes: true, tuberculose: true, has: true } })
 */
export interface Loaded extends Patient {
  gestantes: GestanteData | null;
  tuberculose: TuberculoseData | null;
  has: HasData | null;
}

// ---------------------------------------------------------------------------
// shape — produces the flat GET-style envelope
// ---------------------------------------------------------------------------

/** Response shape returned by mutation routes (POST, PATCH). */
export interface PatientShape {
  gestantes?: Record<string, unknown>;
  tuberculose?: Record<string, unknown>;
  hipertensao?: Record<string, unknown>;
}

export function shape(p: Loaded): PatientShape {
  const baseRecord = {
    id: p.id,
    cns: p.cns,
    nomeCompleto: p.nomeCompleto,
    dataNascimento: p.dataNascimento,
    idade: p.idade,
    telefone: p.telefone,
    rua: p.rua,
    numero: p.numero,
    complemento: p.complemento,
    bairro: p.bairro,
    microarea: p.microarea,
    lat: p.lat,
    lng: p.lng,
    geocodeStatus: p.geocodeStatus,
    geocodeReference: p.geocodeReference,
    vulnerabilidades: p.vulnerabilidades,
  };

  const out: PatientShape = {};

  if (p.gestantes) {
    const g = p.gestantes;
    out.gestantes = {
      ...baseRecord,
      dum: toBRDate(g.dum),
      dpp: toBRDate(g.dpp),
      risco: g.risco,
      ig: computeIg(g.dum),
      igAbertura: g.igAbertura,
      dataUltimaConsulta: toBRDate(g.dataUltimaConsulta),
      dataProximaConsulta: toBRDate(g.dataProximaConsulta),
      numeroConsultas: g.numeroConsultas,
      hasPreviaTag: g.hasPreviaTag,
      diabetesPreviaTag: g.diabetesPreviaTag,
      pressaoArterial: g.pressaoArterial,
      acompanhamentoPesoAltura: g.acompanhamentoPesoAltura,
      numeroVisitasDomiciliares: g.numeroVisitasDomiciliares,
      avaliacaoOdontoStatus: g.avaliacaoOdontoStatus,
      vacinaDtpa: g.vacinaDtpa,
      trPrimeiroTri: g.trPrimeiroTri,
      trSegundoTri: g.trSegundoTri,
      trTerceiroTri: g.trTerceiroTri,
      resultadoTr: g.resultadoTr,
      isPuerpera: g.isPuerpera,
      isExposta: g.isExposta,
      dataUltimaAtualizacao: timestampToBRDate(
        g.updatedAt > p.updatedAt ? g.updatedAt : p.updatedAt,
      ),
    };
  }

  if (p.tuberculose) {
    const t = p.tuberculose;
    out.tuberculose = {
      ...baseRecord,
      tipo: t.tipo,
      galRegistro: t.galRegistro,
      baciloscopiaResultado: t.baciloscopiaResultado,
      trmResultado: t.trmResultado,
      culturaMTuberculosis: t.culturaMTuberculosis,
      formaClinica: t.formaClinica,
      tipoEntrada: t.tipoEntrada,
      esquema: t.esquema,
      dataInicio: toBRDate(t.dataInicio),
      tdoStatus: t.tdoStatus,
      encerramentoMotivo: t.encerramentoMotivo,
      encerramentoData: toBRDate(t.encerramentoData),
      outrosExames: t.outrosExames,
      baciloscopia: t.baciloscopiaResultado,
      trm: t.trmResultado,
      cultura: t.culturaMTuberculosis,
      dataUltimaAtualizacao: timestampToBRDate(
        t.updatedAt > p.updatedAt ? t.updatedAt : p.updatedAt,
      ),
    };
  }

  if (p.has) {
    const h = p.has;
    out.hipertensao = {
      ...baseRecord,
      dataUltimaConsulta: toBRDate(h.dataUltimaConsulta),
      dataProximaConsulta: toBRDate(h.dataProximaConsulta),
      dataUltimaAfericaoPa: toBRDate(h.dataUltimaAfericaoPa),
      pressaoArterial: h.pressaoArterial,
      registroNotas: h.registroNotas,
      encaminhamentos: h.encaminhamentos,
      dataUltimaAtualizacao: timestampToBRDate(
        h.updatedAt > p.updatedAt ? h.updatedAt : p.updatedAt,
      ),
    };
  }

  return out;
}
