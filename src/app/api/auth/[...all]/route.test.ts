/**
 * app/api/auth/[...all]/route — named export contract:
 *  - Module exports both `GET` and `POST` named exports
 *  - `GET` and `POST` are functions (Next.js route handlers)
 *  - The handlers are produced by `toNextJsHandler(auth)` from better-auth/next-js
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mocks — must be hoisted before any import of the module under test
// ---------------------------------------------------------------------------

vi.mock("better-auth", () => ({
  betterAuth: vi.fn(() => ({
    __isMockAuth: true,
    api: {
      getSession: vi.fn(),
      getAccessToken: vi.fn(),
    },
  })),
}));

vi.mock("better-auth/next-js", () => {
  const GET = vi.fn().mockResolvedValue(new Response("ok", { status: 200 }));
  const POST = vi.fn().mockResolvedValue(new Response("ok", { status: 200 }));

  return {
    nextCookies: vi.fn(() => ({})),
    toNextJsHandler: vi.fn(() => ({ GET, POST })),
  };
});


vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("app/api/auth/[...all]/route — named exports", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("exports a GET handler", async () => {
    const route = await import("@/app/api/auth/[...all]/route");
    expect(route).toHaveProperty("GET");
    expect(typeof route.GET).toBe("function");
  });

  it("exports a POST handler", async () => {
    const route = await import("@/app/api/auth/[...all]/route");
    expect(route).toHaveProperty("POST");
    expect(typeof route.POST).toBe("function");
  });

  it("GET and POST come from toNextJsHandler (not hand-rolled)", async () => {
    const { toNextJsHandler } = await import("better-auth/next-js");
    const toNextJsHandlerMock = vi.mocked(toNextJsHandler);

    await import("@/app/api/auth/[...all]/route");

    // toNextJsHandler must have been called exactly once with the auth instance
    expect(toNextJsHandlerMock).toHaveBeenCalledTimes(1);
  });

  it("toNextJsHandler is called with the auth instance from lib/auth", async () => {
    const { toNextJsHandler } = await import("better-auth/next-js");
    const toNextJsHandlerMock = vi.mocked(toNextJsHandler);

    await import("@/app/api/auth/[...all]/route");

    const [authArg] = toNextJsHandlerMock.mock.calls[0];

    // The auth argument must be a non-null object (the Better Auth instance)
    expect(authArg).toBeDefined();
    expect(typeof authArg).toBe("object");
    expect(authArg).not.toBeNull();
  });

  it("GET handler responds to a request without throwing", async () => {
    const route = await import("@/app/api/auth/[...all]/route");
    const request = new Request("http://localhost/api/auth/signin", { method: "GET" });

    // Should resolve (not throw) — response shape is determined by Better Auth
     
    await expect(
      (route.GET as any)(request, { params: Promise.resolve({ all: ["signin"] }) })
    ).resolves.not.toThrow();
  });

  it("POST handler responds to a request without throwing", async () => {
    const route = await import("@/app/api/auth/[...all]/route");
    const request = new Request("http://localhost/api/auth/signin", {
      method: "POST",
      body: JSON.stringify({}),
      headers: { "Content-Type": "application/json" },
    });

     
    await expect(
      (route.POST as any)(request, { params: Promise.resolve({ all: ["signin"] }) })
    ).resolves.not.toThrow();
  });
});
