/**
 * Supabase coordinate cache for geocoded addresses.
 *
 * Cache key is constructed from city|street|number (all lowercase) to ensure
 * "R. Flores 100" and "Rua Flores, 100" share the same cache slot after
 * normalization.
 *
 * Table: geocode_cache
 *   cache_key  TEXT PRIMARY KEY
 *   lat        DOUBLE PRECISION NOT NULL
 *   lng        DOUBLE PRECISION NOT NULL
 *   confidence TEXT NOT NULL
 *
 * LGPD: Cache keys are derived from normalized street addresses only — no
 * patient names, CNS, or health conditions are ever written here.
 */

import { createClient } from "@/lib/supabase/server";
import type { NormalizedAddress, Coordinates } from "@/lib/geocoding/types";

const TABLE = "geocode_cache";

/**
 * Produces a deterministic, lowercase cache key for a NormalizedAddress.
 * "porto alegre|rua das flores|100"
 */
export function buildCacheKey(addr: NormalizedAddress): string {
  const number = addr.number ?? "";
  return `${addr.city}|${addr.street}|${number}`.toLowerCase();
}

/**
 * Returns cached coordinates for the given address, or null on a cache miss.
 */
export async function getCachedCoordinates(
  addr: NormalizedAddress
): Promise<Coordinates | null> {
  const client = await createClient();
  const key = buildCacheKey(addr);

  const { data, error } = await client
    .from(TABLE)
    .select("lat, lng, confidence, cache_key")
    .eq("cache_key", key)
    .single();

  if (error) {
    // PGRST116 = no rows found — treat as cache miss, not an error
    if (error.code === "PGRST116") return null;
    // Any other Supabase error is unexpected but we return null gracefully
    // (geocoding can proceed via Nominatim; we don't break the user flow)
    return null;
  }

  if (!data) return null;

  return {
    lat: data.lat as number,
    lng: data.lng as number,
    confidence: data.confidence as Coordinates["confidence"],
  };
}

/**
 * Upserts a geocoding result into the cache.
 * Throws if the database write fails.
 */
export async function upsertCachedCoordinates(
  addr: NormalizedAddress,
  coords: Coordinates
): Promise<void> {
  const client = await createClient();
  const key = buildCacheKey(addr);

  const { error } = await client.from(TABLE).upsert({
    cache_key: key,
    lat: coords.lat,
    lng: coords.lng,
    confidence: coords.confidence,
  });

  if (error) {
    throw new Error(`Geocode cache upsert failed: ${error.message}`);
  }
}
