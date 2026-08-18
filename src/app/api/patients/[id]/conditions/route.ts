/**
 * POST /api/patients/[id]/conditions — attach a new condition extension to an
 * existing patient.
 *
 * Used by the 409-collision dialog: the CNS already exists but lacks the
 * selected condition row, so we insert it here rather than creating a duplicate
 * patient.
 *
 * LGPD: never logs patient identity (id, CNS, name) — error codes only.
 */

import { eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";

import { auth } from "@/lib/auth";
import { db } from "@/db/client";
import { patients } from "@/db/schema/patients";
import { gestantesData } from "@/db/schema/gestantes";
import { tuberculoseData } from "@/db/schema/tuberculose";
import { hasData } from "@/db/schema/has";
import { ConditionAttachSchema } from "@/lib/patients/schemas";
import { shape } from "@/lib/patients/shape";
import { isPgUniqueViolation, isUuid } from "@/lib/db/errors";

export async function POST(
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
  if (!isUuid(id)) {
    return NextResponse.json(
      { error: "Paciente não encontrado." },
      { status: 404 },
    );
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Corpo inválido." }, { status: 400 });
  }

  const parsed = ConditionAttachSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos.", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const body = parsed.data;

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

  if (body.condicao === "gestantes" && current.gestantes) {
    return NextResponse.json(
      { error: "condition_exists" },
      { status: 409 },
    );
  }
  if (body.condicao === "tuberculose" && current.tuberculose) {
    return NextResponse.json(
      { error: "condition_exists" },
      { status: 409 },
    );
  }
  if (body.condicao === "hipertensao" && current.has) {
    return NextResponse.json(
      { error: "condition_exists" },
      { status: 409 },
    );
  }

  try {
    await db.transaction(async (tx) => {
      await tx
        .update(patients)
        .set({ updatedAt: new Date(), updatedBy: session.user.id })
        .where(eq(patients.id, id));

      if (body.condicao === "gestantes") {
        await tx.insert(gestantesData).values({ patientId: id, ...body.data });
      } else if (body.condicao === "tuberculose") {
        await tx
          .insert(tuberculoseData)
          .values({ patientId: id, ...body.data });
      } else {
        await tx.insert(hasData).values({ patientId: id, ...body.data });
      }
    });
  } catch (err) {
    const code = err instanceof Error ? err.name : "UnknownError";
    // Race: our findFirst() said the extension wasn't attached yet, but a
    // concurrent POST attached it before we could insert. Extension tables
    // use patient_id as PRIMARY KEY, so we hit a unique_violation. Surface
    // as 409 with the same shape as the pre-tx duplicate check.
    if (isPgUniqueViolation(err)) {
      return NextResponse.json(
        { error: "condition_exists" },
        { status: 409 },
      );
    }
    console.error(`[api/patients/conditions:POST] failed (${code})`);
    return NextResponse.json(
      { error: "Erro ao adicionar condição. Tente novamente." },
      { status: 500 },
    );
  }

  const updated = await db.query.patients.findFirst({
    where: eq(patients.id, id),
    with: { gestantes: true, tuberculose: true, has: true },
  });

  if (!updated) {
    return NextResponse.json(
      { error: "Paciente removido durante a operação." },
      { status: 404 },
    );
  }

  return NextResponse.json({ patient: shape(updated) }, { status: 201 });
}
