/**
 * GET    /api/plans/[id] — load a single plan with its ordered stops.
 * DELETE /api/plans/[id] — remove a saved plan (cascades to stops).
 *
 * Session-gated. GET returns:
 *   { plan: { id, date, acsName, profile, notes, createdAt, stops: {…}[] } }
 * DELETE returns 204 on success, 404 if the plan does not exist.
 *
 * LGPD: no patient PII returned or logged here; the client re-fetches
 * patient details via usePatientData when reloading a plan.
 */
import { NextResponse, type NextRequest } from "next/server";
import { eq, asc } from "drizzle-orm";
import { dailyPlans, dailyPlanStops } from "@/db/schema/plans";
import { isUuid } from "@/lib/db/errors";
import { auth } from "@/lib/auth";
import { db } from "@/db/client";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json(
      { error: "Não autenticado. Faça login para continuar." },
      { status: 401 },
    );
  }
  const { id } = await params;
  if (!isUuid(id)) {
    return NextResponse.json({ error: "Plano não encontrado." }, { status: 404 });
  }

  const plan = await db
    .select()
    .from(dailyPlans)
    .where(eq(dailyPlans.id, id))
    .limit(1)
    .then((rows) => rows[0] ?? null);
  if (!plan) {
    return NextResponse.json({ error: "Plano não encontrado." }, { status: 404 });
  }

  const stops = await db
    .select({ patientId: dailyPlanStops.patientId, order: dailyPlanStops.stopOrder })
    .from(dailyPlanStops)
    .where(eq(dailyPlanStops.planId, id))
    .orderBy(asc(dailyPlanStops.stopOrder));

  return NextResponse.json({ plan: { ...plan, stops } });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json(
      { error: "Não autenticado. Faça login para continuar." },
      { status: 401 },
    );
  }

  const { id } = await params;
  if (!isUuid(id)) {
    return NextResponse.json({ error: "Plano não encontrado." }, { status: 404 });
  }

  // Rely on the ON DELETE CASCADE on daily_plan_stops.plan_id to sweep
  // stop rows atomically at the database level.
  const deleted = await db
    .delete(dailyPlans)
    .where(eq(dailyPlans.id, id))
    .returning({ id: dailyPlans.id });

  if (deleted.length === 0) {
    return NextResponse.json({ error: "Plano não encontrado." }, { status: 404 });
  }

  return new NextResponse(null, { status: 204 });
}
