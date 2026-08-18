/**
 * lib/auth.ts contract tests.
 *
 * Local-first auth: email/password is always enabled so the app runs with no
 * external identity provider. Google OAuth is optional and identity-only
 * (openid email profile — no Sheets/Drive scopes; see ADR-001), wired only
 * when GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are both present.
 *
 * Contracts:
 *  - `auth` is exported and is a Better Auth instance
 *  - email/password is enabled
 *  - `nextCookies` plugin is registered
 *  - when Google creds are present: provider configured with only identity scopes
 *  - when Google creds are absent: no social provider, no crash, googleEnabled=false
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ---------------------------------------------------------------------------
// Top-level vi.mock() calls — Vitest hoists these before any imports.
// Must live at module scope, never inside describe/beforeEach/it.
// ---------------------------------------------------------------------------

vi.mock("better-auth", () => ({
  betterAuth: vi.fn((config: Record<string, unknown>) => ({
    __capturedConfig: config,
    api: {
      getSession: vi.fn(),
    },
  })),
}));

vi.mock("better-auth/next-js", () => ({
  nextCookies: vi.fn(() => ({})),
  toNextJsHandler: vi.fn((auth: unknown) => ({ GET: vi.fn(), POST: vi.fn(), __auth: auth })),
}));

// The betterAuth mock stashes the config it received on the returned instance,
// so we read it back per-instance instead of indexing the shared mock's call
// log (which accumulates across resetModules).
type CapturedConfig = {
  emailAndPassword?: { enabled?: boolean };
  plugins?: unknown[];
  socialProviders?: { google?: { scope?: string[] } };
}
function capturedConfig(auth: unknown): CapturedConfig {
  return (auth as { __capturedConfig: CapturedConfig }).__capturedConfig;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("lib/auth — Better Auth server config", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("exports an `auth` object (Better Auth instance)", async () => {
    const mod = await import("@/lib/auth");
    expect(mod).toHaveProperty("auth");
    expect(typeof mod.auth).toBe("object");
  });

  it("enables email/password auth", async () => {
    const mod = await import("@/lib/auth");
    const config = capturedConfig(mod.auth);
    expect(config.emailAndPassword?.enabled).toBe(true);
  });

  it("configures the nextCookies plugin", async () => {
    const { nextCookies } = await import("better-auth/next-js");
    const mod = await import("@/lib/auth");

    const config = capturedConfig(mod.auth);
    expect(nextCookies).toHaveBeenCalled();
    expect(Array.isArray(config.plugins)).toBe(true);
  });

  it("does not export getGoogleAccessToken (removed with the Sheets pivot)", async () => {
    const mod = await import("@/lib/auth");
    expect(mod).not.toHaveProperty("getGoogleAccessToken");
  });

  describe("with Google creds present (test-setup default)", () => {
    it("configures the Google social provider with only identity scopes", async () => {
      const mod = await import("@/lib/auth");
      const config = capturedConfig(mod.auth);
      expect(config.socialProviders).toHaveProperty("google");

      const scopes = config.socialProviders!.google!.scope ?? [];
      expect(scopes).toEqual(expect.arrayContaining(["openid", "email", "profile"]));
      expect(scopes).not.toContain("https://www.googleapis.com/auth/spreadsheets");
      expect(scopes.length).toBeLessThanOrEqual(4);
    });

    it("reports googleEnabled = true", async () => {
      const mod = await import("@/lib/auth");
      expect(mod.googleEnabled).toBe(true);
    });
  });

  describe("with Google creds absent", () => {
    let savedId: string | undefined;
    let savedSecret: string | undefined;

    beforeEach(() => {
      savedId = process.env.GOOGLE_CLIENT_ID;
      savedSecret = process.env.GOOGLE_CLIENT_SECRET;
      delete process.env.GOOGLE_CLIENT_ID;
      delete process.env.GOOGLE_CLIENT_SECRET;
      vi.resetModules();
    });

    afterEach(() => {
      process.env.GOOGLE_CLIENT_ID = savedId;
      process.env.GOOGLE_CLIENT_SECRET = savedSecret;
    });
    it("does not configure a social provider and does not crash", async () => {
      const mod = await import("@/lib/auth");
      expect(mod.auth).toBeDefined();
      expect(capturedConfig(mod.auth).socialProviders).toBeUndefined();
    });

    it("reports googleEnabled = false", async () => {
      const mod = await import("@/lib/auth");
      expect(mod.googleEnabled).toBe(false);
    });
  });
});
