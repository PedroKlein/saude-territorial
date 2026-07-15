import { describe, it, expect } from "vitest";
import {
  deduplicatePatients,
  type MergedPatient,
  type DetectedConflict,
} from "./dedup";
import type { PatientRecord } from "@/hooks/usePatientData";

function makePatient(overrides: Partial<PatientRecord> = {}): PatientRecord {
  return {
    cns: "000000000000001",
    nomeCompleto: "Paciente Teste",
    lat: -30.03,
    lng: -51.22,
    ...overrides,
  };
}

describe("deduplicatePatients", () => {
  it("returns empty result for empty input", () => {
    const result = deduplicatePatients({});
    expect(result.merged).toHaveLength(0);
    expect(result.conflicts).toHaveLength(0);
  });

  it("passes through single-layer patients without merging", () => {
    const layers = {
      gestantes: [
        makePatient({ cns: "000000000000001" }),
        makePatient({ cns: "000000000000002", nomeCompleto: "Paciente B" }),
      ],
    };
    const result = deduplicatePatients(layers);
    expect(result.merged).toHaveLength(2);
    expect(result.merged[0].layers).toEqual(["gestantes"]);
    expect(result.conflicts).toHaveLength(0);
  });

  it("merges same patient appearing in two layers", () => {
    const layers = {
      gestantes: [makePatient({ cns: "000000000000001", nomeCompleto: "Paciente A" })],
      diabetes: [makePatient({ cns: "000000000000001", nomeCompleto: "Paciente A" })],
    };
    const result = deduplicatePatients(layers);
    expect(result.merged).toHaveLength(1);
    expect(result.merged[0].cns).toBe("000000000000001");
    expect(result.merged[0].layers).toContain("gestantes");
    expect(result.merged[0].layers).toContain("diabetes");
  });

  it("detects conflicts when same CNS has different field values", () => {
    const layers = {
      gestantes: [makePatient({ cns: "000000000000001", nomeCompleto: "Paciente A" })],
      tuberculose: [makePatient({ cns: "000000000000001", nomeCompleto: "Paciente B" })],
    };
    const result = deduplicatePatients(layers);
    expect(result.merged).toHaveLength(1);
    expect(result.conflicts.length).toBeGreaterThan(0);
    const conflict = result.conflicts.find((c) => c.field === "nomeCompleto");
    expect(conflict).toBeDefined();
    expect(conflict!.values).toHaveProperty("gestantes", "Paciente A");
    expect(conflict!.values).toHaveProperty("tuberculose", "Paciente B");
  });

  it("handles many patients across multiple layers", () => {
    const layers = {
      gestantes: [
        makePatient({ cns: "000000000000001" }),
        makePatient({ cns: "000000000000002", nomeCompleto: "Paciente X" }),
      ],
      diabetes: [
        makePatient({ cns: "000000000000002", nomeCompleto: "Paciente X" }),
        makePatient({ cns: "000000000000003", nomeCompleto: "Paciente Y" }),
      ],
      hipertensao: [
        makePatient({ cns: "000000000000001" }),
      ],
    };
    const result = deduplicatePatients(layers);
    // 3 unique CNS → 3 merged patients
    expect(result.merged).toHaveLength(3);
    const p1 = result.merged.find((m) => m.cns === "000000000000001");
    expect(p1!.layers).toContain("gestantes");
    expect(p1!.layers).toContain("hipertensao");
    const p2 = result.merged.find((m) => m.cns === "000000000000002");
    expect(p2!.layers).toContain("gestantes");
    expect(p2!.layers).toContain("diabetes");
  });

  it("does not flag conflicts for matching field values", () => {
    const layers = {
      gestantes: [makePatient({ cns: "000000000000001", nomeCompleto: "Same Name" })],
      diabetes: [makePatient({ cns: "000000000000001", nomeCompleto: "Same Name" })],
    };
    const result = deduplicatePatients(layers);
    expect(result.conflicts).toHaveLength(0);
  });
});
