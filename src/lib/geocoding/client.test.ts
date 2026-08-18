/**
 * Nominatim geocoding client contract tests.
 *
 * Contracts:
 *  - `geocode` sends a structured Nominatim query with street, city=Porto Alegre,
 *    state=Rio Grande do Sul, and countrycodes=br
 *  - The request includes a User-Agent header identifying this application
 *  - Returns a GeoResult with lat/lng on a successful response with results
 *  - Returns null when Nominatim returns an empty results array
 *  - Enforces a minimum 1-second gap between consecutive Nominatim requests
 *    (rate limit compliance — public Nominatim ToS)
 *
 * fetch() is mocked globally — no real network calls are made.
 * SYNTHETIC DATA ONLY — no real Porto Alegre patient addresses.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ---------------------------------------------------------------------------
// Mock global fetch — must be hoisted at module scope
// ---------------------------------------------------------------------------

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// ---------------------------------------------------------------------------
// Synthetic test data
// ---------------------------------------------------------------------------

/** SYNTHETIC — structurally valid Nominatim response for a fake address */
const SYNTHETIC_NOMINATIM_HIT = [
  {
    lat: "-30.0300000",
    lon: "-51.2000000",
    importance: 0.72,
    display_name:
      "Rua Exemplo Fictício, 100, Bairro Fictício, Porto Alegre, RS, Brasil",
  },
];

/** SYNTHETIC NormalizedAddress */
const SYNTHETIC_ADDRESS = {
  street: "Rua Exemplo Fictício",
  number: "100",
  city: "Porto Alegre",
  state: "RS",
  country: "br",
  bairro: undefined,
} as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeNominatimResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// ---------------------------------------------------------------------------
// geocode — structured query construction
// ---------------------------------------------------------------------------

describe("geocode — structured query parameters", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("sends the street field in the query string", async () => {
    mockFetch.mockResolvedValue(
      makeNominatimResponse(SYNTHETIC_NOMINATIM_HIT)
    );

    const { geocode } = await import("@/lib/geocoding/client");
    await geocode(SYNTHETIC_ADDRESS);

    const url = new URL(mockFetch.mock.calls[0]![0]! as string);
    expect(url.searchParams.get("street")).toBe(
      `${SYNTHETIC_ADDRESS.street}, ${SYNTHETIC_ADDRESS.number}`
    );
  });

  it('sends city="Porto Alegre" in the query string', async () => {
    mockFetch.mockResolvedValue(
      makeNominatimResponse(SYNTHETIC_NOMINATIM_HIT)
    );

    const { geocode } = await import("@/lib/geocoding/client");
    await geocode(SYNTHETIC_ADDRESS);

    const url = new URL(mockFetch.mock.calls[0]![0]! as string);
    expect(url.searchParams.get("city")).toBe("Porto Alegre");
  });

  it('sends state="Rio Grande do Sul" in the query string', async () => {
    mockFetch.mockResolvedValue(
      makeNominatimResponse(SYNTHETIC_NOMINATIM_HIT)
    );

    const { geocode } = await import("@/lib/geocoding/client");
    await geocode(SYNTHETIC_ADDRESS);

    const url = new URL(mockFetch.mock.calls[0]![0]! as string);
    expect(url.searchParams.get("state")).toBe("Rio Grande do Sul");
  });

  it('sends countrycodes="br" to avoid false matches in Portugal', async () => {
    mockFetch.mockResolvedValue(
      makeNominatimResponse(SYNTHETIC_NOMINATIM_HIT)
    );

    const { geocode } = await import("@/lib/geocoding/client");
    await geocode(SYNTHETIC_ADDRESS);

    const url = new URL(mockFetch.mock.calls[0]![0]! as string);
    expect(url.searchParams.get("countrycodes")).toBe("br");
  });

  it('sends format="jsonv2"', async () => {
    mockFetch.mockResolvedValue(
      makeNominatimResponse(SYNTHETIC_NOMINATIM_HIT)
    );

    const { geocode } = await import("@/lib/geocoding/client");
    await geocode(SYNTHETIC_ADDRESS);

    const url = new URL(mockFetch.mock.calls[0]![0]! as string);
    expect(url.searchParams.get("format")).toBe("jsonv2");
  });

  it('sends limit="1" to avoid unnecessary extra results', async () => {
    mockFetch.mockResolvedValue(
      makeNominatimResponse(SYNTHETIC_NOMINATIM_HIT)
    );

    const { geocode } = await import("@/lib/geocoding/client");
    await geocode(SYNTHETIC_ADDRESS);

    const url = new URL(mockFetch.mock.calls[0]![0]! as string);
    expect(url.searchParams.get("limit")).toBe("1");
  });
});

// ---------------------------------------------------------------------------
// geocode — User-Agent header
// ---------------------------------------------------------------------------

describe("geocode — User-Agent header", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("includes a User-Agent header in the request", async () => {
    mockFetch.mockResolvedValue(
      makeNominatimResponse(SYNTHETIC_NOMINATIM_HIT)
    );

    const { geocode } = await import("@/lib/geocoding/client");
    await geocode(SYNTHETIC_ADDRESS);

    const fetchInit = mockFetch.mock.calls[0]![1]! as RequestInit | undefined;
    const headers = new Headers(fetchInit?.headers);
    expect(headers.has("user-agent")).toBe(true);
    expect(headers.get("user-agent")).not.toBe("");
  });

  it("User-Agent contains the application identifier", async () => {
    mockFetch.mockResolvedValue(
      makeNominatimResponse(SYNTHETIC_NOMINATIM_HIT)
    );

    const { geocode } = await import("@/lib/geocoding/client");
    await geocode(SYNTHETIC_ADDRESS);

    const fetchInit = mockFetch.mock.calls[0]![1]! as RequestInit | undefined;
    const headers = new Headers(fetchInit?.headers);
    // Must identify the application per Nominatim usage policy
    expect(headers.get("user-agent")).toMatch(/saude-territorial/i);
  });
});

// ---------------------------------------------------------------------------
// geocode — return value
// ---------------------------------------------------------------------------

describe("geocode — successful response", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns a GeoResult with lat and lng parsed as numbers", async () => {
    mockFetch.mockResolvedValue(
      makeNominatimResponse(SYNTHETIC_NOMINATIM_HIT)
    );

    const { geocode } = await import("@/lib/geocoding/client");
    const result = await geocode(SYNTHETIC_ADDRESS);

    expect(result).not.toBeNull();
    expect(typeof result!.lat).toBe("number");
    expect(typeof result!.lng).toBe("number");
    expect(result!.lat).toBeCloseTo(-30.03, 2);
    expect(result!.lng).toBeCloseTo(-51.2, 2);
  });

  it("maps Nominatim importance ≥ 0.6 to confidence='high'", async () => {
    mockFetch.mockResolvedValue(
      makeNominatimResponse([{ ...SYNTHETIC_NOMINATIM_HIT[0], importance: 0.75 }])
    );

    const { geocode } = await import("@/lib/geocoding/client");
    const result = await geocode(SYNTHETIC_ADDRESS);

    expect(result!.confidence).toBe("high");
  });

  it("maps Nominatim importance 0.4–0.59 to confidence='medium'", async () => {
    mockFetch.mockResolvedValue(
      makeNominatimResponse([{ ...SYNTHETIC_NOMINATIM_HIT[0], importance: 0.5 }])
    );

    const { geocode } = await import("@/lib/geocoding/client");
    const result = await geocode(SYNTHETIC_ADDRESS);

    expect(result!.confidence).toBe("medium");
  });

  it("maps Nominatim importance < 0.4 to confidence='low'", async () => {
    mockFetch.mockResolvedValue(
      makeNominatimResponse([{ ...SYNTHETIC_NOMINATIM_HIT[0], importance: 0.3 }])
    );

    const { geocode } = await import("@/lib/geocoding/client");
    const result = await geocode(SYNTHETIC_ADDRESS);

    expect(result!.confidence).toBe("low");
  });
});

describe("geocode — no results", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns null when Nominatim returns an empty array", async () => {
    mockFetch.mockResolvedValue(makeNominatimResponse([]));

    const { geocode } = await import("@/lib/geocoding/client");
    const result = await geocode(SYNTHETIC_ADDRESS);

    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// geocode — rate limiting (1 req/s)
// ---------------------------------------------------------------------------

describe("geocode — rate limiting", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("waits at least 1 second before making a second consecutive request", async () => {
    mockFetch.mockResolvedValue(makeNominatimResponse(SYNTHETIC_NOMINATIM_HIT));

    const { geocode } = await import("@/lib/geocoding/client");

    // Fire both calls without awaiting the first
    const p1 = geocode(SYNTHETIC_ADDRESS);
    const p2 = geocode({ ...SYNTHETIC_ADDRESS, number: "200" });

    // Advance time just under 1 second — second fetch should NOT have been called
    await vi.advanceTimersByTimeAsync(900);
    // First call should resolve; second should still be pending its delay
    await p1;
    expect(mockFetch).toHaveBeenCalledTimes(1);

    // Advance past the 1-second gate
    await vi.advanceTimersByTimeAsync(200);
    await p2;
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("allows a second request immediately when 1 second has already elapsed since the last one", async () => {
    mockFetch.mockResolvedValue(makeNominatimResponse(SYNTHETIC_NOMINATIM_HIT));

    const { geocode } = await import("@/lib/geocoding/client");

    await geocode(SYNTHETIC_ADDRESS);
    // Simulate 1100ms passing
    await vi.advanceTimersByTimeAsync(1100);

    // Second request should be dispatched without additional delay
    const resultPromise = geocode({ ...SYNTHETIC_ADDRESS, number: "300" });
    await vi.runAllTimersAsync();
    const result = await resultPromise;

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(result).not.toBeNull();
  });
});
