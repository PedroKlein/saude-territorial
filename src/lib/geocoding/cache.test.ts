/**
 * Tests for geocodeWithCache and buildCacheKey (src/lib/geocoding/cache.ts).
 *
 * @/db/client and @/lib/geocoding/client are mocked — no DB or network IO.
 * SYNTHETIC DATA ONLY — no real patient addresses or coordinates.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Hoisted mock factories — must be declared before vi.mock so the factory
// closures can capture them.
// ---------------------------------------------------------------------------

const mocks = vi.hoisted(() => {
  const onConflictDoNothing = vi.fn();
  const values = vi.fn();
  const insert = vi.fn();
  const findFirst = vi.fn();
  const geocode = vi.fn();
  return { findFirst, insert, values, onConflictDoNothing, geocode };
});

vi.mock("@/db/client", () => ({
  db: {
    query: { geocodeCache: { findFirst: mocks.findFirst } },
    insert: mocks.insert,
  },
}));

vi.mock("@/lib/geocoding/client", () => ({
  geocode: mocks.geocode,
}));

// ---------------------------------------------------------------------------
// Module under test (imported after vi.mock declarations are hoisted)
// ---------------------------------------------------------------------------

import { buildCacheKey, geocodeWithCache } from "@/lib/geocoding/cache";
import type { NormalizedAddress } from "@/lib/geocoding/types";

// ---------------------------------------------------------------------------
// Synthetic test data — LGPD: no real patient addresses
// ---------------------------------------------------------------------------

/** SYNTHETIC NormalizedAddress — fictitious location, not a real address */
const SYNTHETIC_ADDR: NormalizedAddress = {
  street: "Rua Inventada",
  number: "42",
  city: "Porto Alegre",
  state: "RS",
  country: "br",
};

const CACHE_HIT_ROW = {
  key: "porto alegre|rua inventada|42",
  lat: -30.1234,
  lng: -51.5678,
  /** Stored as the raw Nominatim importance score, despite the column name */
  confidence: 0.75,
  displayName: "Rua Inventada, 42, Porto Alegre (FICTÍCIO)",
};

const GEOCODE_RESULT = {
  lat: -30.1234,
  lng: -51.5678,
  confidence: "high" as const,
  importance: 0.75,
  displayName: "Rua Inventada, 42, Porto Alegre (FICTÍCIO)",
};

// ---------------------------------------------------------------------------
// Shared setup: clear call history + re-establish mock return chains
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  // Restore the insert → values → onConflictDoNothing chain.
  mocks.onConflictDoNothing.mockResolvedValue(undefined);
  mocks.values.mockReturnValue({ onConflictDoNothing: mocks.onConflictDoNothing });
  mocks.insert.mockReturnValue({ values: mocks.values });
  // Default: cache miss (findFirst returns undefined).
  mocks.findFirst.mockResolvedValue(undefined);
});

// ---------------------------------------------------------------------------
// buildCacheKey
// ---------------------------------------------------------------------------

describe("buildCacheKey", () => {
  it("produces a deterministic lowercase city|street|number string", () => {
    expect(buildCacheKey(SYNTHETIC_ADDR)).toBe("porto alegre|rua inventada|42");
  });

  it("lowercases mixed-case street and city inputs", () => {
    const addr: NormalizedAddress = {
      street: "Avenida BRASIL",
      number: "100",
      city: "Porto Alegre",
      state: "RS",
      country: "br",
    };
    expect(buildCacheKey(addr)).toBe("porto alegre|avenida brasil|100");
  });

  it("uses empty string segment when number is null", () => {
    expect(buildCacheKey({ ...SYNTHETIC_ADDR, number: null })).toBe(
      "porto alegre|rua inventada|",
    );
  });

  it("addresses differing only in casing produce the same key", () => {
    const upper = buildCacheKey({
      ...SYNTHETIC_ADDR,
      street: "RUA INVENTADA",
      city: "PORTO ALEGRE",
    });
    const lower = buildCacheKey({
      ...SYNTHETIC_ADDR,
      street: "rua inventada",
      city: "porto alegre",
    });
    expect(upper).toBe(lower);
  });
});

// ---------------------------------------------------------------------------
// geocodeWithCache — cache hit
// ---------------------------------------------------------------------------

describe("geocodeWithCache — cache hit", () => {
  it("returns cached lat/lng/confidence/importance/displayName without calling geocode()", async () => {
    mocks.findFirst.mockResolvedValueOnce(CACHE_HIT_ROW);

    const result = await geocodeWithCache(SYNTHETIC_ADDR);

    expect(result).toEqual({
      lat: CACHE_HIT_ROW.lat,
      lng: CACHE_HIT_ROW.lng,
      confidence: "high", // bucketConfidence(0.75) => "high"
      importance: CACHE_HIT_ROW.confidence,
      displayName: CACHE_HIT_ROW.displayName,
    });
    expect(mocks.geocode).not.toHaveBeenCalled();
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("buckets importance 0.5 as medium", async () => {
    mocks.findFirst.mockResolvedValueOnce({ ...CACHE_HIT_ROW, confidence: 0.5 });

    const result = await geocodeWithCache(SYNTHETIC_ADDR);
    expect(result?.confidence).toBe("medium");
    expect(mocks.geocode).not.toHaveBeenCalled();
  });

  it("buckets importance 0.3 as low", async () => {
    mocks.findFirst.mockResolvedValueOnce({ ...CACHE_HIT_ROW, confidence: 0.3 });

    const result = await geocodeWithCache(SYNTHETIC_ADDR);
    expect(result?.confidence).toBe("low");
  });

  it("maps null displayName to undefined in the returned result", async () => {
    mocks.findFirst.mockResolvedValueOnce({ ...CACHE_HIT_ROW, displayName: null });

    const result = await geocodeWithCache(SYNTHETIC_ADDR);
    expect(result?.displayName).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// geocodeWithCache — cache miss, geocode returns a result
// ---------------------------------------------------------------------------

describe("geocodeWithCache — cache miss, geocode returns result", () => {
  it("calls geocode() and returns its result directly", async () => {
    mocks.geocode.mockResolvedValueOnce(GEOCODE_RESULT);

    const result = await geocodeWithCache(SYNTHETIC_ADDR);

    expect(mocks.geocode).toHaveBeenCalledOnce();
    expect(result).toEqual(GEOCODE_RESULT);
  });

  it("upserts via insert().values().onConflictDoNothing() with the correct shape", async () => {
    mocks.geocode.mockResolvedValueOnce(GEOCODE_RESULT);

    await geocodeWithCache(SYNTHETIC_ADDR);

    expect(mocks.insert).toHaveBeenCalledOnce();
    expect(mocks.values).toHaveBeenCalledOnce();

    const inserted: Record<string, unknown> = mocks.values.mock.calls[0][0];
    expect(inserted).toMatchObject({
      key: "porto alegre|rua inventada|42",
      lat: GEOCODE_RESULT.lat,
      lng: GEOCODE_RESULT.lng,
      // importance is stored in the confidence column
      confidence: GEOCODE_RESULT.importance,
    });
    expect(mocks.onConflictDoNothing).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
// geocodeWithCache — cache miss, Nominatim returns null
// ---------------------------------------------------------------------------

describe("geocodeWithCache — cache miss, Nominatim returns null", () => {
  it("returns null and does not attempt an insert", async () => {
    mocks.geocode.mockResolvedValueOnce(null);

    const result = await geocodeWithCache(SYNTHETIC_ADDR);

    expect(result).toBeNull();
    expect(mocks.insert).not.toHaveBeenCalled();
  });
});
