/**
 * DEV-ONLY: Create an authenticated session for automated testing (agent_browser).
 *
 * Uses Better Auth's internal context to properly sign the session cookie.
 *
 * ONLY available when NODE_ENV === 'development'.
 * NEVER deploy this to production.
 *
 * Usage: Navigate to http://localhost:3000/api/auth/dev-session in the browser.
 * The response sets a signed session cookie. Subsequent requests will be authenticated.
 *
 * Note: as of the pivot (see docs/adr/ADR-001-drop-sheets.md), this route no longer
 * refreshes Google access tokens — the app does not call Google APIs on behalf
 * of users anymore. Only the Better Auth session cookie is signed and returned.
 */

import { NextRequest, NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "path";
import crypto from "crypto";

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      { error: "This endpoint is only available in development" },
      { status: 403 }
    );
  }

  const dbPath = path.join(process.cwd(), "auth.db");
  const db = new Database(dbPath, { readonly: false });

  try {
    // Get user info (any Google-linked user will do for dev)
    const account = db
      .prepare(
        `SELECT a.id as accountId, a.userId, u.email, u.name
         FROM account a
         JOIN user u ON u.id = a.userId
         WHERE a.providerId = 'google'
         LIMIT 1`
      )
      .get() as {
      accountId: string;
      userId: string;
      email: string;
      name: string;
    } | undefined;

    if (!account) {
      return NextResponse.json(
        { error: "No Google account found in auth.db. Log in manually first." },
        { status: 404 }
      );
    }

    // Get existing session
    const session = db
      .prepare(
        `SELECT id, token, expiresAt FROM session
         WHERE userId = ? AND expiresAt > datetime('now')
         ORDER BY expiresAt DESC LIMIT 1`
      )
      .get(account.userId) as { id: string; token: string; expiresAt: string } | undefined;

    if (!session) {
      return NextResponse.json(
        { error: "No valid session. Log in manually first via /login." },
        { status: 404 }
      );
    }

    // Sign the session token using HMAC-SHA256 (same as better-call's signCookieValue)
    const secret = process.env.BETTER_AUTH_SECRET!;
    const key = crypto.createHmac("sha256", secret);
    key.update(session.token);
    const signature = key.digest("base64");
    const signedToken = encodeURIComponent(`${session.token}.${signature}`);

    // Redirect to the target page — the browser processes Set-Cookie on redirects
    const redirectTo = new URL(request.url).searchParams.get("redirect") || "/map";

    const response = NextResponse.redirect(new URL(redirectTo, request.url));

    response.cookies.set("better-auth.session_token", signedToken, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      expires: new Date(session.expiresAt),
      secure: false,
    });

    return response;
  } finally {
    db.close();
  }
}
