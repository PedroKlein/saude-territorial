/**
 * POST /api/routes/optimize
 *
 * Proxies OSRM's /trip service to reorder waypoints for minimum travel.
 * Uses source=first, destination=last so the caller's chosen anchors stay
 * put and only the middle stops are optimized. That plays nicely with a
 * priority-driven plan: keep the highest-priority visit first, chain the
 * rest efficiently.
 *
 * Body: {
 *   waypoints: Array<{ lat: number; lng: number }>,   // min 3, max 25
 *   profile: "foot" | "car",
 * }
 * Response: TripResult {
 *   order: number[]        // permutation of input indices
 *   distance: number
 *   duration: number
 *   geometry: GeoJSON.LineString
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { getTrip } from "@/lib/routing/client";
import type { RouteProfile } from "@/types/routing";

const CoordSchema = z.object({
  lat: z.number().finite().gte(-90).lte(90),
  lng: z.number().finite().gte(-180).lte(180),
});

const BodySchema = z.object({
  waypoints: z
    .array(CoordSchema)
    .min(3, "otimização exige pelo menos 3 paradas")
    .max(25),
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
      { error: "Corpo da requisição inválido.", details: parsed.error.issues },
      { status: 400 },
    );
  }

  const { waypoints, profile } = parsed.data;

  try {
    const result = await getTrip(waypoints, profile as RouteProfile);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "Falha ao otimizar rota. Tente novamente." },
      { status: 502 },
    );
  }
}
