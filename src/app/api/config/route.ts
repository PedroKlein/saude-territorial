/**
 * API route for user's spreadsheet configuration.
 *
 * POST /api/config — Save spreadsheet ID
 * GET  /api/config — Load saved spreadsheet ID
 *
 * Uses SQLite (same as Better Auth) for local persistence.
 * LGPD: Only stores spreadsheet IDs (no patient data).
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import Database from "better-sqlite3";
import path from "path";

function getDb() {
  return new Database(path.join(process.cwd(), "auth.db"));
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const db = getDb();
  try {
    // Ensure table exists
    db.exec(`CREATE TABLE IF NOT EXISTS user_config (
      user_id TEXT PRIMARY KEY,
      spreadsheet_id TEXT,
      updated_at TEXT DEFAULT (datetime('now'))
    )`);

    const row = db.prepare("SELECT spreadsheet_id FROM user_config WHERE user_id = ?").get(session.user.id) as { spreadsheet_id: string } | undefined;

    return NextResponse.json({
      spreadsheetId: row?.spreadsheet_id ?? null,
    });
  } finally {
    db.close();
  }
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

  const db = getDb();
  try {
    db.exec(`CREATE TABLE IF NOT EXISTS user_config (
      user_id TEXT PRIMARY KEY,
      spreadsheet_id TEXT,
      updated_at TEXT DEFAULT (datetime('now'))
    )`);

    db.prepare(
      `INSERT OR REPLACE INTO user_config (user_id, spreadsheet_id, updated_at) VALUES (?, ?, datetime('now'))`
    ).run(session.user.id, spreadsheetId);

    return NextResponse.json({ success: true });
  } finally {
    db.close();
  }
}
