import { describe, it, expect, beforeEach } from "vitest";
import { useFilterStore } from "./filterStore";

describe("filterStore", () => {
  beforeEach(() => {
    useFilterStore.setState(useFilterStore.getInitialState());
  });

  it("filters patients by single microárea", () => {
    const { applyFilters } = useFilterStore.getState();
    useFilterStore.getState().setMicroareaFilter(["MA1"]);

    const patients = [
      { cns: "001", microarea: "MA1" },
      { cns: "002", microarea: "MA2" },
      { cns: "003", microarea: "MA1" },
    ];

    const result = applyFilters(patients);
    expect(result).toHaveLength(2);
    expect(result.every((p) => p.microarea === "MA1")).toBe(true);
  });

  it("filters patients by alert level", () => {
    const { applyFilters } = useFilterStore.getState();
    useFilterStore.getState().setAlertFilter(["vermelho"]);

    const patients = [
      { cns: "001", alertLevel: "vermelho" },
      { cns: "002", alertLevel: "amarelo" },
      { cns: "003", alertLevel: "vermelho" },
      { cns: "004", alertLevel: "verde" },
    ];

    const result = applyFilters(patients);
    expect(result).toHaveLength(2);
    expect(result.every((p) => p.alertLevel === "vermelho")).toBe(true);
  });

  it("filters patients by date range (dataUltimaAtualizacao)", () => {
    const { applyFilters } = useFilterStore.getState();
    // Only patients updated in the last 10 days
    const now = new Date();
    const tenDaysAgo = new Date(now);
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

    useFilterStore.getState().setDateRange({
      from: tenDaysAgo.toISOString(),
      to: now.toISOString(),
    });

    const fiveDaysAgo = new Date(now);
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
    const twentyDaysAgo = new Date(now);
    twentyDaysAgo.setDate(twentyDaysAgo.getDate() - 20);

    const patients = [
      { cns: "001", dataUltimaAtualizacao: fiveDaysAgo.toISOString() },
      { cns: "002", dataUltimaAtualizacao: twentyDaysAgo.toISOString() },
    ];

    const result = applyFilters(patients);
    expect(result).toHaveLength(1);
    expect(result[0]!.cns).toBe("001");
  });

  it("applies combined filters (microárea + alert)", () => {
    const { applyFilters } = useFilterStore.getState();
    useFilterStore.getState().setMicroareaFilter(["MA2"]);
    useFilterStore.getState().setAlertFilter(["amarelo"]);

    const patients = [
      { cns: "001", microarea: "MA2", alertLevel: "amarelo" },
      { cns: "002", microarea: "MA2", alertLevel: "verde" },
      { cns: "003", microarea: "MA1", alertLevel: "amarelo" },
      { cns: "004", microarea: "MA2", alertLevel: "vermelho" },
    ];

    const result = applyFilters(patients);
    expect(result).toHaveLength(1);
    expect(result[0]!.cns).toBe("001");
  });

  it("clearFilters resets all filters", () => {
    useFilterStore.getState().setMicroareaFilter(["MA1", "MA2"]);
    useFilterStore.getState().setAlertFilter(["vermelho"]);
    useFilterStore.getState().setSearch("test");
    useFilterStore.getState().setDateRange({ from: "2026-01-01", to: "2026-12-31" });

    useFilterStore.getState().clearFilters();

    const state = useFilterStore.getState();
    expect(state.microareas).toEqual([]);
    expect(state.alertLevels).toEqual([]);
    expect(state.searchText).toBe("");
    expect(state.dateRange).toBeNull();
  });

  it("filters by search text (name match, case-insensitive)", () => {
    const { applyFilters } = useFilterStore.getState();
    useFilterStore.getState().setSearch("beatriz");

    const patients = [
      { cns: "001", nomeCompleto: "Ana Beatriz Oliveira" },
      { cns: "002", nomeCompleto: "Carlos Mendes" },
    ];

    const result = applyFilters(patients);
    expect(result).toHaveLength(1);
    expect(result[0]!.cns).toBe("001");
  });

  it("returns all patients when no filters are active", () => {
    const { applyFilters } = useFilterStore.getState();
    const patients = [
      { cns: "001", microarea: "MA1" },
      { cns: "002", microarea: "MA2" },
    ];

    const result = applyFilters(patients);
    expect(result).toHaveLength(2);
  });
});
