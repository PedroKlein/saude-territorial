export type GeoConfidence = "high" | "medium" | "low";

export type NormalizedAddress = {
  street: string;
  number: string | null;
  city: string;
  state: string;
  country: string;
  bairro?: string;
}

export type Coordinates = {
  lat: number;
  lng: number;
  confidence: GeoConfidence;
  /**
   * Raw Nominatim `importance` score (0..1). Persisted verbatim in the
   * `geocode_cache` table so the confidence bucketing policy stays a
   * runtime concern (`mapImportance`) — reclassify without a migration if
   * the thresholds change.
   */
  importance: number;
  /** Nominatim `display_name` — free-form, human-readable. */
  displayName?: string;
}

export type GeoResult = Coordinates;
