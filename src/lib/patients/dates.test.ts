import { describe, expect, it } from "vitest";

import { computeDpp, computeIg, formatIg } from "./dates";

describe("computeDpp — Naegele (DUM + 280 days)", () => {
  it("adds exactly 280 days to a mid-year date", () => {
    const dum = new Date(Date.UTC(2025, 0, 1)); // 2025-01-01
    const dpp = computeDpp(dum);
    // 2025-01-01 + 280d = 2025-10-08
    expect(dpp.toISOString().slice(0, 10)).toBe("2025-10-08");
  });

  it("does not mutate the input", () => {
    const dum = new Date(Date.UTC(2024, 5, 15));
    const before = dum.getTime();
    computeDpp(dum);
    expect(dum.getTime()).toBe(before);
  });

  it("crosses a year boundary correctly", () => {
    const dum = new Date(Date.UTC(2025, 5, 1)); // 2025-06-01
    // +280d → 2026-03-08
    expect(computeDpp(dum).toISOString().slice(0, 10)).toBe("2026-03-08");
  });
});

describe("computeIg — gestational age (weeks + days)", () => {
  it("returns 0 sem when at === dum", () => {
    const d = new Date(Date.UTC(2025, 0, 10));
    expect(computeIg(d, d)).toEqual({ weeks: 0, days: 0 });
  });

  it("returns 0 sem for at < dum", () => {
    const dum = new Date(Date.UTC(2025, 0, 10));
    const at = new Date(Date.UTC(2024, 11, 20));
    expect(computeIg(dum, at)).toEqual({ weeks: 0, days: 0 });
  });

  it("floors partial weeks and captures trailing days", () => {
    const dum = new Date(Date.UTC(2025, 0, 1));
    // +10d → 1 sem + 3d
    const at = new Date(Date.UTC(2025, 0, 11));
    expect(computeIg(dum, at)).toEqual({ weeks: 1, days: 3 });
  });

  it("reports 38+2 for a typical late-term pregnancy", () => {
    const dum = new Date(Date.UTC(2025, 0, 1));
    // +268d = 38 sem + 2d
    const at = new Date(Date.UTC(2025, 0, 1 + 38 * 7 + 2));
    expect(computeIg(dum, at)).toEqual({ weeks: 38, days: 2 });
  });

  it("does not cap post-42-week values (caller decides)", () => {
    const dum = new Date(Date.UTC(2025, 0, 1));
    const at = new Date(Date.UTC(2025, 0, 1 + 43 * 7));
    expect(computeIg(dum, at)).toEqual({ weeks: 43, days: 0 });
  });
});

describe("formatIg", () => {
  it("omits trailing days when zero", () => {
    expect(formatIg({ weeks: 38, days: 0 })).toBe("38 sem");
  });

  it("appends the day count when non-zero", () => {
    expect(formatIg({ weeks: 38, days: 4 })).toBe("38 sem + 4d");
  });
});
