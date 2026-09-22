// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: mocks.getSession } },
}));

import { proxy } from "./proxy";

function request(path: string): NextRequest {
  return new NextRequest(`http://localhost${path}`);
}

describe("dashboard route protection", () => {
  beforeEach(() => {
    mocks.getSession.mockReset();
  });

  it.each(["/", "/map", "/pacientes", "/settings"])(
    "redirects unauthenticated requests for %s to login",
    async (path) => {
      mocks.getSession.mockResolvedValue(null);

      const response = await proxy(request(path));

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe(
        `http://localhost/login?redirect=${encodeURIComponent(path)}`,
      );
    },
  );

  it("preserves the requested query string", async () => {
    mocks.getSession.mockResolvedValue(null);

    const response = await proxy(request("/map?patient=patient-id"));

    expect(response.headers.get("location")).toBe(
      "http://localhost/login?redirect=%2Fmap%3Fpatient%3Dpatient-id",
    );
  });

  it("allows authenticated requests", async () => {
    mocks.getSession.mockResolvedValue({ session: {}, user: {} });

    const response = await proxy(request("/pacientes"));

    expect(response.headers.get("location")).toBeNull();
  });
});
