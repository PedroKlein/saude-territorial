/**
 * POST /api/routes
 *
 * Proxies route calculation to OSRM.
 *
 * Body: { fromLat, fromLng, toLat, toLng, profile: "foot" | "car" }
 * Response: RouteResult { distance, duration, geometry }
 */

import { NextRequest, NextResponse } from "next/server";
import { getRoute } from "@/lib/routing/client";
import type { RouteProfile } from "@/types/routing";

const VALID_PROFILES: RouteProfile[] = ["foot", "car"];

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: {
    fromLat?: number;
    fromLng?: number;
    toLat?: number;
    toLng?: number;
    profile?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Corpo da requisição inválido." },
      { status: 400 }
    );
  }

  const { fromLat, fromLng, toLat, toLng, profile } = body;

  // Validate required fields
  if (
    fromLat == null ||
    fromLng == null ||
    toLat == null ||
    toLng == null ||
    !profile
  ) {
    return NextResponse.json(
      { error: "Campos obrigatórios: fromLat, fromLng, toLat, toLng, profile." },
      { status: 400 }
    );
  }

  if (!VALID_PROFILES.includes(profile as RouteProfile)) {
    return NextResponse.json(
      { error: "Profile inválido. Use 'foot' ou 'car'." },
      { status: 400 }
    );
  }

  try {
    const result = await getRoute(
      { lat: fromLat, lng: fromLng },
      { lat: toLat, lng: toLng },
      profile as RouteProfile
    );

    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "Falha ao calcular rota. Tente novamente." },
      { status: 502 }
    );
  }
}
