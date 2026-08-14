import { describe, it, expect, beforeEach } from "vitest";
import { useMapStore } from "./mapStore";

describe("mapStore", () => {
  beforeEach(() => {
    // Reset store between tests
    useMapStore.setState(useMapStore.getInitialState());
  });

  it("has all layers active by default", () => {
    const state = useMapStore.getState();
    expect(state.activeLayers.gestantes).toBe(true);
    expect(state.activeLayers.tuberculose).toBe(true);
    expect(state.activeLayers.diabetes).toBe(true);
    expect(state.activeLayers.hipertensao).toBe(true);
    expect(state.activeLayers.acamados).toBe(true);
    expect(state.activeLayers.pse).toBe(true);
    expect(state.activeLayers.ilpi).toBe(true);
  });

  it("toggleLayer flips a layer on/off", () => {
    const { toggleLayer } = useMapStore.getState();

    toggleLayer("gestantes");
    expect(useMapStore.getState().activeLayers.gestantes).toBe(false);

    toggleLayer("gestantes");
    expect(useMapStore.getState().activeLayers.gestantes).toBe(true);
  });

  it("setSelectedPatient sets and clears selected patient (accepts patient UUID)", () => {
    const { setSelectedPatient } = useMapStore.getState();

    expect(useMapStore.getState().selectedPatient).toBeNull();

    setSelectedPatient("550e8400-e29b-41d4-a716-446655440000");
    expect(useMapStore.getState().selectedPatient).toBe("550e8400-e29b-41d4-a716-446655440000");

    setSelectedPatient(null);
    expect(useMapStore.getState().selectedPatient).toBeNull();
  });

  it("has Porto Alegre as default center", () => {
    const state = useMapStore.getState();
    expect(state.mapCenter[0]).toBeCloseTo(-30.0346, 3);
    expect(state.mapCenter[1]).toBeCloseTo(-51.2177, 3);
    expect(state.mapZoom).toBe(14);
  });
});
