/**
 * Google Sheets URL parser.
 * Extracts the spreadsheet ID from a Google Sheets URL.
 */

/**
 * Extracts the spreadsheet ID from a Google Sheets URL.
 *
 * Accepts any URL of the form:
 *   https://docs.google.com/spreadsheets/d/{id}
 *   https://docs.google.com/spreadsheets/d/{id}/edit
 *   https://docs.google.com/spreadsheets/d/{id}/edit#gid=0
 *   https://docs.google.com/spreadsheets/d/{id}/pub
 *   etc.
 *
 * @returns The spreadsheet ID string, or null if the URL is invalid.
 */
export function extractSpreadsheetId(url: string): string | null {
  if (!url || !url.trim()) return null;

  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (!match) return null;

  const id = match[1].trim();
  if (!id) return null;

  return id;
}
