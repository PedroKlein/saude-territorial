/**
 * POST /api/routes
 *
 * Proxies route calculation to OSRM.
 *
 * Body: {
 *   waypoints: Array<{ lat: number; lng: number }>,
 *   profile: "foot" | "car",
 * }
 * Response: RouteResult { distance, duration, geometry }
 *
 * The route follows the ordered waypoint list. Minimum 2 waypoints.
 * Maximum 25 (OSRM's public-server default cap; also caps abuse cost).
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { getRoute } from "@/lib/routing/client";
import type { RouteProfile } from "@/types/routing";

const CoordSchema = z.object({
  lat: z.number().finite().gte(-90).lte(90),
  lng: z.number().finite().gte(-180).lte(180),
});

const BodySchema = z.object({
  waypoints: z.array(CoordSchema).min(2, "at least 2 waypoints required").max(25),
  profile: z.enum(["foot", "car"]),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json(
      { error: "Não autenticado. Faça login para continuar." },
      { status: 401 },
    );
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Corpo da requisição inválido." },
      { status: 400 },
    );
  }

  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Corpo da requisição inválido.",
        details: parsed.error.issues,
      },
      { status: 400 },
    );
  }

  const { waypoints, profile } = parsed.data;

  try {
    const result = await getRoute(waypoints, profile as RouteProfile);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "Falha ao calcular rota. Tente novamente." },
      { status: 502 },
    );
  }
}
