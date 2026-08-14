/**
 * Tests for POST /api/routes (multi-waypoint OSRM proxy).
 *
 * Covers auth gate + Zod boundary (empty body, single waypoint,
 * out-of-range coord). Happy-path OSRM contract is covered by
 * `src/lib/routing/client.test.ts` — mocking `getRoute` here would
 * duplicate that surface.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  getRoute: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: mocks.getSession } },
}));

vi.mock("@/lib/routing/client", () => ({
  getRoute: mocks.getRoute,
}));

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------

import { POST } from "@/app/api/routes/route";
import { NextRequest } from "next/server";

function makePost(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/routes", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

const VALID_BODY = {
  waypoints: [
    { lat: -30.0346, lng: -51.2177 },
    { lat: -30.0400, lng: -51.2100 },
  ],
  profile: "foot" as const,
};

describe("POST /api/routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    mocks.getSession.mockResolvedValueOnce(null);
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(401);
    expect(mocks.getRoute).not.toHaveBeenCalled();
  });

  it("returns 400 for malformed JSON body", async () => {
    mocks.getSession.mockResolvedValueOnce({ user: { id: "u1" } });
    const req = new NextRequest("http://localhost/api/routes", {
      method: "POST",
      body: "not-json{",
      headers: { "content-type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when only one waypoint is supplied", async () => {
    mocks.getSession.mockResolvedValueOnce({ user: { id: "u1" } });
    const res = await POST(
      makePost({ waypoints: [{ lat: -30, lng: -51 }], profile: "foot" }),
    );
    expect(res.status).toBe(400);
    expect(mocks.getRoute).not.toHaveBeenCalled();
  });

  it("returns 400 for out-of-range coordinates", async () => {
    mocks.getSession.mockResolvedValueOnce({ user: { id: "u1" } });
    const res = await POST(
      makePost({
        waypoints: [
          { lat: -30, lng: -51 },
          { lat: 999, lng: 999 },
        ],
        profile: "car",
      }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid profile", async () => {
    mocks.getSession.mockResolvedValueOnce({ user: { id: "u1" } });
    const res = await POST(
      makePost({ ...VALID_BODY, profile: "bike" }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 200 and forwards waypoints to getRoute on happy path", async () => {
    mocks.getSession.mockResolvedValueOnce({ user: { id: "u1" } });
    mocks.getRoute.mockResolvedValueOnce({
      distance: 1500,
      duration: 600,
      geometry: { type: "LineString", coordinates: [] },
    });

    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.distance).toBe(1500);
    expect(mocks.getRoute).toHaveBeenCalledWith(VALID_BODY.waypoints, "foot");
  });

  it("returns 502 when the OSRM client throws", async () => {
    mocks.getSession.mockResolvedValueOnce({ user: { id: "u1" } });
    mocks.getRoute.mockRejectedValueOnce(new Error("upstream down"));

    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(502);
  });
});
