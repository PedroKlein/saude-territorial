/**
 * TDD Red Phase — POST /api/geocode route handler contract
 *
 * These tests define the expected behaviour of app/api/geocode/route.ts.
 * They will FAIL until the implementation is written.
 *
 * Contracts:
 *  - POST with a valid address body returns 200 with { lat, lng, confidence }
 *  - POST without an active session returns 401
 *  - POST with a missing address body returns 400
 *  - The handler checks the Supabase cache first (via getCachedCoordinates)
 *    before calling the Nominatim client
 *  - On a cache miss, the handler calls geocode() and stores the result with
 *    upsertCachedCoordinates()
 *  - On a cache hit, the handler returns cached coordinates without calling geocode()
 *
 * fetch() and Supabase are mocked — no real network calls are made.
 * SYNTHETIC DATA ONLY — no real patient addresses.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Mocks — must be hoisted before any module import
// ---------------------------------------------------------------------------

// Better Auth infrastructure mocks (required to import lib/auth)
vi.mock("better-auth", () => ({
  betterAuth: vi.fn(() => ({
    api: {
      getSession: vi.fn(),
      getAccessToken: vi.fn(),
    },
  })),
}));

vi.mock("better-auth/next-js", () => ({
  nextCookies: vi.fn(() => ({})),
  toNextJsHandler: vi.fn(() => ({ GET: vi.fn(), POST: vi.fn() })),
}));

vi.mock("pg", () => ({
  Pool: vi.fn().mockImplementation(() => ({})),
}));

vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));

// Mock lib/auth — control session per test
const mockGetSession = vi.fn();
const mockGetGoogleAccessToken = vi.fn();

vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: mockGetSession } },
  getGoogleAccessToken: mockGetGoogleAccessToken,
}));

// Mock geocoding cache
const mockGetCachedCoordinates = vi.fn();
const mockUpsertCachedCoordinates = vi.fn();

vi.mock("@/lib/geocoding/cache", () => ({
  getCachedCoordinates: mockGetCachedCoordinates,
  upsertCachedCoordinates: mockUpsertCachedCoordinates,
  buildCacheKey: vi.fn((addr: { city: string; street: string; number: string | null }) =>
    `${addr.city}|${addr.street}|${addr.number ?? ""}`.toLowerCase()
  ),
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
// Helper: build a POST NextRequest with a JSON body
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

  it("does not call geocode or cache when unauthenticated", async () => {
    mockGetSession.mockResolvedValue(null);

    const { POST } = await import("@/app/api/geocode/route");
    await POST(makePostRequest(SYNTHETIC_ADDRESS_BODY));

    expect(mockGeocode).not.toHaveBeenCalled();
    expect(mockGetCachedCoordinates).not.toHaveBeenCalled();
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

describe("POST /api/geocode — cache hit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue(FAKE_SESSION);
    mockNormalizeAddress.mockReturnValue(SYNTHETIC_NORMALIZED);
    mockGetCachedCoordinates.mockResolvedValue(SYNTHETIC_COORDINATES);
  });

  it("returns 200 with cached coordinates on cache hit", async () => {
    const { POST } = await import("@/app/api/geocode/route");
    const response = await POST(makePostRequest(SYNTHETIC_ADDRESS_BODY));

    expect(response.status).toBe(200);
    const body = (await response.json()) as typeof SYNTHETIC_COORDINATES;
    expect(body.lat).toBe(SYNTHETIC_COORDINATES.lat);
    expect(body.lng).toBe(SYNTHETIC_COORDINATES.lng);
    expect(body.confidence).toBe(SYNTHETIC_COORDINATES.confidence);
  });

  it("does NOT call geocode() on a cache hit", async () => {
    const { POST } = await import("@/app/api/geocode/route");
    await POST(makePostRequest(SYNTHETIC_ADDRESS_BODY));

    expect(mockGeocode).not.toHaveBeenCalled();
  });

  it("does NOT call upsertCachedCoordinates() on a cache hit", async () => {
    const { POST } = await import("@/app/api/geocode/route");
    await POST(makePostRequest(SYNTHETIC_ADDRESS_BODY));

    expect(mockUpsertCachedCoordinates).not.toHaveBeenCalled();
  });
});

describe("POST /api/geocode — cache miss, successful geocode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue(FAKE_SESSION);
    mockNormalizeAddress.mockReturnValue(SYNTHETIC_NORMALIZED);
    mockGetCachedCoordinates.mockResolvedValue(null); // cache miss
    mockGeocode.mockResolvedValue(SYNTHETIC_COORDINATES);
    mockUpsertCachedCoordinates.mockResolvedValue(undefined);
  });

  it("returns 200 with coordinates from Nominatim on cache miss", async () => {
    const { POST } = await import("@/app/api/geocode/route");
    const response = await POST(makePostRequest(SYNTHETIC_ADDRESS_BODY));

    expect(response.status).toBe(200);
    const body = (await response.json()) as typeof SYNTHETIC_COORDINATES;
    expect(body.lat).toBe(SYNTHETIC_COORDINATES.lat);
    expect(body.lng).toBe(SYNTHETIC_COORDINATES.lng);
  });

  it("calls geocode() with the normalized address on cache miss", async () => {
    const { POST } = await import("@/app/api/geocode/route");
    await POST(makePostRequest(SYNTHETIC_ADDRESS_BODY));

    expect(mockGeocode).toHaveBeenCalledTimes(1);
    expect(mockGeocode).toHaveBeenCalledWith(SYNTHETIC_NORMALIZED);
  });

  it("stores the result in cache after a successful Nominatim lookup", async () => {
    const { POST } = await import("@/app/api/geocode/route");
    await POST(makePostRequest(SYNTHETIC_ADDRESS_BODY));

    expect(mockUpsertCachedCoordinates).toHaveBeenCalledTimes(1);
    expect(mockUpsertCachedCoordinates).toHaveBeenCalledWith(
      SYNTHETIC_NORMALIZED,
      SYNTHETIC_COORDINATES
    );
  });
});

describe("POST /api/geocode — Nominatim returns no results", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue(FAKE_SESSION);
    mockNormalizeAddress.mockReturnValue(SYNTHETIC_NORMALIZED);
    mockGetCachedCoordinates.mockResolvedValue(null);
    mockGeocode.mockResolvedValue(null); // Nominatim found nothing
  });

  it("returns 404 when Nominatim returns no results", async () => {
    const { POST } = await import("@/app/api/geocode/route");
    const response = await POST(makePostRequest(SYNTHETIC_ADDRESS_BODY));

    expect(response.status).toBe(404);
  });

  it("does NOT call upsertCachedCoordinates when Nominatim finds nothing", async () => {
    const { POST } = await import("@/app/api/geocode/route");
    await POST(makePostRequest(SYNTHETIC_ADDRESS_BODY));

    expect(mockUpsertCachedCoordinates).not.toHaveBeenCalled();
  });
});
