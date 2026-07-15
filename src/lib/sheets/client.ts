/**
 * Google Sheets API v4 client.
 *
 * Provides `readSheetRange` (single range) and `batchReadTabs` (multi-tab batch).
 * Both retry on HTTP 429 (rate-limited) with exponential backoff — max 3 retries.
 *
 * LGPD: never log patient data; only log tab names, error codes, and row indices.
 */

import { google } from "googleapis";

// ---------------------------------------------------------------------------
// Error types
// ---------------------------------------------------------------------------

/**
 * Thrown when the Sheets API responds with 429 on every retry attempt.
 */
export class RateLimitError extends Error {
  constructor(message = "Rate limit exceeded after max retries") {
    super(message);
    this.name = "RateLimitError";
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Extracts the HTTP status from a googleapis error object. */
function getErrorStatus(error: unknown): number | null {
  if (error && typeof error === "object") {
    const e = error as Record<string, unknown>;
    if (e.response && typeof e.response === "object") {
      const r = e.response as Record<string, unknown>;
      if (typeof r.status === "number") return r.status;
    }
    if (typeof e.code === "number") return e.code;
    if (typeof e.status === "number") return e.status;
  }
  return null;
}

/** Returns a promise that resolves after `ms` milliseconds. */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const MAX_RETRIES = 3;

/**
 * Wraps an async Sheets API call with exponential-backoff retry on 429.
 * Non-429 errors are rethrown immediately (no retry).
 */
async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  let attempt = 0;

  while (true) {
    try {
      return await fn();
    } catch (error) {
      const status = getErrorStatus(error);

      if (status !== 429) {
        // Non-retryable — rethrow immediately
        throw error;
      }

      attempt++;
      if (attempt > MAX_RETRIES) {
        throw new RateLimitError();
      }

      // Exponential backoff: 100ms, 200ms, 400ms
      await sleep(100 * Math.pow(2, attempt - 1));
    }
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Reads a single A1-notation range from a Google Spreadsheet.
 *
 * @param auth           - Authenticated googleapis auth client.
 * @param spreadsheetId  - The Google Sheets spreadsheet ID.
 * @param range          - A1-notation range (e.g. `'Gestantes'!A1:Z100`).
 * @returns              Raw string[][] from the API (empty array when no data).
 */
export async function readSheetRange(
  auth: unknown,
  spreadsheetId: string,
  range: string
): Promise<string[][]> {
  const sheets = google.sheets({
    version: "v4",
    auth: auth as Parameters<typeof google.sheets>[0]["auth"],
  });

  const response = await withRetry(() =>
    sheets.spreadsheets.values.get({ spreadsheetId, range })
  );

  return (response.data.values ?? []) as string[][];
}

/**
 * Reads multiple tabs in a single batchGet API call.
 *
 * @param auth           - Authenticated googleapis auth client.
 * @param spreadsheetId  - The Google Sheets spreadsheet ID.
 * @param tabNames       - List of tab names to read.
 * @returns              Map<tabName, string[][]>; empty Map when tabNames is empty.
 */
export async function batchReadTabs(
  auth: unknown,
  spreadsheetId: string,
  tabNames: string[]
): Promise<Map<string, string[][]>> {
  if (tabNames.length === 0) {
    return new Map();
  }

  const sheets = google.sheets({
    version: "v4",
    auth: auth as Parameters<typeof google.sheets>[0]["auth"],
  });

  // One API call for all tabs: uses A1:ZZ to cover wide sheets
  const ranges = tabNames.map((tab) => `'${tab}'!A1:ZZ`);

  const response = await withRetry(() =>
    sheets.spreadsheets.values.batchGet({ spreadsheetId, ranges })
  );

  const result = new Map<string, string[][]>();

  (response.data.valueRanges ?? []).forEach((valueRange, index) => {
    result.set(tabNames[index], (valueRange.values ?? []) as string[][]);
  });

  return result;
}
