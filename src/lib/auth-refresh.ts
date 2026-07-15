/**
 * Google Sheets API call wrapper with automatic token refresh on 401.
 *
 * Flow:
 *   1. Execute the API call with current access token
 *   2. If 401 → get fresh token via Better Auth → retry once
 *   3. If retry also fails → throw (caller should return 401 to client)
 *
 * LGPD: Never log token values. Only log error codes.
 */

import { google } from "googleapis";
import { getGoogleAccessToken } from "@/lib/auth";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export class TokenExpiredError extends Error {
  constructor(message = "Token refresh failed — session expired") {
    super(message);
    this.name = "TokenExpiredError";
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Extracts HTTP status from googleapis error. */
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

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Creates a fresh OAuth2 client with a valid access token.
 * If the current token is expired, Better Auth refreshes it automatically.
 *
 * @throws TokenExpiredError if no token can be obtained (refresh failed)
 */
export async function createAuthenticatedClient() {
  let accessToken: string;
  try {
    accessToken = await getGoogleAccessToken();
  } catch {
    throw new TokenExpiredError();
  }

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });
  return oauth2Client;
}

/**
 * Executes a Sheets API call with automatic 401 retry.
 *
 * If the first call returns 401, refreshes the token and retries once.
 * Non-401 errors are rethrown immediately.
 *
 * @param fn - Receives an authenticated OAuth2 client, returns API result.
 * @throws TokenExpiredError if retry also fails with 401
 */
export async function withTokenRefresh<T>(
  fn: (auth: ReturnType<typeof google.auth.OAuth2.prototype.setCredentials> extends void ? unknown : unknown) => Promise<T>
): Promise<T> {
  // First attempt
  const client = await createAuthenticatedClient();
  try {
    return await fn(client);
  } catch (error) {
    const status = getErrorStatus(error);
    if (status !== 401) throw error;
  }

  // Token was stale — refresh and retry once
  const refreshedClient = await createAuthenticatedClient();
  try {
    return await fn(refreshedClient);
  } catch (error) {
    const status = getErrorStatus(error);
    if (status === 401) {
      throw new TokenExpiredError();
    }
    throw error;
  }
}
