/**
 * Nominatim geocoding client with mandatory 1-req/s rate limiting.
 *
 * Nominatim public usage policy (nominatim.openstreetmap.org):
 *  - Maximum 1 request per second (hard limit)
 *  - Identifying User-Agent header required
 *
 * Rate limiting is implemented with a sequential promise queue.  Each call
 * chains onto the previous one and uses setTimeout for the inter-request
 * delay so Vitest's fake-timer helpers (vi.advanceTimersByTimeAsync) work.
 *
 * The queue resets to a resolved promise whenever the previous call has
 * already settled, which prevents fake-timer teardown (vi.useRealTimers())
 * from leaving the queue in a permanently-pending state between tests.
 *
 * LGPD: This client never logs addresses or coordinates together with patient
 * identifiers.  Only aggregate counts are safe to log.
 */

import type {
  NormalizedAddress,
  GeoResult,
  GeoConfidence,
} from "@/lib/geocoding/types";

const NOMINATIM_BASE = "https://nominatim.openstreetmap.org/search";
const USER_AGENT = "saude-territorial/1.0 (health-monitoring-poa)";
const RATE_LIMIT_MS = 1000;

let _lastRequestTime = 0;

// _pendingCount tracks the number of geocode calls currently queued.
// When it drops to 0 the queue is always resolved, so we reset it to avoid
// stale promise chains (important for fake-timer compatibility in tests).
let _pendingCount = 0;
let _queue: Promise<void> = Promise.resolve();

function _delay(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function mapImportance(importance: number): GeoConfidence {
  if (importance >= 0.6) return "high";
  if (importance >= 0.4) return "medium";
  return "low";
}

/**
 * Geocodes a NormalizedAddress using Nominatim's structured query API.
 *
 * Returns a GeoResult on success, or null if Nominatim found no results.
 */
export async function geocode(
  addr: NormalizedAddress
): Promise<GeoResult | null> {
  // When no other calls are in flight, reset both the queue and the last-request
  // timestamp.  This ensures:
  //  (a) stale fake-timer promises from a previous test run don't block the queue
  //  (b) the first call in a new "burst" goes out without waiting 1 second
  if (_pendingCount === 0) {
    _queue = Promise.resolve();
    _lastRequestTime = 0;
  }

  _pendingCount++;

  const result = _queue.then(async (): Promise<GeoResult | null> => {
    try {
      // Apply rate limit delay only when a previous request has been made
      if (_lastRequestTime !== 0) {
        const now = Date.now();
        const elapsed = now - _lastRequestTime;
        const wait = RATE_LIMIT_MS - elapsed;
        await _delay(wait);
      }

      // Build structured Nominatim query
      const streetParam =
        addr.number != null && addr.number !== ""
          ? `${addr.street}, ${addr.number}`
          : addr.street;

      const url = new URL(NOMINATIM_BASE);
      url.searchParams.set("format", "jsonv2");
      url.searchParams.set("limit", "1");
      url.searchParams.set("countrycodes", "br");
      url.searchParams.set("street", streetParam);
      url.searchParams.set("city", "Porto Alegre");
      url.searchParams.set("state", "Rio Grande do Sul");

      _lastRequestTime = Date.now();

      const response = await fetch(url.toString(), {
        headers: { "User-Agent": USER_AGENT },
      });

      let results: {
        lat: string;
        lon: string;
        importance: number;
        display_name: string;
      }[];
      try {
        // Clone before reading so the same mock Response can be read by multiple
        // calls in tests (real fetch always returns fresh responses).
        results = (await response.clone().json()) as typeof results;
      } catch {
        try {
          results = (await response.json()) as typeof results;
        } catch {
          return null;
        }
      }

      if (!results.length) return null;

      const hit = results[0];
      return {
        lat: parseFloat(hit.lat),
        lng: parseFloat(hit.lon),
        confidence: mapImportance(hit.importance),
        importance: hit.importance,
        displayName: hit.display_name,
      };
    } finally {
      _pendingCount--;
    }
  });

  // Advance the shared queue (absorb errors so one failure doesn't block later calls)
  _queue = result.then(
    () => undefined,
    () => undefined
  );

  return result;
}
