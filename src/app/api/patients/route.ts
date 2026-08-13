import { NextResponse, type NextRequest } from "next/server";

import { auth } from "@/lib/auth";
import { db } from "@/db/client";
import type { LayerId } from "@/config/layers.config";

/**
 * GET /api/patients — read all seeded patients joined with their condition
 * extension rows, shaped for the map's `usePatientData` hook.
 *
 * Response envelope: `{ layers: { [LayerId]: PatientRecord[] } }` — same shape
 * the client already consumes (see src/hooks/usePatientData.ts). One patient
 * with multiple conditions produces one entry per condition (one pin per
 * condition, same CNS).
 *
 * Session gate: 401 without a Better Auth session (SPEC LOCKED #10 — no RLS
 * in MVP, session gates compensate). The endpoint never leaks patient data
 * in logs or error messages (LGPD).
 *
 * Dates: emitted as `dd/MM/yyyy` because the alert engine (src/lib/alerts/engine.ts)
 * parses that format via `parseBrazilianDate`.
 */

/** ISO `YYYY-MM-DD` → Brazilian `dd/MM/yyyy`. Returns null for null/malformed input. */
function toBRDate(iso: string | Date | null | undefined): string | null {
  if (!iso) return null;
  const s = iso instanceof Date ? iso.toISOString().slice(0, 10) : String(iso).slice(0, 10);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : null;
}

/** Timestamp → dd/MM/yyyy (drops time portion; the alert engine is day-granular). */
function timestampToBRDate(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const iso = value instanceof Date ? value.toISOString() : String(value);
  return toBRDate(iso.slice(0, 10));
}

/** Weeks between DUM and today. Null if DUM missing/invalid. */
function computeIg(dumIso: string | null | undefined): number | null {
  if (!dumIso) return null;
  const dum = new Date(dumIso);
  if (isNaN(dum.getTime())) return null;
  const ms = Date.now() - dum.getTime();
  return Math.floor(ms / (7 * 24 * 60 * 60 * 1000));
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json(
      { error: "Não autenticado. Faça login para continuar." },
      { status: 401 },
    );
  }

  try {
    const rows = await db.query.patients.findMany({
      with: {
        gestantes: true,
        tuberculose: true,
        has: true,
      },
    });

    const layers: Partial<Record<LayerId, Record<string, unknown>[]>> = {
      gestantes: [],
      tuberculose: [],
      hipertensao: [],
    };

    for (const p of rows) {
      // Only pins on the map: patients with a resolved coordinate.
      if (p.lat == null || p.lng == null || p.geocodeStatus === "unresolved") continue;

      // Fields shared across every layer this patient appears in.
      const baseRecord = {
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

      if (p.gestantes) {
        const g = p.gestantes;
        layers.gestantes!.push({
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
        });
      }

      if (p.tuberculose) {
        const t = p.tuberculose;
        layers.tuberculose!.push({
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
          // Kept for backwards-compat with any UI still reading the old key.
          baciloscopia: t.baciloscopiaResultado,
          trm: t.trmResultado,
          cultura: t.culturaMTuberculosis,
          dataUltimaAtualizacao: timestampToBRDate(
            t.updatedAt > p.updatedAt ? t.updatedAt : p.updatedAt,
          ),
        });
      }

      if (p.has) {
        const h = p.has;
        layers.hipertensao!.push({
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
        });
      }
    }

    return NextResponse.json({ layers });
  } catch (err) {
    // LGPD: never surface the raw error to the client; log a code, not data.
    const code = err instanceof Error ? err.name : "UnknownError";
    console.error(`[api/patients] read failed (${code})`);
    return NextResponse.json(
      { error: "Erro ao carregar pacientes. Tente novamente." },
      { status: 500 },
    );
  }
}
