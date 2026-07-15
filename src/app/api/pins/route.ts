/**
 * Manual pin API — allows users to place coordinates for patients
 * whose addresses failed geocoding.
 *
 * LGPD: Stores only CNS + coordinates + optional reference text.
 * No patient names or health data stored in pins.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function validatePinData(body: unknown): {
  valid: boolean;
  data?: { patient_cns: string; lat: number; lng: number; reference_text: string };
  error?: string;
} {
  if (!body || typeof body !== "object") {
    return { valid: false, error: "Corpo da requisição inválido" };
  }

  const { patient_cns, lat, lng, reference_text } = body as Record<string, unknown>;

  if (!patient_cns || typeof patient_cns !== "string") {
    return { valid: false, error: "CNS é obrigatório" };
  }
  if (typeof lat !== "number" || isNaN(lat)) {
    return { valid: false, error: "Latitude inválida" };
  }
  if (typeof lng !== "number" || isNaN(lng)) {
    return { valid: false, error: "Longitude inválida" };
  }

  return {
    valid: true,
    data: {
      patient_cns,
      lat,
      lng,
      reference_text: typeof reference_text === "string" ? reference_text : "",
    },
  };
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest): Promise<NextResponse> {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("manual_pins")
    .select("*")
    .eq("user_id", session.user.id);

  if (error) {
    return NextResponse.json(
      { error: "Erro ao buscar pins" },
      { status: 500 }
    );
  }

  return NextResponse.json({ pins: data });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const body = await request.json();
  const validation = validatePinData(body);

  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("manual_pins")
    .insert({
      user_id: session.user.id,
      patient_cns: validation.data!.patient_cns,
      lat: validation.data!.lat,
      lng: validation.data!.lng,
      reference_text: validation.data!.reference_text,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: "Erro ao salvar pin" },
      { status: 500 }
    );
  }

  return NextResponse.json({ pin: data }, { status: 201 });
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "ID é obrigatório" }, { status: 400 });
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("manual_pins")
    .delete()
    .eq("id", id)
    .eq("user_id", session.user.id);

  if (error) {
    return NextResponse.json(
      { error: "Erro ao remover pin" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
