import { describe, it, expect, beforeEach } from "vitest";
import { useRoutePlannerStore } from "./routePlannerStore";

describe("routePlannerStore", () => {
  beforeEach(() => {
    useRoutePlannerStore.setState(useRoutePlannerStore.getInitialState());
  });

  it("starts with empty waypoints and planning mode off", () => {
    const state = useRoutePlannerStore.getState();
    expect(state.waypoints).toEqual([]);
    expect(state.isPlanning).toBe(false);
    expect(state.optimizedRoute).toBeNull();
  });

  it("addWaypoint adds a waypoint to the list", () => {
    const { addWaypoint } = useRoutePlannerStore.getState();

    addWaypoint({ cns: "111000000000001", lat: -30.07, lng: -51.22, name: "Paciente A" });
    addWaypoint({ cns: "111000000000002", lat: -30.08, lng: -51.23, name: "Paciente B" });

    const { waypoints } = useRoutePlannerStore.getState();
    expect(waypoints).toHaveLength(2);
    expect(waypoints[0].cns).toBe("111000000000001");
    expect(waypoints[1].name).toBe("Paciente B");
  });

  it("addWaypoint does not add duplicate CNS", () => {
    const { addWaypoint } = useRoutePlannerStore.getState();

    addWaypoint({ cns: "111000000000001", lat: -30.07, lng: -51.22, name: "Paciente A" });
    addWaypoint({ cns: "111000000000001", lat: -30.07, lng: -51.22, name: "Paciente A" });

    expect(useRoutePlannerStore.getState().waypoints).toHaveLength(1);
  });

  it("removeWaypoint removes by CNS", () => {
    const { addWaypoint } = useRoutePlannerStore.getState();

    addWaypoint({ cns: "111000000000001", lat: -30.07, lng: -51.22, name: "Paciente A" });
    addWaypoint({ cns: "111000000000002", lat: -30.08, lng: -51.23, name: "Paciente B" });

    useRoutePlannerStore.getState().removeWaypoint("111000000000001");

    const { waypoints } = useRoutePlannerStore.getState();
    expect(waypoints).toHaveLength(1);
    expect(waypoints[0].cns).toBe("111000000000002");
  });

  it("reorderWaypoints swaps positions", () => {
    const { addWaypoint } = useRoutePlannerStore.getState();

    addWaypoint({ cns: "111000000000001", lat: -30.07, lng: -51.22, name: "A" });
    addWaypoint({ cns: "111000000000002", lat: -30.08, lng: -51.23, name: "B" });
    addWaypoint({ cns: "111000000000003", lat: -30.09, lng: -51.24, name: "C" });

    useRoutePlannerStore.getState().reorderWaypoints(0, 2);

    const { waypoints } = useRoutePlannerStore.getState();
    expect(waypoints[0].name).toBe("B");
    expect(waypoints[1].name).toBe("C");
    expect(waypoints[2].name).toBe("A");
  });

  it("clearPlan resets waypoints and route", () => {
    const { addWaypoint, setOptimizedRoute } = useRoutePlannerStore.getState();

    addWaypoint({ cns: "111000000000001", lat: -30.07, lng: -51.22, name: "A" });
    setOptimizedRoute({
      distance: 1000,
      duration: 300,
      geometry: { type: "LineString", coordinates: [] },
    });

    useRoutePlannerStore.getState().clearPlan();

    const state = useRoutePlannerStore.getState();
    expect(state.waypoints).toEqual([]);
    expect(state.optimizedRoute).toBeNull();
  });

  it("togglePlanningMode flips isPlanning", () => {
    expect(useRoutePlannerStore.getState().isPlanning).toBe(false);

    useRoutePlannerStore.getState().togglePlanningMode();
    expect(useRoutePlannerStore.getState().isPlanning).toBe(true);

    useRoutePlannerStore.getState().togglePlanningMode();
    expect(useRoutePlannerStore.getState().isPlanning).toBe(false);
  });
});
