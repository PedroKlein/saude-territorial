import { eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";

import { auth } from "@/lib/auth";
import { db } from "@/db/client";
import { patients } from "@/db/schema/patients";
import { gestantesData } from "@/db/schema/gestantes";
import { tuberculoseData } from "@/db/schema/tuberculose";
import { hasData } from "@/db/schema/has";
import { PatientCreateSchema } from "@/lib/patients/schemas";
import { normalizeAddress } from "@/lib/geocoding/normalize";
import { geocodeWithCache } from "@/lib/geocoding/cache";
import { shape } from "@/lib/patients/shape";
import { isPgUniqueViolation } from "@/lib/db/errors";

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
  const s = iso instanceof Date ? iso.toISOString().slice(0, 10) : iso.slice(0, 10);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : null;
}

/** Timestamp → dd/MM/yyyy (drops time portion; the alert engine is day-granular). */
function timestampToBRDate(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const iso = value instanceof Date ? value.toISOString() : value;
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

    const gestantes: Record<string, unknown>[] = [];
    const tuberculose: Record<string, unknown>[] = [];
    const hipertensao: Record<string, unknown>[] = [];
    const semCondicao: Record<string, unknown>[] = [];

    for (const p of rows) {
      // Patients without resolved coords never render on the map — but a
      // condition-less patient must still be findable in /pacientes so the
      // ACS can add an address later. Skip only if the patient HAS a
      // condition; base-only rows fall through to sem-condicao below.
      const hasCoords =
        p.lat != null && p.lng != null && p.geocodeStatus !== "unresolved";
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- Drizzle eager relations are typed non-null but can be null at runtime when the patient has no extension row
      const hasAnyCondition = p.gestantes || p.tuberculose || p.has;
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- hasAnyCondition derives from Drizzle relations that TypeScript types as always-truthy
      if (!hasCoords && hasAnyCondition) continue;

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
        cep: p.cep,
        microarea: p.microarea,
        lat: p.lat,
        lng: p.lng,
        geocodeStatus: p.geocodeStatus,
        geocodeReference: p.geocodeReference,
        vulnerabilidades: p.vulnerabilidades,
      };

      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- Drizzle relation typed non-null; null at runtime when patient lacks this extension
      if (p.gestantes) {
        const g = p.gestantes;
        gestantes.push({
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

      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- Drizzle relation typed non-null; null at runtime when patient lacks this extension
      if (p.tuberculose) {
        const t = p.tuberculose;
        tuberculose.push({
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

      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- Drizzle relation typed non-null; null at runtime when patient lacks this extension
      if (p.has) {
        const h = p.has;
        hipertensao.push({
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

      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- Drizzle relations typed non-null; this branch is the condition-less patient path
      if (!p.gestantes && !p.tuberculose && !p.has) {
        semCondicao.push({
          ...baseRecord,
          dataUltimaAtualizacao: timestampToBRDate(p.updatedAt),
        });
      }
    }

    return NextResponse.json({
      layers: { gestantes, tuberculose, hipertensao, "sem-condicao": semCondicao },
    });
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

/**
 * POST /api/patients — create a patient + one condition extension in a single
 * transaction.
 *
 * Geocode decision:
 *   - lat + lng both present (right-click path): skip geocoding, `geocodeStatus='manual'`.
 *   - rua + numero + bairro present: run `geocodeWithCache`; 422 on failure.
 *   - neither: `geocodeStatus='unresolved'` — patient surfaces once pinned.
 *
 * CNS collision (409): the existing patient shape is returned so the client
 * can offer "adicionar condição ao paciente existente".
 *
 * LGPD: never logs CNS, name, address, or coords — error code only.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json(
      { error: "Autenticação necessária." },
      { status: 401 },
    );
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Corpo inválido." }, { status: 400 });
  }

  const parsed = PatientCreateSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos.", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const data = parsed.data;

  // Check CNS collision — return 409 with the existing patient's shape so
  // the client dialog can offer "adicionar condição".
  const existing = await db.query.patients.findFirst({
    where: eq(patients.cns, data.cns),
    with: { gestantes: true, tuberculose: true, has: true },
  });
  if (existing) {
    const attached: ("gestantes" | "tuberculose" | "hipertensao")[] = [];
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- Drizzle relation typed non-null; null at runtime when patient lacks this extension
      if (existing.gestantes) attached.push("gestantes");
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- Drizzle relation typed non-null; null at runtime when patient lacks this extension
      if (existing.tuberculose) attached.push("tuberculose");
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- Drizzle relation typed non-null; null at runtime when patient lacks this extension
      if (existing.has) attached.push("hipertensao");
    return NextResponse.json(
      {
        error: "cns_exists",
        patient: {
          ...shape(existing),
          id: existing.id,
          cns: existing.cns,
          nomeCompleto: existing.nomeCompleto,
          attached,
        },
      },
      { status: 409 },
    );
  }

  let lat: number | null = null;
  let lng: number | null = null;
  let geocodeStatus: "geocoded" | "manual" | "unresolved" = "unresolved";

  if (data.base.lat != null && data.base.lng != null) {
    lat = data.base.lat;
    lng = data.base.lng;
    geocodeStatus = "manual";
  } else if (data.base.rua && data.base.numero && data.base.bairro) {
    const addr = normalizeAddress(
      data.base.rua,
      data.base.numero,
      data.base.bairro,
    );
    const result = await geocodeWithCache(addr);
    if (!result) {
      // LGPD: never echo the request body (CNS, name, address) in the
      // response — the client already holds the draft locally and can
      // resubmit with manually-picked coords via basePatch.lat/lng.
      return NextResponse.json(
        {
          error: "Endereço não encontrado.",
          requiresManualPin: true,
        },
        { status: 422 },
      );
    }
    lat = result.lat;
    lng = result.lng;
    geocodeStatus = "geocoded";
  }

  let newId = "";
  try {
    await db.transaction(async (tx) => {
      const [inserted] = await tx
        .insert(patients)
        .values({
          cns: data.cns,
          nomeCompleto: data.base.nomeCompleto,
          dataNascimento: data.base.dataNascimento ?? null,
          idade: data.base.idade ?? null,
          telefone: data.base.telefone ?? null,
          rua: data.base.rua ?? null,
          numero: data.base.numero ?? null,
          complemento: data.base.complemento ?? null,
          bairro: data.base.bairro ?? null,
          cep: data.base.cep ?? null,
          microarea: data.base.microarea ?? null,
          lat,
          lng,
          geocodeStatus,
          geocodeReference: data.base.geocodeReference ?? null,
          vulnerabilidades: data.base.vulnerabilidades ?? null,
          createdBy: session.user.id,
          updatedBy: session.user.id,
        })
        .returning({ id: patients.id });
      newId = inserted.id;
      if (data.condicao === "gestantes") {
        await tx.insert(gestantesData).values({
          patientId: newId,
          ...(data.gestantes ?? {}),
        });
      } else if (data.condicao === "tuberculose") {
        await tx.insert(tuberculoseData).values({
          patientId: newId,
          ...(data.tuberculose ?? {}),
        });
      } else if (data.condicao === "hipertensao") {
        await tx.insert(hasData).values({
          patientId: newId,
          ...(data.hipertensao ?? {}),
        });
      }
      // No condition provided → base-only patient (valid since #8).
    });
  } catch (err) {
    const code = err instanceof Error ? err.name : "UnknownError";
    // Postgres unique_violation (23505) reaches us when a concurrent POST
    // squeezed in between our findFirst() collision check and this insert.
    // Surface as 409 so the client's normal collision-handler path takes
    // over instead of the generic 500 "try again" toast. LGPD-safe: the
    // response doesn't echo the request body — the client already has
    // the CNS locally to render the collision UI.
    if (isPgUniqueViolation(err)) {
      return NextResponse.json(
        { error: "cns_exists" },
        { status: 409 },
      );
    }
    console.error(`[api/patients:POST] failed (${code})`);
    return NextResponse.json(
      { error: "Erro ao criar. Tente novamente." },
      { status: 500 },
    );
  }

  // Re-read the full row so the response mirrors the GET/PATCH envelope.
  const created = await db.query.patients.findFirst({
    where: eq(patients.id, newId),
    with: { gestantes: true, tuberculose: true, has: true },
  });

  if (!created) {
    return NextResponse.json(
      { error: "Erro ao criar. Tente novamente." },
      { status: 500 },
    );
  }

  return NextResponse.json({ patient: { id: newId, ...shape(created) } }, { status: 201 });
}
