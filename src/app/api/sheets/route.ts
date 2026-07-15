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

  const tabs = await discoverTabs(oauth2Client, spreadsheetId);

  return NextResponse.json({ tabs });
}
