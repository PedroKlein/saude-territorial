// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  signInEmail: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  auth: { api: { signInEmail: mocks.signInEmail } },
}));

function request(): NextRequest {
  return new NextRequest("http://localhost/api/auth/dev-session?redirect=/map");
}

describe("GET /api/auth/dev-session", () => {
  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "development");
    mocks.signInEmail.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("forwards Better Auth's session cookie and redirects", async () => {
    mocks.signInEmail.mockResolvedValue(
      new Response(null, {
        status: 200,
        headers: {
          "set-cookie": "better-auth.session_token=opaque-test-value; Path=/; HttpOnly",
        },
      }),
    );
    const { GET } = await import("./route");

    const response = await GET(request());

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost/map");
    expect(response.headers.get("set-cookie")).toContain(
      "better-auth.session_token=opaque-test-value",
    );
    expect(mocks.signInEmail).toHaveBeenCalledOnce();
  });

  it("returns 404 when the development account is missing", async () => {
    mocks.signInEmail.mockResolvedValue(new Response(null, { status: 401 }));
    const { GET } = await import("./route");

    const response = await GET(request());

    expect(response.status).toBe(404);
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("does not redirect when Better Auth returns no session cookie", async () => {
    mocks.signInEmail.mockResolvedValue(new Response(null, { status: 200 }));
    const { GET } = await import("./route");

    const response = await GET(request());

    expect(response.status).toBe(500);
    expect(response.headers.get("location")).toBeNull();
  });

  it("denies access outside development", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const { GET } = await import("./route");

    const response = await GET(request());

    expect(response.status).toBe(403);
    expect(mocks.signInEmail).not.toHaveBeenCalled();
  });
});
