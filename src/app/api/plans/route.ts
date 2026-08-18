/**
 * POST /api/plans — create a new daily plan with stops.
 * GET  /api/plans — list last N plans (ordered by date desc, default limit 30).
 *
 * Session-gated. Writes wrapped in a transaction. LGPD: never log patient fields.
 */

import { desc, eq, count } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { db } from "@/db/client";
import { dailyPlans, dailyPlanStops } from "@/db/schema/plans";

const CreatePlanSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD"),
  acsName: z.string().nullable().optional(),
  profile: z.enum(["foot", "car"]),
  notes: z.string().nullable().optional(),
  stops: z
    .array(
      z.object({
        patientId: z.uuid(),
        order: z.number().int().min(0),
      }),
    )
    .min(1, "at least one stop is required"),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json(
      { error: "Não autenticado. Faça login para continuar." },
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corpo da requisição inválido." }, { status: 400 });
  }

  const parsed = CreatePlanSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos.", details: z.flattenError(parsed.error) },
      { status: 400 },
    );
  }

  const { date, acsName, profile, notes, stops } = parsed.data;

  try {
    const result = await db.transaction(async (tx) => {
      const [plan] = await tx
        .insert(dailyPlans)
        .values({ date, acsName: acsName ?? null, profile, notes: notes ?? null })
        .returning();

      await tx.insert(dailyPlanStops).values(
        stops.map((s) => ({
          planId: plan.id,
          patientId: s.patientId,
          stopOrder: s.order,
        })),
      );

      return plan;
    });

    return NextResponse.json({ plan: result }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Erro ao salvar plano. Tente novamente." },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json(
      { error: "Não autenticado. Faça login para continuar." },
      { status: 401 },
    );
  }

  const url = new URL(request.url);
  const limitParam = url.searchParams.get("limit");
  const limit = limitParam ? Math.min(Math.max(parseInt(limitParam, 10) || 30, 1), 100) : 30;

  const rows = await db
    .select({
      id: dailyPlans.id,
      date: dailyPlans.date,
      acsName: dailyPlans.acsName,
      profile: dailyPlans.profile,
      notes: dailyPlans.notes,
      createdAt: dailyPlans.createdAt,
      stopCount: count(dailyPlanStops.stopOrder),
    })
    .from(dailyPlans)
    .leftJoin(dailyPlanStops, eq(dailyPlanStops.planId, dailyPlans.id))
    .groupBy(dailyPlans.id)
    .orderBy(desc(dailyPlans.date), desc(dailyPlans.createdAt))
    .limit(limit);

  return NextResponse.json({ plans: rows });
}
