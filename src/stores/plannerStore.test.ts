import { describe, it, expect, beforeEach } from "vitest";
import { usePlannerStore, PLAN_LIMIT } from "./plannerStore";

// ---------------------------------------------------------------------------
// Reset store to a known baseline before every test.
// ---------------------------------------------------------------------------

beforeEach(() => {
  usePlannerStore.setState({
    stops: [],
    limitBannerVisible: false,
    mapSelectMode: false,
  });
});

// ---------------------------------------------------------------------------
// addStopsUpTo
// ---------------------------------------------------------------------------

describe("addStopsUpTo", () => {
  it("adds all ids when under the limit", () => {
    const ids = ["p1", "p2", "p3"];
    const added = usePlannerStore.getState().addStopsUpTo(ids);
    expect(added).toBe(3);
    expect(usePlannerStore.getState().stops).toHaveLength(3);
  });

  it("clamps to PLAN_LIMIT when the batch exceeds remaining capacity", () => {
    const ids = Array.from({ length: PLAN_LIMIT + 5 }, (_, i) => `patient-${i}`);
    const added = usePlannerStore.getState().addStopsUpTo(ids);
    expect(added).toBe(PLAN_LIMIT);
    expect(usePlannerStore.getState().stops).toHaveLength(PLAN_LIMIT);
  });

  it("only fills the remaining slots when stops already exist", () => {
    const existing = Array.from({ length: 10 }, (_, i) => ({
      patientId: `existing-${i}`,
      order: i + 1,
    }));
    usePlannerStore.setState({ stops: existing });

    const newIds = ["new-a", "new-b", "new-c", "new-d", "new-e"];
    const added = usePlannerStore.getState().addStopsUpTo(newIds);
    // 12 - 10 = 2 remaining slots
    expect(added).toBe(2);
    expect(usePlannerStore.getState().stops).toHaveLength(12);
  });

  it("deduplicates new ids against existing stops", () => {
    const existing = [{ patientId: "existing-1", order: 1 }];
    usePlannerStore.setState({ stops: existing });

    const ids = ["existing-1", "new-1", "new-2"];
    const added = usePlannerStore.getState().addStopsUpTo(ids);
    // existing-1 is skipped; new-1 and new-2 are added
    expect(added).toBe(2);
    expect(usePlannerStore.getState().stops).toHaveLength(3);
  });

  it("returns 0 and sets limitBannerVisible when already at PLAN_LIMIT", () => {
    const full = Array.from({ length: PLAN_LIMIT }, (_, i) => ({
      patientId: `p-${i}`,
      order: i + 1,
    }));
    usePlannerStore.setState({ stops: full, limitBannerVisible: false });

    const added = usePlannerStore.getState().addStopsUpTo(["overflow"]);
    expect(added).toBe(0);
    expect(usePlannerStore.getState().limitBannerVisible).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// addStopIfBelowLimit
// ---------------------------------------------------------------------------

describe("addStopIfBelowLimit", () => {
  it("adds the stop and returns true when below the limit", () => {
    const wasAdded = usePlannerStore.getState().addStopIfBelowLimit("patient-1");
    expect(wasAdded).toBe(true);
    expect(usePlannerStore.getState().stops).toHaveLength(1);
    expect(usePlannerStore.getState().stops[0]!.patientId).toBe("patient-1");
  });

  it("returns false and does not add when at PLAN_LIMIT", () => {
    const full = Array.from({ length: PLAN_LIMIT }, (_, i) => ({
      patientId: `p-${i}`,
      order: i + 1,
    }));
    usePlannerStore.setState({ stops: full });

    const wasAdded = usePlannerStore.getState().addStopIfBelowLimit("new-patient");
    expect(wasAdded).toBe(false);
    expect(usePlannerStore.getState().stops).toHaveLength(PLAN_LIMIT);
  });
});

// ---------------------------------------------------------------------------
// limit banner
// ---------------------------------------------------------------------------

describe("limit banner", () => {
  it("sets limitBannerVisible when addStopsUpTo clamps at PLAN_LIMIT", () => {
    const full = Array.from({ length: PLAN_LIMIT }, (_, i) => ({
      patientId: `p-${i}`,
      order: i + 1,
    }));
    usePlannerStore.setState({ stops: full, limitBannerVisible: false });

    usePlannerStore.getState().addStopsUpTo(["overflow-patient"]);
    expect(usePlannerStore.getState().limitBannerVisible).toBe(true);
  });

  it("sets limitBannerVisible when addStopIfBelowLimit is rejected at PLAN_LIMIT", () => {
    const full = Array.from({ length: PLAN_LIMIT }, (_, i) => ({
      patientId: `p-${i}`,
      order: i + 1,
    }));
    usePlannerStore.setState({ stops: full, limitBannerVisible: false });

    usePlannerStore.getState().addStopIfBelowLimit("overflow-patient");
    expect(usePlannerStore.getState().limitBannerVisible).toBe(true);
  });

  it("setLimitBannerVisible toggles the flag", () => {
    usePlannerStore.getState().setLimitBannerVisible(true);
    expect(usePlannerStore.getState().limitBannerVisible).toBe(true);

    usePlannerStore.getState().setLimitBannerVisible(false);
    expect(usePlannerStore.getState().limitBannerVisible).toBe(false);
  });
});
