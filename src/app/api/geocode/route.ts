/**
 * POST /api/geocode
 *
 * Accepts { rua: string; numero?: string; bairro?: string } in the request body.
 * Returns geocoded coordinates from Nominatim.
 *
 * Flow:
 *  1. Authenticate session (Better Auth)
 *  2. Validate request body
 *  3. Normalize address
 *  4. Call Nominatim client → return
 *
 * Post-pivot note: a coordinate cache used to live here backed by a Supabase
 * `coordinates_cache` table. Both are gone (see ADR-001). Caching will be
 * reintroduced during pivot execution via Drizzle — likely as a `geocode_cache`
 * table joined to the patient's `geocode_status`.
 *
 * LGPD: only "geocoded N addresses" is safe to log. Never log street names,
 * coordinates, or any patient-identifying information.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { normalizeAddress } from "@/lib/geocoding/normalize";
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
  const bairro = typeof body.bairro === "string" ? body.bairro : undefined;

  // 3. Normalize
  const normalized = normalizeAddress(rua, numero, bairro);

  // 4. Nominatim lookup
  const result = await geocode(normalized);
  if (!result) {
    return NextResponse.json(
      { error: "Endereço não encontrado no mapa." },
      { status: 404 }
    );
  }

  return NextResponse.json(result, { status: 200 });
}
