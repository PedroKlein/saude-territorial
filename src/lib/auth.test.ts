/**
 * lib/auth.ts contract tests — post-pivot (identity-only Google OAuth)
 *
 * As of the pivot (see docs/adr/ADR-001-drop-sheets.md), this app no longer
 * calls Google Sheets on behalf of the user. Auth is reduced to identity
 * (Google login for the "who is this?" question), nothing more.
 *
 * Contracts:
 *  - `auth` is exported and is a Better Auth instance
 *  - Google provider is configured with only `openid email profile` scopes
 *  - No `spreadsheets` scope is requested
 *  - The `nextCookies` plugin is registered
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

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


// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("lib/auth — Better Auth server config (identity-only)", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("exports an `auth` object (Better Auth instance)", async () => {
    const mod = await import("@/lib/auth");
    expect(mod).toHaveProperty("auth");
    expect(mod.auth).toBeDefined();
    expect(typeof mod.auth).toBe("object");
  });

  it("configures the Google social provider", async () => {
    const { betterAuth } = await import("better-auth");
    const betterAuthMock = vi.mocked(betterAuth);

    // Re-import to trigger the betterAuth() call
    await import("@/lib/auth");

    expect(betterAuthMock).toHaveBeenCalled();
    const config = betterAuthMock.mock.calls[0][0] as {
      socialProviders?: { google?: Record<string, unknown> };
    };

    expect(config).toHaveProperty("socialProviders");
    expect(config.socialProviders).toHaveProperty("google");
  });

  it("requests only identity scopes (no spreadsheets or other Google API scopes)", async () => {
    const { betterAuth } = await import("better-auth");
    const betterAuthMock = vi.mocked(betterAuth);

    await import("@/lib/auth");

    const config = betterAuthMock.mock.calls[0][0] as {
      socialProviders: { google: { scope: string[] } };
    };

    const scopes: string[] = config.socialProviders.google.scope ?? [];
    expect(scopes).toEqual(expect.arrayContaining(["openid", "email", "profile"]));
    // No Google API scopes should be requested — identity only.
    expect(scopes).not.toContain("https://www.googleapis.com/auth/spreadsheets");
    // Sanity: the whole scope list should be short (identity-only).
    expect(scopes.length).toBeLessThanOrEqual(4);
  });

  it("configures the nextCookies plugin", async () => {
    const { betterAuth } = await import("better-auth");
    const { nextCookies } = await import("better-auth/next-js");
    const betterAuthMock = vi.mocked(betterAuth);

    await import("@/lib/auth");

    const config = betterAuthMock.mock.calls[0][0] as {
      plugins?: unknown[];
    };

    expect(nextCookies).toHaveBeenCalled();
    expect(config.plugins).toBeDefined();
    expect(Array.isArray(config.plugins)).toBe(true);
  });

  it("does not export getGoogleAccessToken (removed with the Sheets pivot)", async () => {
    const mod = await import("@/lib/auth");
    expect(mod).not.toHaveProperty("getGoogleAccessToken");
  });
});
