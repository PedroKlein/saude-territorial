/**
 * POST /api/geocode — route handler contract (post-pivot).
 *
 * Post-pivot (see docs/adr/ADR-001-drop-sheets.md), the Supabase-backed
 * coordinate cache is gone. The route hits Nominatim directly on every call.
 * Caching will be reintroduced during pivot execution via Drizzle.
 *
 * Contracts under test:
 *  - POST with a valid address body returns 200 with { lat, lng, confidence }
 *  - POST without an active session returns 401
 *  - POST with a missing/empty body returns 400
 *  - POST calls Nominatim client with the normalized address
 *  - POST returns 404 when Nominatim returns no results
 *
 * All network calls are mocked. SYNTHETIC DATA ONLY.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Mocks — must be hoisted before any module import
// ---------------------------------------------------------------------------

vi.mock("better-auth", () => ({
  betterAuth: vi.fn(() => ({
    api: {
      getSession: vi.fn(),
    },
  })),
}));

vi.mock("better-auth/next-js", () => ({
  nextCookies: vi.fn(() => ({})),
  toNextJsHandler: vi.fn(() => ({ GET: vi.fn(), POST: vi.fn() })),
}));

// Mock lib/auth — control session per test
const mockGetSession = vi.fn();

vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: mockGetSession } },
}));

// Mock Nominatim client
const mockGeocode = vi.fn();

vi.mock("@/lib/geocoding/client", () => ({
  geocode: mockGeocode,
}));

// Mock address normalizer
const mockNormalizeAddress = vi.fn();

vi.mock("@/lib/geocoding/normalize", () => ({
  normalizeAddress: mockNormalizeAddress,
}));

// ---------------------------------------------------------------------------
// Synthetic test data
// ---------------------------------------------------------------------------

const FAKE_SESSION = {
  user: {
    id: "fake-user-id-geocode-000",
    email: "test.geocode.ficticio@example.com",
    name: "Usuário Geocode Fictício",
  },
  session: { id: "fake-session-id-geocode-000" },
};

/** SYNTHETIC address — not a real Porto Alegre street */
const SYNTHETIC_ADDRESS_BODY = {
  rua: "Rua Exemplo Fictício",
  numero: "100",
};

const SYNTHETIC_NORMALIZED = {
  street: "Rua Exemplo Fictício",
  number: "100",
  city: "Porto Alegre",
  state: "RS",
  country: "br",
  bairro: undefined,
};

const SYNTHETIC_COORDINATES = {
  lat: -30.03,
  lng: -51.2,
  confidence: "high" as const,
};

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function makePostRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/geocode", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("POST /api/geocode — authentication", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when there is no active session", async () => {
    mockGetSession.mockResolvedValue(null);

    const { POST } = await import("@/app/api/geocode/route");
    const response = await POST(makePostRequest(SYNTHETIC_ADDRESS_BODY));

    expect(response.status).toBe(401);
  });

  it("returns a JSON error body on 401", async () => {
    mockGetSession.mockResolvedValue(null);

    const { POST } = await import("@/app/api/geocode/route");
    const response = await POST(makePostRequest(SYNTHETIC_ADDRESS_BODY));

    const body = (await response.json()) as { error: string };
    expect(body).toHaveProperty("error");
    expect(typeof body.error).toBe("string");
    expect(body.error.length).toBeGreaterThan(0);
  });

  it("does not call Nominatim when unauthenticated", async () => {
    mockGetSession.mockResolvedValue(null);

    const { POST } = await import("@/app/api/geocode/route");
    await POST(makePostRequest(SYNTHETIC_ADDRESS_BODY));

    expect(mockGeocode).not.toHaveBeenCalled();
  });
});

describe("POST /api/geocode — input validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue(FAKE_SESSION);
    mockNormalizeAddress.mockReturnValue(SYNTHETIC_NORMALIZED);
  });

  it("returns 400 when request body is missing rua", async () => {
    const { POST } = await import("@/app/api/geocode/route");
    const response = await POST(makePostRequest({ numero: "100" }));

    expect(response.status).toBe(400);
  });

  it("returns 400 when request body is empty", async () => {
    const { POST } = await import("@/app/api/geocode/route");
    const response = await POST(makePostRequest({}));

    expect(response.status).toBe(400);
  });

  it("returns a JSON error body on 400", async () => {
    const { POST } = await import("@/app/api/geocode/route");
    const response = await POST(makePostRequest({}));

    const body = (await response.json()) as { error: string };
    expect(body).toHaveProperty("error");
    expect(typeof body.error).toBe("string");
  });
});

describe("POST /api/geocode — successful Nominatim lookup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue(FAKE_SESSION);
    mockNormalizeAddress.mockReturnValue(SYNTHETIC_NORMALIZED);
    mockGeocode.mockResolvedValue(SYNTHETIC_COORDINATES);
  });

  it("returns 200 with coordinates from Nominatim", async () => {
    const { POST } = await import("@/app/api/geocode/route");
    const response = await POST(makePostRequest(SYNTHETIC_ADDRESS_BODY));

    expect(response.status).toBe(200);
    const body = (await response.json()) as typeof SYNTHETIC_COORDINATES;
    expect(body.lat).toBe(SYNTHETIC_COORDINATES.lat);
    expect(body.lng).toBe(SYNTHETIC_COORDINATES.lng);
    expect(body.confidence).toBe(SYNTHETIC_COORDINATES.confidence);
  });

  it("calls geocode() with the normalized address", async () => {
    const { POST } = await import("@/app/api/geocode/route");
    await POST(makePostRequest(SYNTHETIC_ADDRESS_BODY));

    expect(mockGeocode).toHaveBeenCalledTimes(1);
    expect(mockGeocode).toHaveBeenCalledWith(SYNTHETIC_NORMALIZED);
  });
});

describe("POST /api/geocode — Nominatim returns no results", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue(FAKE_SESSION);
    mockNormalizeAddress.mockReturnValue(SYNTHETIC_NORMALIZED);
    mockGeocode.mockResolvedValue(null);
  });

  it("returns 404 when Nominatim returns no results", async () => {
    const { POST } = await import("@/app/api/geocode/route");
    const response = await POST(makePostRequest(SYNTHETIC_ADDRESS_BODY));

    expect(response.status).toBe(404);
  });
});
