/**
 * DEV-ONLY: Create an authenticated session for automated testing (agent_browser).
 *
 * Uses Better Auth's internal context to properly sign the session cookie.
 * Also refreshes the Google access token using the stored refresh token.
 *
 * ONLY available when NODE_ENV === 'development'.
 * NEVER deploy this to production.
 *
 * Usage: Navigate to http://localhost:3000/api/auth/dev-session in the browser.
 * The response sets a signed session cookie. Subsequent requests will be authenticated.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import Database from "better-sqlite3";
import { google } from "googleapis";
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
    // Get user and account info
    const account = db
      .prepare(
        `SELECT a.id as accountId, a.userId, a.refreshToken, u.email, u.name
         FROM account a
         JOIN user u ON u.id = a.userId
         WHERE a.providerId = 'google'
         LIMIT 1`
      )
      .get() as {
      accountId: string;
      userId: string;
      refreshToken: string;
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

    // Refresh the Google access token
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    oauth2Client.setCredentials({ refresh_token: account.refreshToken });

    const { credentials } = await oauth2Client.refreshAccessToken();
    const newAccessToken = credentials.access_token;
    const expiresAt = credentials.expiry_date
      ? new Date(credentials.expiry_date).toISOString()
      : new Date(Date.now() + 3600 * 1000).toISOString();

    // Update the access token in the database
    db.prepare(
      `UPDATE account SET accessToken = ?, accessTokenExpiresAt = ? WHERE id = ?`
    ).run(newAccessToken, expiresAt, account.accountId);

    // Sign the session token using HMAC-SHA256 (same as better-call's signCookieValue)
    const secret = process.env.BETTER_AUTH_SECRET!;
    const key = crypto.createHmac("sha256", secret);
    key.update(session.token);
    const signature = key.digest("base64");
    const signedToken = encodeURIComponent(`${session.token}.${signature}`);

    // Set the signed cookie
    const response = NextResponse.json({
      success: true,
      userId: account.userId,
      email: account.email,
      tokenRefreshed: true,
    });

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
