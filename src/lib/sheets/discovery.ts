/**
 * Google Sheets tab auto-discovery.
 *
 * Uses the Sheets API `spreadsheets.get` metadata endpoint to enumerate
 * visible tabs without reading any patient data.
 */

import { google } from "googleapis";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TabMetadata {
  title: string;
  rowCount: number;
  columnCount: number;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Discovers all visible tabs in a Google Spreadsheet.
 *
 * "Visible" means: the tab title does not start with `_`.
 * Tabs prefixed with `_` are reserved for configuration / internal use.
 *
 * @param auth           - An authenticated googleapis auth client (OAuth2Client or equivalent).
 * @param spreadsheetId  - The Google Sheets spreadsheet ID.
 * @returns              An array of tab metadata objects (title, rowCount, columnCount).
 */
export async function discoverTabs(
  auth: unknown,
  spreadsheetId: string
): Promise<TabMetadata[]> {
  const sheets = google.sheets({ version: "v4", auth: auth as Parameters<typeof google.sheets>[0]["auth"] });

  const response = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "sheets.properties.title,sheets.properties.gridProperties",
  });

  const rawSheets = response.data.sheets ?? [];

  return rawSheets
    .filter((sheet) => {
      const title = sheet.properties?.title;
      return typeof title === "string" && title.length > 0 && !title.startsWith("_");
    })
    .map((sheet) => ({
      title: sheet.properties!.title as string,
      rowCount: sheet.properties?.gridProperties?.rowCount ?? 0,
      columnCount: sheet.properties?.gridProperties?.columnCount ?? 0,
    }));
}
