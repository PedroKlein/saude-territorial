/**
 * API route for user's spreadsheet configuration.
 *
 * POST /api/config — Save spreadsheet ID
 * GET  /api/config — Load saved spreadsheet ID
 *
 * LGPD: Only stores spreadsheet IDs (no patient data).
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("user_preferences")
    .select("spreadsheet_id")
    .eq("user_id", session.user.id)
    .single();

  return NextResponse.json({
    spreadsheetId: data?.spreadsheet_id ?? null,
  });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  let body: { spreadsheetId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corpo inválido." }, { status: 400 });
  }

  const { spreadsheetId } = body;
  if (!spreadsheetId || typeof spreadsheetId !== "string") {
    return NextResponse.json(
      { error: "spreadsheetId é obrigatório." },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.from("user_preferences").upsert({
    user_id: session.user.id,
    spreadsheet_id: spreadsheetId,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    return NextResponse.json(
      { error: "Falha ao salvar configuração." },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
