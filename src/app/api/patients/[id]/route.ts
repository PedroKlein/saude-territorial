import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";

import { auth } from "@/lib/auth";
import { db } from "@/db/client";
import { patients } from "@/db/schema/patients";
import { gestantesData } from "@/db/schema/gestantes";
import { hasData } from "@/db/schema/has";
import { tuberculoseData } from "@/db/schema/tuberculose";
import { geocodeWithCache } from "@/lib/geocoding/cache";
import { normalizeAddress } from "@/lib/geocoding/normalize";
import {
  ADDRESS_FIELDS,
  PatientPatchSchema,
  type BasePatch,
} from "@/lib/patients/schemas";

/**
 * PATCH /api/patients/[id] — partial update of a patient (base + extension).
 *
 * Body shape: `{ base?, gestantes?, tuberculose?, hipertensao? }` — see
 * `src/lib/patients/schemas.ts`. Each namespace maps to one table; a single
 * request may touch base + one extension.
 *
 * Address change (`rua`/`numero`/`complemento`/`bairro`) triggers Nominatim
 * geocoding via `geocodeWithCache`; success sets `geocode_status='geocoded'`.
 * Failure returns 422 with `{ requiresManualPin: true }` and the transaction
 * rolls back — no partial writes.
 *
 * Direct `base.lat` + `base.lng` bypasses geocoding and sets
 * `geocode_status='manual'` (drag-to-fix and manual-pin recovery paths).
 *
 * Session-gated (SPEC LOCKED §10). LGPD: never surfaces patient data in
 * logs; errors sanitized on the way out.
 *
 * See `plans/pivot-execution.md#pe-5` (T5.1).
 */

// ---------------------------------------------------------------------------
// Response shaping — reuses the same "flat, dd/MM/yyyy" envelope as GET.
// ---------------------------------------------------------------------------

function toBRDate(iso: string | Date | null | undefined): string | null {
  if (!iso) return null;
  const s = iso instanceof Date ? iso.toISOString().slice(0, 10) : String(iso).slice(0, 10);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : null;
}

function timestampToBRDate(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const iso = value instanceof Date ? value.toISOString() : String(value);
  return toBRDate(iso.slice(0, 10));
}

function computeIg(dumIso: string | null | undefined): number | null {
  if (!dumIso) return null;
  const dum = new Date(dumIso);
  if (isNaN(dum.getTime())) return null;
  const ms = Date.now() - dum.getTime();
  return Math.floor(ms / (7 * 24 * 60 * 60 * 1000));
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** True if any address field is present in the base patch (change intent). */
function isAddressChange(base: BasePatch | undefined): boolean {
  if (!base) return false;
  return ADDRESS_FIELDS.some((f) => Object.prototype.hasOwnProperty.call(base, f));
}

/** True if the caller supplied explicit coordinates (drag/manual pin). */
function hasDirectCoords(base: BasePatch | undefined): boolean {
  if (!base) return false;
  return base.lat !== undefined && base.lng !== undefined;
}

// ---------------------------------------------------------------------------
// PATCH handler
// ---------------------------------------------------------------------------

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json(
      { error: "Autenticação necessária." },
      { status: 401 },
    );
  }

  const { id } = await params;

  // Parse body first so an invalid shape short-circuits before any DB read.
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Corpo inválido." }, { status: 400 });
  }

  const parsed = PatientPatchSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos.", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const patch = parsed.data;
  const basePatch: BasePatch | undefined = patch.base;

  const current = await db.query.patients.findFirst({
    where: eq(patients.id, id),
    with: { gestantes: true, tuberculose: true, has: true },
  });

  if (!current) {
    return NextResponse.json(
      { error: "Paciente não encontrado." },
      { status: 404 },
    );
  }

  // ------------------------------------------------------------------------
  // Geocoding decision (happens OUTSIDE the transaction to keep the
  // transaction short — Nominatim RTT can be ~500ms, and postgres-js will
  // hold the connection idle for the duration otherwise).
  // ------------------------------------------------------------------------
  const addressChanged = isAddressChange(basePatch);
  const directCoords = hasDirectCoords(basePatch);

  type CoordResult =
    | { kind: "none" }
    | { kind: "manual"; lat: number; lng: number }
    | { kind: "geocoded"; lat: number; lng: number };

  let coord: CoordResult = { kind: "none" };

  if (directCoords) {
    coord = {
      kind: "manual",
      lat: basePatch!.lat as number,
      lng: basePatch!.lng as number,
    };
  } else if (addressChanged) {
    // Merge current + patched address fields so we geocode the resulting
    // address, not just the delta.
    const rua = basePatch?.rua !== undefined ? basePatch.rua : current.rua;
    const numero =
      basePatch?.numero !== undefined ? basePatch.numero : current.numero;
    const bairro =
      basePatch?.bairro !== undefined ? basePatch.bairro : current.bairro;

    if (!rua || rua.trim() === "") {
      return NextResponse.json(
        {
          error:
            "Endereço incompleto: informe pelo menos a rua para geocodificar.",
        },
        { status: 422 },
      );
    }

    const normalized = normalizeAddress(rua, numero ?? "", bairro ?? undefined);
    let geo: Awaited<ReturnType<typeof geocodeWithCache>> = null;
    try {
      geo = await geocodeWithCache(normalized);
    } catch (err) {
      // Network / rate-limit blip — treat as a soft failure and surface the
      // manual-pin recovery path (client will let user drop a pin).
      const code = err instanceof Error ? err.name : "UnknownError";
      console.error(`[api/patients:PATCH] geocode error (${code})`);
      return NextResponse.json(
        {
          error: "Falha ao geocodificar. Arraste o pin para posicionar.",
          requiresManualPin: true,
        },
        { status: 422 },
      );
    }

    if (!geo) {
      return NextResponse.json(
        {
          error: "Endereço não encontrado. Arraste o pin para posicionar.",
          requiresManualPin: true,
        },
        { status: 422 },
      );
    }

    coord = { kind: "geocoded", lat: geo.lat, lng: geo.lng };
  }

  // ------------------------------------------------------------------------
  // Transaction: update base + upsert relevant extension rows atomically.
  // ------------------------------------------------------------------------
  try {
    await db.transaction(async (tx) => {
      // Base update (always at least bumps updatedAt/updatedBy if any patch
      // touched base OR an extension — but we skip the write when nothing
      // in the base slice changes AND coord is unchanged; only extensions
      // touched.)
      const now = new Date();
      const userId = session.user.id;

      const wantsBaseWrite =
        basePatch !== undefined || coord.kind !== "none";

      if (wantsBaseWrite) {
        const baseUpdate: Partial<typeof patients.$inferInsert> = {
          updatedAt: now,
          updatedBy: userId,
        };

        // Copy allowed fields from the patch. `lat`/`lng` are handled via
        // the coord decision, not directly, so they're excluded here.
        if (basePatch) {
          if (basePatch.nomeCompleto !== undefined) {
            baseUpdate.nomeCompleto = basePatch.nomeCompleto;
          }
          if (basePatch.dataNascimento !== undefined) {
            baseUpdate.dataNascimento = basePatch.dataNascimento;
          }
          if (basePatch.idade !== undefined) baseUpdate.idade = basePatch.idade;
          if (basePatch.telefone !== undefined) baseUpdate.telefone = basePatch.telefone;
          if (basePatch.rua !== undefined) baseUpdate.rua = basePatch.rua;
          if (basePatch.numero !== undefined) baseUpdate.numero = basePatch.numero;
          if (basePatch.complemento !== undefined) baseUpdate.complemento = basePatch.complemento;
          if (basePatch.bairro !== undefined) baseUpdate.bairro = basePatch.bairro;
          if (basePatch.microarea !== undefined) baseUpdate.microarea = basePatch.microarea;
          if (basePatch.geocodeReference !== undefined) {
            baseUpdate.geocodeReference = basePatch.geocodeReference;
          }
          if (basePatch.vulnerabilidades !== undefined) {
            baseUpdate.vulnerabilidades = basePatch.vulnerabilidades;
          }
        }

        if (coord.kind === "manual") {
          baseUpdate.lat = coord.lat;
          baseUpdate.lng = coord.lng;
          baseUpdate.geocodeStatus = "manual";
        } else if (coord.kind === "geocoded") {
          baseUpdate.lat = coord.lat;
          baseUpdate.lng = coord.lng;
          baseUpdate.geocodeStatus = "geocoded";
        }

        await tx.update(patients).set(baseUpdate).where(eq(patients.id, id));
      }

      // Extension upserts. `set` only bumps updatedAt for the extension so
      // the API's `dataUltimaAtualizacao` (MAX(base, ext)) reflects the edit.
      // Inlined per-table because Drizzle's `$inferInsert` generics don't
      // narrow across a helper without extensive casting.
      if (patch.gestantes) {
        const values = { patientId: id, updatedAt: now, ...patch.gestantes };
        await tx
          .insert(gestantesData)
          .values(values)
          .onConflictDoUpdate({
            target: gestantesData.patientId,
            set: { ...patch.gestantes, updatedAt: now },
          });
      }
      if (patch.tuberculose) {
        const values = { patientId: id, updatedAt: now, ...patch.tuberculose };
        await tx
          .insert(tuberculoseData)
          .values(values)
          .onConflictDoUpdate({
            target: tuberculoseData.patientId,
            set: { ...patch.tuberculose, updatedAt: now },
          });
      }
      if (patch.hipertensao) {
        const values = { patientId: id, updatedAt: now, ...patch.hipertensao };
        await tx
          .insert(hasData)
          .values(values)
          .onConflictDoUpdate({
            target: hasData.patientId,
            set: { ...patch.hipertensao, updatedAt: now },
          });
      }
    });
  } catch (err) {
    const code = err instanceof Error ? err.name : "UnknownError";
    console.error(`[api/patients:PATCH] transaction failed (${code})`);
    return NextResponse.json(
      { error: "Erro ao salvar. Tente novamente." },
      { status: 500 },
    );
  }

  // Re-read the joined row so the response mirrors GET's envelope. Cheaper
  // than reshaping in-memory because we already own the round trip.
  const updated = await db.query.patients.findFirst({
    where: eq(patients.id, id),
    with: { gestantes: true, tuberculose: true, has: true },
  });

  if (!updated) {
    // Race: the row disappeared between transaction commit and read.
    return NextResponse.json(
      { error: "Paciente removido durante a atualização." },
      { status: 404 },
    );
  }

  return NextResponse.json({ patient: shape(updated) });
}


// ---------------------------------------------------------------------------
// Response shape — mirrors the flat "dd/MM/yyyy + computed IG" GET envelope.
// One patient may appear on multiple layers if it has multiple extensions.
// ---------------------------------------------------------------------------

type Loaded = NonNullable<
  Awaited<
    ReturnType<
      typeof db.query.patients.findFirst<{
        with: { gestantes: true; tuberculose: true; has: true };
      }>
    >
  >
>;

function shape(p: Loaded): {
  gestantes?: Record<string, unknown>;
  tuberculose?: Record<string, unknown>;
  hipertensao?: Record<string, unknown>;
} {
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

  const out: {
    gestantes?: Record<string, unknown>;
    tuberculose?: Record<string, unknown>;
    hipertensao?: Record<string, unknown>;
  } = {};

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
