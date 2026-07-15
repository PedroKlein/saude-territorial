import { describe, it, expect } from "vitest";
import { formatDistance, formatDuration } from "./format";

describe("formatDistance", () => {
  it("formats meters below 1000 as 'm'", () => {
    expect(formatDistance(350)).toBe("350 m");
  });

  it("formats meters >= 1000 as km with comma decimal (PT-BR)", () => {
    expect(formatDistance(1200)).toBe("1,2 km");
  });

  it("formats exact kilometers without decimal", () => {
    expect(formatDistance(3000)).toBe("3 km");
  });

  it("rounds meters to whole number", () => {
    expect(formatDistance(456.7)).toBe("457 m");
  });
});

describe("formatDuration", () => {
  it("formats seconds < 60 as '< 1 min'", () => {
    expect(formatDuration(45)).toBe("< 1 min");
  });

  it("formats seconds as minutes", () => {
    expect(formatDuration(2700)).toBe("45 min");
  });

  it("formats seconds >= 3600 as hours + minutes", () => {
    expect(formatDuration(4800)).toBe("1h 20min");
  });

  it("formats exact hours without minutes part", () => {
    expect(formatDuration(7200)).toBe("2h");
  });
});
