import { describe, it, expect } from "vitest";
import {
  buildCoincidenceMap,
  worstAlertLevel,
  coincidenceKey,
} from "./markerHelpers";

describe("coincidenceKey", () => {
  it("rounds to 6 decimal places", () => {
    // -30.034567891 rounds to -30.034568 at 6dp
    expect(coincidenceKey(-30.034567891, -51.217812345)).toBe(
      "-30.034568,-51.217812",
    );
  });

  it("same coords produce the same key", () => {
    expect(coincidenceKey(-30.0, -51.0)).toBe(coincidenceKey(-30.0, -51.0));
  });

  it("different coords produce different keys", () => {
    expect(coincidenceKey(-30.0, -51.0)).not.toBe(
      coincidenceKey(-30.0, -51.000001),
    );
  });
});

describe("buildCoincidenceMap", () => {
  it("empty list returns empty map", () => {
    expect(buildCoincidenceMap([]).size).toBe(0);
  });

  it("single patient → count 1", () => {
    const m = buildCoincidenceMap([{ lat: -30.0, lng: -51.0 }]);
    expect(m.get("-30.000000,-51.000000")).toBe(1);
  });

  it("two patients at same coord → count 2", () => {
    const m = buildCoincidenceMap([
      { lat: -30.0, lng: -51.0 },
      { lat: -30.0, lng: -51.0 },
    ]);
    expect(m.get("-30.000000,-51.000000")).toBe(2);
  });

  it("patients at distinct coords are counted independently", () => {
    const m = buildCoincidenceMap([
      { lat: -30.0, lng: -51.0 },
      { lat: -30.1, lng: -51.1 },
      { lat: -30.0, lng: -51.0 },
    ]);
    expect(m.get("-30.000000,-51.000000")).toBe(2);
    expect(m.get("-30.100000,-51.100000")).toBe(1);
  });

  it("three overlapping + one isolated", () => {
    const m = buildCoincidenceMap([
      { lat: -30.0, lng: -51.0 },
      { lat: -30.0, lng: -51.0 },
      { lat: -30.0, lng: -51.0 },
      { lat: -30.5, lng: -51.5 },
    ]);
    expect(m.get("-30.000000,-51.000000")).toBe(3);
    expect(m.get("-30.500000,-51.500000")).toBe(1);
    expect(m.size).toBe(2);
  });
});

describe("worstAlertLevel", () => {
  it("returns verde for empty array", () => {
    expect(worstAlertLevel([])).toBe("verde");
  });

  it("singleton — returns the sole level", () => {
    expect(worstAlertLevel(["amarelo"])).toBe("amarelo");
    expect(worstAlertLevel(["vermelho"])).toBe("vermelho");
    expect(worstAlertLevel(["verde"])).toBe("verde");
  });

  it("vermelho beats amarelo", () => {
    expect(worstAlertLevel(["amarelo", "vermelho"])).toBe("vermelho");
    expect(worstAlertLevel(["vermelho", "amarelo"])).toBe("vermelho");
  });

  it("amarelo beats verde", () => {
    expect(worstAlertLevel(["verde", "amarelo", "verde"])).toBe("amarelo");
  });

  it("all verde → verde", () => {
    expect(worstAlertLevel(["verde", "verde", "verde"])).toBe("verde");
  });

  it("vermelho beats all combinations", () => {
    expect(
      worstAlertLevel(["verde", "amarelo", "vermelho", "verde"]),
    ).toBe("vermelho");
  });

  it("order-independent — same result regardless of position", () => {
    expect(worstAlertLevel(["vermelho", "verde", "verde"])).toBe("vermelho");
    expect(worstAlertLevel(["verde", "verde", "vermelho"])).toBe("vermelho");
  });
});
