/**
 * GET /api/plans/[id] — load a single plan with its ordered stops.
 *
 * Returns: { plan: { id, date, acsName, profile, notes, createdAt, stops: { patientId, order }[] } }
 * Session-gated. LGPD: no patient PII returned here; caller re-fetches
 * patient details via usePatientData.
 */

import { NextResponse, type NextRequest } from "next/server";
import { eq, asc } from "drizzle-orm";

import { auth } from "@/lib/auth";
import { db } from "@/db/client";
import { dailyPlans, dailyPlanStops } from "@/db/schema/plans";

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
