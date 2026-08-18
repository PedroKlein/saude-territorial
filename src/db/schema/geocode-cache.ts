import { doublePrecision, pgTable, text, timestamp } from "drizzle-orm/pg-core";

/**
 * `geocode_cache` — Nominatim result cache.
 *
 * Every address the app geocodes lands here keyed on a deterministic
 * normalized form of `city|street|number` (see `src/lib/geocoding/normalize.ts`
 * and `src/lib/geocoding/cache.ts`).
 *
 * `confidence` is Nominatim's `importance` field (0..1). See the geospatial
 * skill for the threshold policy (< 0.4 = "endereço aproximado" fallback).
 *
 * NOT keyed on the patient — cache entries are address-scoped and reusable
 * across patients living at the same address (siblings, multi-generational
 * households).
 */
export const geocodeCache = pgTable("geocode_cache", {
  key: text("key").primaryKey(),
  lat: doublePrecision("lat").notNull(),
  lng: doublePrecision("lng").notNull(),
  confidence: doublePrecision("confidence").notNull(),
  displayName: text("display_name"),
  cachedAt: timestamp("cached_at", { withTimezone: true }).notNull().defaultNow(),
});

export type GeocodeCacheEntry = typeof geocodeCache.$inferSelect;
export type NewGeocodeCacheEntry = typeof geocodeCache.$inferInsert;
