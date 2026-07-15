/**
 * TDD Red Phase — auth server config contract
 *
 * These tests define the expected shape of lib/auth.ts.
 * They will FAIL until the implementation is written.
 *
 * Contracts:
 *  - `auth` is exported and is a Better Auth instance
 *  - Google provider is configured with the spreadsheets scope
 *  - `accessType: 'offline'` and `prompt: 'consent'` are set (ensures refresh token)
 *  - `getGoogleAccessToken` is exported and returns an access token string
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
      getAccessToken: vi.fn().mockResolvedValue({ accessToken: "mock-access-token" }),
    },
  })),
}));

vi.mock("better-auth/next-js", () => ({
  nextCookies: vi.fn(() => ({})),
  toNextJsHandler: vi.fn((auth: unknown) => ({ GET: vi.fn(), POST: vi.fn(), __auth: auth })),
}));

vi.mock("pg", () => ({
  Pool: vi.fn().mockImplementation(() => ({})),
}));

// Mock next/headers — required by getGoogleAccessToken
vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));

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

  it("includes the spreadsheets scope in the Google provider config", async () => {
    const { betterAuth } = await import("better-auth");
    const betterAuthMock = vi.mocked(betterAuth);

    await import("@/lib/auth");

    const config = betterAuthMock.mock.calls[0][0] as {
      socialProviders: { google: { scope: string[] } };
    };

    const scopes: string[] = config.socialProviders.google.scope ?? [];
    expect(scopes).toContain("https://www.googleapis.com/auth/spreadsheets");
  });

  it("sets accessType: 'offline' on the Google provider (required for refresh token)", async () => {
    const { betterAuth } = await import("better-auth");
    const betterAuthMock = vi.mocked(betterAuth);

    await import("@/lib/auth");

    const config = betterAuthMock.mock.calls[0][0] as unknown as {
      socialProviders: { google: Record<string, unknown> };
    };

    expect(config.socialProviders.google.accessType).toBe("offline");
  });

  it("sets prompt: 'consent' on the Google provider (ensures refresh token for returning users)", async () => {
    const { betterAuth } = await import("better-auth");
    const betterAuthMock = vi.mocked(betterAuth);

    await import("@/lib/auth");

    const config = betterAuthMock.mock.calls[0][0] as unknown as {
      socialProviders: { google: Record<string, unknown> };
    };

    expect(config.socialProviders.google.prompt).toBe("consent");
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
});

describe("lib/auth — getGoogleAccessToken", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("exports a getGoogleAccessToken function", async () => {
    const mod = await import("@/lib/auth");
    expect(mod).toHaveProperty("getGoogleAccessToken");
    expect(typeof mod.getGoogleAccessToken).toBe("function");
  });

  it("calls auth.api.getAccessToken with google providerId and returns a string token", async () => {
    const mod = await import("@/lib/auth");
    const token = await mod.getGoogleAccessToken();

    // Returned value must be a non-empty string — usable directly for Sheets API
    expect(typeof token).toBe("string");
    expect(token.length).toBeGreaterThan(0);
  });

  it("throws when no access token is available", async () => {
    // Reconfigure the already-hoisted mock to simulate a null token for one call
    const { betterAuth } = await import("better-auth");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (vi.mocked(betterAuth) as any).mockImplementationOnce(() => ({
      __capturedConfig: {},
      api: {
        getSession: vi.fn(),
        getAccessToken: vi.fn().mockResolvedValue({ accessToken: null }),
      },
    }));

    vi.resetModules();
    const mod = await import("@/lib/auth");
    await expect(mod.getGoogleAccessToken()).rejects.toThrow();
  });
});
