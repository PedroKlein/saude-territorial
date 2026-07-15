/**
 * Geocoding types for the saude-territorial project.
 *
 * NormalizedAddress — the canonical form of a Brazilian address after
 * abbreviation expansion and number cleaning.
 *
 * Coordinates — a geocoded result with confidence level.
 *
 * GeoResult — alias for Coordinates (returned by the Nominatim client).
 */

export type GeoConfidence = "high" | "medium" | "low";

export interface NormalizedAddress {
  street: string;
  number: string | null;
  city: string;
  state: string;
  country: string;
  bairro?: string;
}

export interface Coordinates {
  lat: number;
  lng: number;
  confidence: GeoConfidence;
}

export type GeoResult = Coordinates;
