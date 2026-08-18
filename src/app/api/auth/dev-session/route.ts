/**
 * DEV-ONLY: mint an authenticated session cookie for automated testing
 * (agent_browser / Playwright) without going through the login UI.
 *
 * Provider-agnostic: picks the first user in the local auth DB (seeded by
 * `mise run setup` as dev@local, or any user you registered) and signs a
 * session cookie for it. If that user has no live session, one is created.
 *
 * ONLY available when NODE_ENV === 'development'. NEVER deployed to production.
 *
 * Usage: navigate to http://localhost:3000/api/auth/dev-session[?redirect=/path].
 */

import { NextRequest, NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "path";
import crypto from "crypto";

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      { error: "This endpoint is only available in development" },
      { status: 403 },
    );
  }

  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "BETTER_AUTH_SECRET is not set" },
      { status: 500 },
    );
  }

  const db = new Database(path.join(process.cwd(), "auth.db"), { readonly: false });

  try {
    const user = db
      .prepare(`SELECT id, email FROM user ORDER BY createdAt ASC LIMIT 1`)
      .get() as { id: string; email: string } | undefined;

    if (!user) {
      return NextResponse.json(
        {
          error:
            "No users in auth.db. Run `mise run db:seed:user` (or register at /login) first.",
        },
        { status: 404 },
      );
    }

    const now = Date.now();
    const existing = db
      .prepare(
        `SELECT token, expiresAt FROM session WHERE userId = ? ORDER BY expiresAt DESC LIMIT 1`,
      )
      .get(user.id) as { token: string; expiresAt: string } | undefined;

    let token: string;
    if (existing && new Date(existing.expiresAt).getTime() > now) {
      token = existing.token;
    } else {
      token = crypto.randomBytes(32).toString("hex");
      const nowIso = new Date(now).toISOString();
      const expiresIso = new Date(now + 1000 * 60 * 60 * 24 * 7).toISOString();
      db.prepare(
        `INSERT INTO session (id, token, userId, expiresAt, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?)`,
      ).run(crypto.randomUUID(), token, user.id, expiresIso, nowIso, nowIso);
    }

    // Sign the session token (same scheme as better-call's signCookieValue).
    const signature = crypto.createHmac("sha256", secret).update(token).digest("base64");
    const signedToken = `${token}.${signature}`;

    const redirectTo = new URL(request.url).searchParams.get("redirect") || "/map";
    const response = NextResponse.redirect(new URL(redirectTo, request.url));
    response.cookies.set("better-auth.session_token", signedToken, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return response;
  } finally {
    db.close();
  }
}
