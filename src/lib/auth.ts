import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import Database from "better-sqlite3";

/**
 * Better Auth configuration.
 *
 * Local-first: email/password is always enabled so the app runs with no
 * external identity provider — see `mise run setup`, which seeds a dev user.
 *
 * Google OAuth is OPTIONAL and identity-only (openid email profile — no Sheets
 * or Drive scopes; see docs/adr/ADR-001-drop-sheets.md). It is wired only when
 * both GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are present, so missing creds
 * degrade to email/password rather than crashing the app at import.
 */
const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

/** Whether the Google social provider is configured. Consumed by the login UI. */
export const googleEnabled = Boolean(googleClientId && googleClientSecret);

// Narrow both to string in one place so the config below needs no assertions.
const socialProviders =
  googleClientId && googleClientSecret
    ? {
        google: {
          clientId: googleClientId,
          clientSecret: googleClientSecret,
          scope: ["openid", "email", "profile"],
        },
      }
    : undefined;

export const auth = betterAuth({
  database: new Database("./auth.db"),
  plugins: [nextCookies()],
  emailAndPassword: {
    enabled: true,
  },
  ...(socialProviders ? { socialProviders } : {}),
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
});
