/**
 * POST /api/geocode
 *
 * Accepts { rua: string; numero?: string } in the request body.
 * Returns geocoded coordinates from the Supabase cache or Nominatim.
 *
 * Flow:
 *  1. Authenticate session (Better Auth)
 *  2. Validate request body
 *  3. Normalize address
 *  4. Check Supabase cache → return cached result if present
 *  5. Call Nominatim client → store result in cache → return
 *
 * LGPD: Only "geocoded N addresses" is safe to log.  Never log street names,
 * coordinates, or any patient-identifying information.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { normalizeAddress } from "@/lib/geocoding/normalize";
import {
  getCachedCoordinates,
  upsertCachedCoordinates,
} from "@/lib/geocoding/cache";
import { geocode } from "@/lib/geocoding/client";

interface GeocodeRequestBody {
  rua?: unknown;
  numero?: unknown;
  bairro?: unknown;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  // 1. Authenticate
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json(
      { error: "Não autenticado. Faça login para continuar." },
      { status: 401 }
    );
  }

  // 2. Validate body
  let body: GeocodeRequestBody;
  try {
    body = (await request.json()) as GeocodeRequestBody;
  } catch {
    return NextResponse.json(
      { error: "Corpo da requisição inválido." },
      { status: 400 }
    );
  }

  if (typeof body.rua !== "string" || body.rua.trim() === "") {
    return NextResponse.json(
      { error: "Campo obrigatório: rua." },
      { status: 400 }
    );
  }

  const rua = body.rua;
  const numero = typeof body.numero === "string" ? body.numero : "";
  const bairro =
    typeof body.bairro === "string" ? body.bairro : undefined;

  // 3. Normalize
  const normalized = normalizeAddress(rua, numero, bairro);

  // 4. Cache lookup
  const cached = await getCachedCoordinates(normalized);
  if (cached) {
    return NextResponse.json(cached, { status: 200 });
  }

  // 5. Nominatim lookup
  const result = await geocode(normalized);
  if (!result) {
    return NextResponse.json(
      { error: "Endereço não encontrado no mapa." },
      { status: 404 }
    );
  }

  // Store in cache (fire-and-forget on failure — don't break the response)
  await upsertCachedCoordinates(normalized, result);

  return NextResponse.json(result, { status: 200 });
}
