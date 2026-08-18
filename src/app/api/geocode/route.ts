/**
 * POST /api/geocode
 *
 * Body: { rua: string; numero?: string; bairro?: string }
 * Returns geocoded coordinates from Nominatim.
 *
 * The route hits Nominatim directly; there is no server-side coordinate cache.
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
