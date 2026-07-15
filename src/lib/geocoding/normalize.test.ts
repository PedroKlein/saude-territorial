/**
 * TDD Red Phase — address normalization contract
 *
 * These tests define the expected behaviour of lib/geocoding/normalize.ts.
 * They will FAIL until the implementation is written.
 *
 * Contracts:
 *  - `normalizeAddress` expands street-type abbreviations to their full forms
 *  - "s/n" (sem número) is converted to a null number
 *  - A combined "Rua X, 123" string can be split into street + number
 *  - The resulting NormalizedAddress always carries city="Porto Alegre" and state="RS"
 *
 * SYNTHETIC DATA ONLY — no real patient addresses.
 */

import { describe, it, expect } from "vitest";

// ---------------------------------------------------------------------------
// normalizeAddress
// ---------------------------------------------------------------------------

describe("normalizeAddress — abbreviation expansion", () => {
  it('expands "R." prefix to "Rua"', async () => {
    const { normalizeAddress } = await import("@/lib/geocoding/normalize");
    const result = normalizeAddress("R. Exemplo", "100");
    expect(result.street).toMatch(/^Rua /i);
    expect(result.street).not.toMatch(/^R\./);
  });

  it('expands "Av." prefix to "Avenida"', async () => {
    const { normalizeAddress } = await import("@/lib/geocoding/normalize");
    const result = normalizeAddress("Av. Fictícia", "200");
    expect(result.street).toMatch(/^Avenida /i);
    expect(result.street).not.toMatch(/^Av\./);
  });

  it('expands "Trav." prefix to "Travessa"', async () => {
    const { normalizeAddress } = await import("@/lib/geocoding/normalize");
    const result = normalizeAddress("Trav. Teste", "50");
    expect(result.street).toMatch(/^Travessa /i);
    expect(result.street).not.toMatch(/^Trav\./);
  });

  it("preserves already-expanded street types without double-expansion", async () => {
    const { normalizeAddress } = await import("@/lib/geocoding/normalize");
    const result = normalizeAddress("Rua Exemplo", "100");
    // Must not become "Rua Rua Exemplo"
    expect(result.street).not.toMatch(/^Rua Rua/i);
    expect(result.street).toMatch(/^Rua Exemplo/i);
  });

  it("handles case-insensitive abbreviation matching", async () => {
    const { normalizeAddress } = await import("@/lib/geocoding/normalize");
    const lower = normalizeAddress("r. Exemplo", "10");
    expect(lower.street).toMatch(/^Rua /i);
  });
});

// ---------------------------------------------------------------------------
// sem número (s/n)
// ---------------------------------------------------------------------------

describe("normalizeAddress — sem número handling", () => {
  it('returns null number when numero is "s/n"', async () => {
    const { normalizeAddress } = await import("@/lib/geocoding/normalize");
    const result = normalizeAddress("Rua Exemplo", "s/n");
    expect(result.number).toBeNull();
  });

  it('returns null number when numero is "S/N" (uppercase)', async () => {
    const { normalizeAddress } = await import("@/lib/geocoding/normalize");
    const result = normalizeAddress("Rua Exemplo", "S/N");
    expect(result.number).toBeNull();
  });

  it("returns a non-null number when a valid house number is provided", async () => {
    const { normalizeAddress } = await import("@/lib/geocoding/normalize");
    const result = normalizeAddress("Rua Exemplo", "123");
    expect(result.number).toBe("123");
  });

  it('strips non-numeric suffixes from numbers ("100-A" → "100")', async () => {
    const { normalizeAddress } = await import("@/lib/geocoding/normalize");
    const result = normalizeAddress("Rua Exemplo", "100-A");
    expect(result.number).toBe("100");
  });

  it('strips "fundos" suffix from numbers ("100 fundos" → "100")', async () => {
    const { normalizeAddress } = await import("@/lib/geocoding/normalize");
    const result = normalizeAddress("Rua Exemplo", "100 fundos");
    expect(result.number).toBe("100");
  });

  it("returns null when numero is empty string", async () => {
    const { normalizeAddress } = await import("@/lib/geocoding/normalize");
    const result = normalizeAddress("Rua Exemplo", "");
    expect(result.number).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Combined "Rua X, 123" string splitting
// ---------------------------------------------------------------------------

describe("normalizeAddress — combined street+number splitting", () => {
  it('splits "Rua Exemplo, 100" into street "Rua Exemplo" and number "100"', async () => {
    const { normalizeAddressCombined } = await import(
      "@/lib/geocoding/normalize"
    );
    const result = normalizeAddressCombined("Rua Exemplo, 100");
    expect(result.street).toMatch(/^Rua Exemplo/i);
    expect(result.number).toBe("100");
  });

  it("expands abbreviations in combined strings", async () => {
    const { normalizeAddressCombined } = await import(
      "@/lib/geocoding/normalize"
    );
    const result = normalizeAddressCombined("R. Fictícia, 42");
    expect(result.street).toMatch(/^Rua /i);
    expect(result.number).toBe("42");
  });

  it("handles combined string without a number", async () => {
    const { normalizeAddressCombined } = await import(
      "@/lib/geocoding/normalize"
    );
    const result = normalizeAddressCombined("Rua Exemplo");
    expect(result.street).toMatch(/^Rua Exemplo/i);
    expect(result.number).toBeNull();
  });

  it('handles "s/n" in combined string', async () => {
    const { normalizeAddressCombined } = await import(
      "@/lib/geocoding/normalize"
    );
    const result = normalizeAddressCombined("Rua Exemplo, s/n");
    expect(result.street).toMatch(/^Rua Exemplo/i);
    expect(result.number).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// City / state defaults
// ---------------------------------------------------------------------------

describe("normalizeAddress — default city and state", () => {
  it("always sets city to Porto Alegre", async () => {
    const { normalizeAddress } = await import("@/lib/geocoding/normalize");
    const result = normalizeAddress("Rua Exemplo", "100");
    expect(result.city).toBe("Porto Alegre");
  });

  it("always sets state to RS", async () => {
    const { normalizeAddress } = await import("@/lib/geocoding/normalize");
    const result = normalizeAddress("Rua Exemplo", "100");
    expect(result.state).toBe("RS");
  });

  it("always sets country to br", async () => {
    const { normalizeAddress } = await import("@/lib/geocoding/normalize");
    const result = normalizeAddress("Rua Exemplo", "100");
    expect(result.country).toBe("br");
  });

  it("passes optional bairro through to the result", async () => {
    const { normalizeAddress } = await import("@/lib/geocoding/normalize");
    const result = normalizeAddress("Rua Exemplo", "100", "Bairro Fictício");
    expect(result.bairro).toBe("Bairro Fictício");
  });

  it("bairro is undefined when not provided", async () => {
    const { normalizeAddress } = await import("@/lib/geocoding/normalize");
    const result = normalizeAddress("Rua Exemplo", "100");
    expect(result.bairro).toBeUndefined();
  });
});
