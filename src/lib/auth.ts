import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { headers } from "next/headers";
import Database from "better-sqlite3";

export const auth = betterAuth({
  database: new Database("./auth.db"),
  plugins: [nextCookies()],
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      scope: [
        "openid",
        "email",
        "profile",
        "https://www.googleapis.com/auth/spreadsheets",
      ],
      accessType: "offline",
      prompt: "consent",
      includeGrantedScopes: true,
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
});

/**
 * Returns a fresh Google access token suitable for Google Sheets API calls.
 * Auto-refreshes if the token is expired — never cache the returned string.
 * NEVER log the returned token.
 */
export async function getGoogleAccessToken(): Promise<string> {
  const result = await auth.api.getAccessToken({
    body: { providerId: "google" },
    headers: await headers(),
  });

  if (!result?.accessToken) {
    throw new Error("No Google access token available");
  }

  return result.accessToken;
}
