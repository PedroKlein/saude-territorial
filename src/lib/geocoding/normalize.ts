/**
 * Brazilian address normalization for Porto Alegre geocoding.
 *
 * Expands common street-type abbreviations, converts "s/n" to null,
 * strips non-numeric number suffixes, and always attaches the default
 * city/state/country for Nominatim queries.
 *
 * LGPD: This module never logs or persists addresses — it only transforms them.
 */

import type { NormalizedAddress } from "@/lib/geocoding/types";

// Abbreviation table — order matters: longer prefixes must come before shorter
// ones so "Trav." is matched before a hypothetical single-letter prefix.
const ABBREVIATIONS: [RegExp, string][] = [
  [/^trav\.\s*/i, "Travessa "],
  [/^est\.\s*/i, "Estrada "],
  [/^pç\.\s*/i, "Praça "],
  [/^pc\.\s*/i, "Praça "],
  [/^bco\.\s*/i, "Beco "],
  [/^bc\.\s*/i, "Beco "],
  [/^av\.\s*/i, "Avenida "],
  [/^r\.\s*/i, "Rua "],
];

function capitalizeWords(s: string): string {
  return s
    .split(" ")
    .map((w) => (w.length > 0 ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

function expandAbbreviation(raw: string): string {
  const trimmed = raw.trim();
  for (const [pattern, replacement] of ABBREVIATIONS) {
    if (pattern.test(trimmed)) {
      return capitalizeWords(
        replacement + trimmed.replace(pattern, "").trim()
      );
    }
  }
  return capitalizeWords(trimmed);
}

function cleanNumber(numero: string): string | null {
  const trimmed = numero.trim();
  if (trimmed === "") return null;
  if (/^s\/n$/i.test(trimmed)) return null;

  const match = /^(\d+)/.exec(trimmed);
  if (!match) return null;
  return match[1];
}

/**
 * Normalizes separate street and number fields.
 *
 * @param rua    - Raw street string (may contain abbreviations).
 * @param numero - Raw house number (may be "s/n", "100-A", empty, …).
 * @param bairro - Optional neighbourhood name (passed through unchanged).
 */
export function normalizeAddress(
  rua: string,
  numero: string,
  bairro?: string
): NormalizedAddress {
  return {
    street: expandAbbreviation(rua),
    number: cleanNumber(numero),
    city: "Porto Alegre",
    state: "RS",
    country: "br",
    ...(bairro !== undefined ? { bairro } : {}),
  };
}

/**
 * Splits a combined "Rua X, 123" string and delegates to normalizeAddress.
 * If no comma-separated number is present, number defaults to null.
 */
export function normalizeAddressCombined(combined: string): NormalizedAddress {
  const commaIdx = combined.lastIndexOf(",");
  if (commaIdx === -1) {
    return normalizeAddress(combined.trim(), "");
  }

  const streetPart = combined.slice(0, commaIdx).trim();
  const numberPart = combined.slice(commaIdx + 1).trim();
  return normalizeAddress(streetPart, numberPart);
}
