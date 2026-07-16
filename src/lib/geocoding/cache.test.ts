/**
 * TDD Red Phase — Supabase geocoding cache contract
 *
 * These tests define the expected behaviour of lib/geocoding/cache.ts.
 * They will FAIL until the implementation is written.
 *
 * Contracts:
 *  - `getCachedCoordinates` returns a Coordinates object on cache hit
 *  - `getCachedCoordinates` returns null on cache miss
 *  - `upsertCachedCoordinates` stores a geocoding result in the cache
 *  - `buildCacheKey` produces a deterministic, lowercase key for a NormalizedAddress
 *  - The cache key is identical for addresses that normalise to the same string,
 *    ensuring "R. Flores 100" and "Rua Flores, 100" share a single cache entry
 *
 * The cache module calls createClient() from @/lib/supabase/server to obtain
 * a Supabase client — that function is mocked here.
 *
 * SYNTHETIC DATA ONLY — no real patient addresses.
 */

import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";

// Set env so cache functions don't skip
beforeAll(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "http://test.supabase.co";
});

// ---------------------------------------------------------------------------
// Supabase mock — must be hoisted before any import of the module under test.
// We mock @/lib/supabase/server so createClient() returns a controlled stub.
// ---------------------------------------------------------------------------

const mockSingle = vi.fn();
const mockEq = vi.fn(() => ({ single: mockSingle }));
const mockSelect = vi.fn(() => ({ eq: mockEq }));
const mockUpsert = vi.fn();

const mockFrom = vi.fn(() => ({
  select: mockSelect,
  upsert: mockUpsert,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    from: mockFrom,
  }),
}));

// Also mock next/headers (transitively required by @/lib/supabase/server in
// the real implementation — mocking the module avoids the import error in tests)
vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    getAll: vi.fn().mockReturnValue([]),
    set: vi.fn(),
  }),
}));

// ---------------------------------------------------------------------------
// Synthetic test data
// ---------------------------------------------------------------------------

/** SYNTHETIC — not a real Porto Alegre address */
const SYNTHETIC_NORMALIZED = {
  street: "Rua Exemplo Fictício",
  number: "100",
  city: "Porto Alegre",
  state: "RS",
  country: "br",
  bairro: undefined,
} as const;

const SYNTHETIC_COORDINATES = {
  lat: -30.03,
  lng: -51.2,
  confidence: "high" as const,
};

// ---------------------------------------------------------------------------
// buildCacheKey
// ---------------------------------------------------------------------------

describe("buildCacheKey — determinism and normalisation", () => {
  it("returns a non-empty string for a valid NormalizedAddress", async () => {
    const { buildCacheKey } = await import("@/lib/geocoding/cache");
    const key = buildCacheKey(SYNTHETIC_NORMALIZED);
    expect(typeof key).toBe("string");
    expect(key.length).toBeGreaterThan(0);
  });

  it("produces the same key when called twice with identical input", async () => {
    const { buildCacheKey } = await import("@/lib/geocoding/cache");
    const key1 = buildCacheKey(SYNTHETIC_NORMALIZED);
    const key2 = buildCacheKey(SYNTHETIC_NORMALIZED);
    expect(key1).toBe(key2);
  });

  it("is fully lowercase", async () => {
    const { buildCacheKey } = await import("@/lib/geocoding/cache");
    const key = buildCacheKey(SYNTHETIC_NORMALIZED);
    expect(key).toBe(key.toLowerCase());
  });

  it("produces the same key regardless of original capitalisation in the street field", async () => {
    const { buildCacheKey } = await import("@/lib/geocoding/cache");
    const lower = buildCacheKey({
      ...SYNTHETIC_NORMALIZED,
      street: "rua exemplo fictício",
    });
    const upper = buildCacheKey({
      ...SYNTHETIC_NORMALIZED,
      street: "RUA EXEMPLO FICTÍCIO",
    });
    expect(lower).toBe(upper);
  });

  it("produces different keys for different streets", async () => {
    const { buildCacheKey } = await import("@/lib/geocoding/cache");
    const keyA = buildCacheKey({
      ...SYNTHETIC_NORMALIZED,
      street: "Rua Alfa Fictícia",
    });
    const keyB = buildCacheKey({
      ...SYNTHETIC_NORMALIZED,
      street: "Rua Beta Fictícia",
    });
    expect(keyA).not.toBe(keyB);
  });

  it("produces different keys for different house numbers", async () => {
    const { buildCacheKey } = await import("@/lib/geocoding/cache");
    const key100 = buildCacheKey({ ...SYNTHETIC_NORMALIZED, number: "100" });
    const key200 = buildCacheKey({ ...SYNTHETIC_NORMALIZED, number: "200" });
    expect(key100).not.toBe(key200);
  });

  it("produces the same key for null number and empty string number (both mean no number)", async () => {
    const { buildCacheKey } = await import("@/lib/geocoding/cache");
    const keyNull = buildCacheKey({ ...SYNTHETIC_NORMALIZED, number: null });
    const keyEmpty = buildCacheKey({ ...SYNTHETIC_NORMALIZED, number: "" });
    // Both represent "no number" — must share the same cache slot
    expect(keyNull).toBe(keyEmpty);
  });
});

// ---------------------------------------------------------------------------
// getCachedCoordinates
// ---------------------------------------------------------------------------

describe("getCachedCoordinates — cache hit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Re-apply default mock shape after clearAllMocks
    mockFrom.mockReturnValue({ select: mockSelect, upsert: mockUpsert });
    mockSelect.mockReturnValue({ eq: mockEq });
    mockEq.mockReturnValue({ single: mockSingle });
  });

  it("returns coordinates when a matching row exists in the cache table", async () => {
    mockSingle.mockResolvedValue({
      data: {
        cache_key: "porto alegre|rua exemplo fictício|100",
        lat: SYNTHETIC_COORDINATES.lat,
        lng: SYNTHETIC_COORDINATES.lng,
        confidence: SYNTHETIC_COORDINATES.confidence,
      },
      error: null,
    });

    const { getCachedCoordinates } = await import("@/lib/geocoding/cache");
    const result = await getCachedCoordinates(SYNTHETIC_NORMALIZED);

    expect(result).not.toBeNull();
    expect(result!.lat).toBe(SYNTHETIC_COORDINATES.lat);
    expect(result!.lng).toBe(SYNTHETIC_COORDINATES.lng);
    expect(result!.confidence).toBe(SYNTHETIC_COORDINATES.confidence);
  });

  it("queries by cache_key column using the deterministic key", async () => {
    mockSingle.mockResolvedValue({ data: null, error: null });

    const { getCachedCoordinates, buildCacheKey } = await import(
      "@/lib/geocoding/cache"
    );
    await getCachedCoordinates(SYNTHETIC_NORMALIZED);

    const expectedKey = buildCacheKey(SYNTHETIC_NORMALIZED);
    expect(mockEq).toHaveBeenCalledWith("cache_key", expectedKey);
  });
});

describe("getCachedCoordinates — cache miss", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockReturnValue({ select: mockSelect, upsert: mockUpsert });
    mockSelect.mockReturnValue({ eq: mockEq });
    mockEq.mockReturnValue({ single: mockSingle });
  });

  it("returns null when no row is found (data is null, no error)", async () => {
    mockSingle.mockResolvedValue({ data: null, error: null });

    const { getCachedCoordinates } = await import("@/lib/geocoding/cache");
    const result = await getCachedCoordinates(SYNTHETIC_NORMALIZED);
    expect(result).toBeNull();
  });

  it("returns null when Supabase returns a PGRST116 not-found error", async () => {
    mockSingle.mockResolvedValue({
      data: null,
      error: { code: "PGRST116", message: "No rows found" },
    });

    const { getCachedCoordinates } = await import("@/lib/geocoding/cache");
    const result = await getCachedCoordinates(SYNTHETIC_NORMALIZED);
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// upsertCachedCoordinates
// ---------------------------------------------------------------------------

describe("upsertCachedCoordinates — storing results", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockReturnValue({ select: mockSelect, upsert: mockUpsert });
    mockSelect.mockReturnValue({ eq: mockEq });
    mockEq.mockReturnValue({ single: mockSingle });
    mockUpsert.mockResolvedValue({ error: null });
  });

  it("calls upsert on a Supabase table", async () => {
    const { upsertCachedCoordinates } = await import("@/lib/geocoding/cache");
    await upsertCachedCoordinates(SYNTHETIC_NORMALIZED, SYNTHETIC_COORDINATES);

    expect(mockFrom).toHaveBeenCalled();
    expect(mockUpsert).toHaveBeenCalledTimes(1);
  });

  it("includes lat, lng, and confidence in the upserted row", async () => {
    const { upsertCachedCoordinates } = await import("@/lib/geocoding/cache");
    await upsertCachedCoordinates(SYNTHETIC_NORMALIZED, SYNTHETIC_COORDINATES);

    const upsertPayload = mockUpsert.mock.calls[0][0] as Record<
      string,
      unknown
    >;
    expect(upsertPayload).toMatchObject({
      lat: SYNTHETIC_COORDINATES.lat,
      lng: SYNTHETIC_COORDINATES.lng,
      confidence: SYNTHETIC_COORDINATES.confidence,
    });
  });

  it("includes the deterministic cache_key in the upserted row", async () => {
    const { upsertCachedCoordinates, buildCacheKey } = await import(
      "@/lib/geocoding/cache"
    );
    await upsertCachedCoordinates(SYNTHETIC_NORMALIZED, SYNTHETIC_COORDINATES);

    const expectedKey = buildCacheKey(SYNTHETIC_NORMALIZED);
    const upsertPayload = mockUpsert.mock.calls[0][0] as Record<
      string,
      unknown
    >;
    expect(upsertPayload).toMatchObject({ cache_key: expectedKey });
  });

  it("does not throw when Supabase upsert succeeds", async () => {
    mockUpsert.mockResolvedValue({ error: null });

    const { upsertCachedCoordinates } = await import("@/lib/geocoding/cache");
    await expect(
      upsertCachedCoordinates(SYNTHETIC_NORMALIZED, SYNTHETIC_COORDINATES)
    ).resolves.not.toThrow();
  });

  it("does not throw when Supabase upsert returns an error (graceful)", async () => {
    mockUpsert.mockResolvedValue({
      error: { message: "Database connection failed", code: "500" },
    });

    const { upsertCachedCoordinates } = await import("@/lib/geocoding/cache");
    // Should not throw — silently skip on failure
    await expect(
      upsertCachedCoordinates(SYNTHETIC_NORMALIZED, SYNTHETIC_COORDINATES)
    ).resolves.toBeUndefined();
  });
});
