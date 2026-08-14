import { describe, expect, it } from "vitest";

import { computeCnsChecksum, isValidCns } from "./cns";

describe("CNS validation", () => {
  it("rejects strings that are not 15 digits", () => {
    expect(isValidCns("")).toBe(false);
    expect(isValidCns("123")).toBe(false);
    expect(isValidCns("1234567890abcde")).toBe(false);
    // 14 digits
    expect(isValidCns("12345678901234")).toBe(false);
    // 16 digits
    expect(isValidCns("1234567890123456")).toBe(false);
  });

  it("rejects prefixes outside the known families", () => {
    // Prefix 3..6 is unassigned in the SUS numbering plan.
    expect(isValidCns("300000000000000")).toBe(false);
    expect(isValidCns("400000000000000")).toBe(false);
  });

  it("accepts a definitive CNS whose tail matches the checksum", () => {
    // Prefix designed so the checksum computes cleanly.
    const prefix = "12345678901";
    const tail = computeCnsChecksum(prefix);
    const full = prefix + tail;
    expect(isValidCns(full)).toBe(true);
  });

  it("rejects a definitive CNS with a tampered digit", () => {
    const prefix = "12345678901";
    const full = prefix + computeCnsChecksum(prefix);
    const tampered =
      full.slice(0, 5) +
      // flip the middle digit
      String((Number(full[5]) + 1) % 10) +
      full.slice(6);
    expect(isValidCns(tampered)).toBe(false);
  });

  it("computeCnsChecksum is deterministic", () => {
    expect(computeCnsChecksum("12345678901")).toBe(computeCnsChecksum("12345678901"));
  });

  it("computeCnsChecksum throws on malformed input", () => {
    expect(() => computeCnsChecksum("12345")).toThrow();
    expect(() => computeCnsChecksum("abcdefghijk")).toThrow();
    // provisional family prefix — computeCnsChecksum only covers definitive.
    expect(() => computeCnsChecksum("70000000000")).toThrow();
  });

  it("validates a broad sweep of definitive prefixes", () => {
    // Fuzz — every deterministic prefix must round-trip through the pair.
    for (let seed = 0; seed < 200; seed++) {
      const digits = (seed * 9973).toString().padStart(10, "0").slice(-10);
      const prefix = `1${digits}`;
      const tail = computeCnsChecksum(prefix);
      expect(isValidCns(prefix + tail)).toBe(true);
    }
  });
});
