/**
 * POST /api/geocode
 *
 * Body: { rua: string; numero?: string; bairro?: string }
 * Returns geocoded coordinates from Nominatim.
 *
 * Flow:
 *  1. Authenticate session (Better Auth)
 *  2. Validate body with Zod
 *  3. Normalize address
 *  4. Call Nominatim client → return
 *
 * Post-pivot note: coordinate cache used to live here backed by a Supabase
 * `coordinates_cache` table. Both are gone (see ADR-001). A cache will be
 * reintroduced later via Drizzle — likely as a `geocode_cache` table joined
 * to the patient's `geocode_status`.
 *
 * LGPD: only "geocoded N addresses" is safe to log. Never log street names,
 * coordinates, or any patient-identifying information.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { normalizeAddress } from "@/lib/geocoding/normalize";
import { geocode } from "@/lib/geocoding/client";

const BodySchema = z.object({
  rua: z.string().trim().min(1, "rua é obrigatório"),
  numero: z.string().optional(),
  bairro: z.string().optional(),
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
      { error: "Dados inválidos.", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const { rua, numero, bairro } = parsed.data;
  const normalized = normalizeAddress(rua, numero ?? "", bairro);

  const result = await geocode(normalized);
  if (!result) {
    return NextResponse.json(
      { error: "Endereço não encontrado no mapa." },
      { status: 404 },
    );
  }

  return NextResponse.json(result, { status: 200 });
}
