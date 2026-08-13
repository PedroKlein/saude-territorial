import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import Database from "better-sqlite3";

/**
 * Better Auth configuration — identity only.
 *
 * As of the pivot (see docs/adr/ADR-001-drop-sheets.md), this app no longer
 * calls Google Sheets on behalf of the user. The OAuth scope is reduced to
 * `openid email profile`, and there is no Google access token to refresh
 * or expose for API calls.
 *
 * If we ever add a "sign in with Google" that needs additional scopes
 * (Sheets import, Drive, etc.), reintroduce them via Better Auth's
 * incremental-scope pattern rather than requesting them upfront.
 */
const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

if (!clientId || !clientSecret) {
  // Fail fast at import time: identity-only Better Auth is useless without
  // Google creds, and silent misconfiguration produces cryptic OAuth loops.
  throw new Error(
    "GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set in the environment.",
  );
}

export const auth = betterAuth({
  database: new Database("./auth.db"),
  plugins: [nextCookies()],
  socialProviders: {
    google: {
      clientId,
      clientSecret,
      scope: ["openid", "email", "profile"],
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
});
