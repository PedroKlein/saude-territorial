import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";

import { auth } from "@/lib/auth";
import { db } from "@/db/client";
import { patients } from "@/db/schema/patients";
import { gestantesData } from "@/db/schema/gestantes";
import { hasData } from "@/db/schema/has";
import { tuberculoseData } from "@/db/schema/tuberculose";
import { EXTENSION_LAYERS, type ExtensionLayer } from "@/lib/patients/schemas";
import { isUuid } from "@/lib/db/errors";

/**
 * DELETE /api/patients/[id]/conditions/[condicao]
 *
 * Removes one extension row (gestantes_data / tuberculose_data / has_data)
 * without deleting the base `patients` row. The patient may be left with
 * zero conditions — the plan explicitly permits this (T7.2).
 *
 * Bumps `patients.updated_at` + `updated_by` inside the same transaction.
 *
 * Returns 204 no-content on success.
 * Returns 400 when `condicao` is not a known extension layer.
 * Returns 404 when the patient or extension row does not exist.
 *
 * LGPD: logs error codes only; never the patient id or CNS.
 *
 * See `plans/pivot-execution.md#pe-7` (T7.2).
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; condicao: string }> },
): Promise<NextResponse> {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json(
      { error: "Autenticação necessária." },
      { status: 401 },
    );
  }

  const { id, condicao } = await params;
  if (!isUuid(id)) {
    return NextResponse.json(
      { error: "Paciente não encontrado." },
      { status: 404 },
    );
  }

  if (!(EXTENSION_LAYERS as readonly string[]).includes(condicao)) {
    return NextResponse.json(
      {
        error: `Condição inválida. Use uma de: ${EXTENSION_LAYERS.join(", ")}.`,
      },
      { status: 400 },
    );
  }

  const validCondicao = condicao as ExtensionLayer;

  let found = false;
  try {
    await db.transaction(async (tx) => {
      let deleteCount = 0;

      if (validCondicao === "gestantes") {
        const rows = await tx
          .delete(gestantesData)
          .where(eq(gestantesData.patientId, id))
          .returning({ patientId: gestantesData.patientId });
        deleteCount = rows.length;
      } else if (validCondicao === "tuberculose") {
        const rows = await tx
          .delete(tuberculoseData)
          .where(eq(tuberculoseData.patientId, id))
          .returning({ patientId: tuberculoseData.patientId });
        deleteCount = rows.length;
      } else {
        // hipertensao → has_data
        const rows = await tx
          .delete(hasData)
          .where(eq(hasData.patientId, id))
          .returning({ patientId: hasData.patientId });
        deleteCount = rows.length;
      }

      if (deleteCount === 0) return;

      found = true;

      await tx
        .update(patients)
        .set({ updatedAt: new Date(), updatedBy: session.user.id })
        .where(eq(patients.id, id));
    });
  } catch (err) {
    const code = err instanceof Error ? err.name : "UnknownError";
    console.error(`[api/patients:DELETE-condition] failed (${code})`);
    return NextResponse.json(
      { error: "Erro ao remover condição. Tente novamente." },
      { status: 500 },
    );
  }

  if (!found) {
    return NextResponse.json(
      { error: "Condição não encontrada para este paciente." },
      { status: 404 },
    );
  }

  return new NextResponse(null, { status: 204 });
}
