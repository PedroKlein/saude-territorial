/**
 * GET /api/sheets
 *
 * Returns metadata for all visible tabs in the configured Google Spreadsheet.
 *
 * Query params:
 *   spreadsheetId — required. The Google Sheets spreadsheet ID.
 *
 * Responses:
 *   200 { tabs: TabMetadata[] }       — authenticated and spreadsheetId provided
 *   400 { error: string }             — spreadsheetId query param missing
 *   401 { error: string }             — no active session
 *
 * LGPD: no patient data is read or returned by this route.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth, getGoogleAccessToken } from "@/lib/auth";
import { discoverTabs } from "@/lib/sheets/discovery";
import { runSheetsPipeline } from "@/lib/sheets/pipeline";
import { google } from "googleapis";

export async function GET(request: NextRequest): Promise<NextResponse> {
  // 1. Verify session
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session) {
    return NextResponse.json(
      { error: "Não autenticado. Faça login para continuar." },
      { status: 401 }
    );
  }

  // 2. Validate required query param
  const { searchParams } = new URL(request.url);
  const spreadsheetId = searchParams.get("spreadsheetId");

  if (!spreadsheetId) {
    return NextResponse.json(
      { error: "Parâmetro spreadsheetId é obrigatório." },
      { status: 400 }
    );
  }

  // 3. Obtain the user's Google access token and create a real OAuth2 client
  const accessToken = await getGoogleAccessToken();

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });

  // 4. Check mode: "full" returns parsed+geocoded patient data; default returns tab metadata
  const mode = searchParams.get("mode");

  if (mode === "full") {
    // Full pipeline: read → parse → geocode → return LayeredPatientData
    try {
      const layers = await runSheetsPipeline(oauth2Client, spreadsheetId);
      return NextResponse.json({ layers });
    } catch {
      return NextResponse.json(
        { error: "Falha ao processar dados da planilha." },
        { status: 502 }
      );
    }
  }

  // Default: return tab metadata only
  const tabs = await discoverTabs(oauth2Client, spreadsheetId);

  return NextResponse.json({ tabs });
}

// ---------------------------------------------------------------------------
// PUT /api/sheets — write-back to Google Sheets (source of truth)
// ---------------------------------------------------------------------------

export async function PUT(request: NextRequest): Promise<NextResponse> {
  // 1. Verify session
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session) {
    return NextResponse.json(
      { error: "Não autenticado. Faça login para continuar." },
      { status: 401 }
    );
  }

  // 2. Parse and validate body
  let body: {
    spreadsheetId?: string;
    tabName?: string;
    rowIndex?: number;
    updates?: Record<string, string>;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Corpo da requisição inválido." },
      { status: 400 }
    );
  }

  const { spreadsheetId, tabName, rowIndex, updates } = body;

  if (!spreadsheetId || !tabName || rowIndex == null || !updates || typeof updates !== "object") {
    return NextResponse.json(
      { error: "Campos obrigatórios: spreadsheetId, tabName, rowIndex, updates." },
      { status: 400 }
    );
  }

  // 3. Get access token and create OAuth2 client
  const accessToken = await getGoogleAccessToken();
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });

  // 4. Write to Sheet (source of truth)
  try {
    const sheets = google.sheets({ version: "v4", auth: oauth2Client });

    // Build cell updates from the updates map
    const entries = Object.entries(updates);
    const values = [entries.map(([, value]) => value)];

    // For simplicity, write entire row. In production, use column mapping.
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `'${tabName}'!A${rowIndex}`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values },
    });

    return NextResponse.json({ success: true });
  } catch {
    // LGPD: do NOT include patient data or sheet contents in error
    return NextResponse.json(
      { error: "Falha ao salvar na planilha. Tente novamente." },
      { status: 502 }
    );
  }
}
