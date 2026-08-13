import { describe, it, expect } from "vitest";
import {
  evaluateRule,
  evaluatePatient,
  getHighestAlert,
  parseBrazilianDate,
} from "./engine";
import type { AlertRule } from "@/types/alerts";

describe("parseBrazilianDate", () => {
  it("parses a valid dd/MM/yyyy date", () => {
    const date = parseBrazilianDate("15/03/2024");
    expect(date).not.toBeNull();
    expect(date!.getDate()).toBe(15);
    expect(date!.getMonth()).toBe(2); // 0-indexed
    expect(date!.getFullYear()).toBe(2024);
  });

  it("returns null for empty or invalid input", () => {
    expect(parseBrazilianDate("")).toBeNull();
    expect(parseBrazilianDate("invalid")).toBeNull();
    expect(parseBrazilianDate("2024-03-15")).toBeNull(); // wrong format
  });
});

describe("evaluateRule", () => {
  it("evaluates > operator correctly", () => {
    const rule: AlertRule = {
      layer: "gestantes",
      column: "ig",
      operator: ">",
      value: 40,
      level: "vermelho",
    };
    expect(evaluateRule(rule, { ig: 42 })).toBe(true);
    expect(evaluateRule(rule, { ig: 40 })).toBe(false);
    expect(evaluateRule(rule, { ig: 38 })).toBe(false);
  });

  it("evaluates < operator correctly", () => {
    const rule: AlertRule = {
      layer: "gestantes",
      column: "idade",
      operator: "<",
      value: 18,
      level: "amarelo",
    };
    expect(evaluateRule(rule, { idade: 16 })).toBe(true);
    expect(evaluateRule(rule, { idade: 18 })).toBe(false);
    expect(evaluateRule(rule, { idade: 25 })).toBe(false);
  });

  it("evaluates >= operator correctly", () => {
    const rule: AlertRule = {
      layer: "hipertensao",
      column: "pressao",
      operator: ">=",
      value: 140,
      level: "vermelho",
    };
    expect(evaluateRule(rule, { pressao: 140 })).toBe(true);
    expect(evaluateRule(rule, { pressao: 150 })).toBe(true);
    expect(evaluateRule(rule, { pressao: 139 })).toBe(false);
  });

  it("evaluates <= operator correctly", () => {
    const rule: AlertRule = {
      layer: "diabetes",
      column: "glicemia",
      operator: "<=",
      value: 70,
      level: "amarelo",
    };
    expect(evaluateRule(rule, { glicemia: 70 })).toBe(true);
    expect(evaluateRule(rule, { glicemia: 60 })).toBe(true);
    expect(evaluateRule(rule, { glicemia: 80 })).toBe(false);
  });

  it("evaluates = operator correctly", () => {
    const rule: AlertRule = {
      layer: "gestantes",
      column: "risco",
      operator: "=",
      value: "alto",
      level: "vermelho",
    };
    expect(evaluateRule(rule, { risco: "alto" })).toBe(true);
    expect(evaluateRule(rule, { risco: "baixo" })).toBe(false);
  });

  it("evaluates != operator correctly", () => {
    const rule: AlertRule = {
      layer: "tuberculose",
      column: "status",
      operator: "!=",
      value: "curado",
      level: "amarelo",
    };
    expect(evaluateRule(rule, { status: "em tratamento" })).toBe(true);
    expect(evaluateRule(rule, { status: "curado" })).toBe(false);
  });

  it("evaluates older_than_days operator correctly", () => {
    const rule: AlertRule = {
      layer: "gestantes",
      column: "dataUltimaConsulta",
      operator: "older_than_days",
      value: 30,
      level: "vermelho",
    };

    // 45 days ago → should trigger
    const daysAgo45 = new Date();
    daysAgo45.setDate(daysAgo45.getDate() - 45);
    const formatted45 = `${String(daysAgo45.getDate()).padStart(2, "0")}/${String(daysAgo45.getMonth() + 1).padStart(2, "0")}/${daysAgo45.getFullYear()}`;
    expect(evaluateRule(rule, { dataUltimaConsulta: formatted45 })).toBe(true);

    // 10 days ago → should NOT trigger
    const daysAgo10 = new Date();
    daysAgo10.setDate(daysAgo10.getDate() - 10);
    const formatted10 = `${String(daysAgo10.getDate()).padStart(2, "0")}/${String(daysAgo10.getMonth() + 1).padStart(2, "0")}/${daysAgo10.getFullYear()}`;
    expect(evaluateRule(rule, { dataUltimaConsulta: formatted10 })).toBe(false);
  });

  it("evaluates is_empty operator correctly", () => {
    const rule: AlertRule = {
      layer: "acamados",
      column: "vacinas",
      operator: "is_empty",
      value: "",
      level: "amarelo",
    };
    expect(evaluateRule(rule, { vacinas: null })).toBe(true);
    expect(evaluateRule(rule, { vacinas: undefined })).toBe(true);
    expect(evaluateRule(rule, { vacinas: "" })).toBe(true);
    expect(evaluateRule(rule, { vacinas: "BCG" })).toBe(false);
  });

  it("handles missing field gracefully (does not crash)", () => {
    const rule: AlertRule = {
      layer: "gestantes",
      column: "nonExistentField",
      operator: ">",
      value: 10,
      level: "vermelho",
    };
    // Missing field → rule should not trigger (not crash)
    expect(evaluateRule(rule, { otherField: "value" })).toBe(false);
  });
});

describe("evaluatePatient", () => {
  it("returns verde when no rules trigger", () => {
    const rules: AlertRule[] = [
      { layer: "gestantes", column: "ig", operator: ">", value: 40, level: "vermelho" },
    ];
    const patient = { cns: "000000000000000", ig: 30 };
    const result = evaluatePatient(rules, patient, "gestantes");
    expect(result.level).toBe("verde");
    expect(result.triggeredRules).toHaveLength(0);
  });

  it("returns highest alert level when multiple rules trigger", () => {
    const rules: AlertRule[] = [
      { layer: "gestantes", column: "ig", operator: ">", value: 40, level: "amarelo" },
      { layer: "gestantes", column: "risco", operator: "=", value: "alto", level: "vermelho" },
    ];
    const patient = { cns: "000000000000000", ig: 42, risco: "alto" };
    const result = evaluatePatient(rules, patient, "gestantes");
    expect(result.level).toBe("vermelho");
    expect(result.triggeredRules).toHaveLength(2);
  });

  it("only evaluates rules matching the patient layer", () => {
    const rules: AlertRule[] = [
      { layer: "gestantes", column: "ig", operator: ">", value: 40, level: "vermelho" },
      { layer: "tuberculose", column: "status", operator: "=", value: "ativo", level: "vermelho" },
    ];
    const patient = { cns: "000000000000000", ig: 42, status: "ativo" };
    // Evaluate as gestantes → only first rule applies
    const result = evaluatePatient(rules, patient, "gestantes");
    expect(result.triggeredRules).toHaveLength(1);
    expect(result.triggeredRules[0].column).toBe("ig");
  });
});

describe("getHighestAlert", () => {
  it("returns vermelho when present", () => {
    expect(getHighestAlert("vermelho", "amarelo")).toBe("vermelho");
    expect(getHighestAlert("amarelo", "vermelho")).toBe("vermelho");
  });

  it("returns amarelo over verde", () => {
    expect(getHighestAlert("amarelo", "verde")).toBe("amarelo");
    expect(getHighestAlert("verde", "amarelo")).toBe("amarelo");
  });

  it("returns verde when both are verde", () => {
    expect(getHighestAlert("verde", "verde")).toBe("verde");
  });
});

/**
 * The LOCKED MVP alert-rule set (see `src/config/alert-rules.config.ts`).
 * One hit + one miss per rule to guard against config drift.
 */
describe("ALERT_RULES (LOCKED MVP set)", () => {
  const rules: AlertRule[] = [
    { layer: "gestantes", column: "ig", operator: ">", value: 40, level: "vermelho" },
    { layer: "gestantes", column: "risco", operator: "=", value: "alto", level: "amarelo" },
    { layer: "tuberculose", column: "dataUltimaAtualizacao", operator: "older_than_days", value: 30, level: "vermelho" },
    { layer: "hipertensao", column: "dataUltimaConsulta", operator: "older_than_days", value: 180, level: "amarelo" },
  ];

  // Deterministic "recent" date relative to today. `older_than_days` compares
  // against `Date.now()`; a fresh string keeps the tests off any clock.
  const yesterday = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
  })();

  it("Gestantes IG > 40 → vermelho (hit)", () => {
    const r = evaluatePatient(rules, { cns: "000000000000000", ig: 41 }, "gestantes");
    expect(r.level).toBe("vermelho");
    expect(r.triggeredRules.some((x) => x.column === "ig")).toBe(true);
  });

  it("Gestantes IG ≤ 40 → not triggered by IG rule (miss)", () => {
    const r = evaluatePatient(rules, { cns: "000000000000000", ig: 40 }, "gestantes");
    expect(r.triggeredRules.some((x) => x.column === "ig")).toBe(false);
  });

  it("Gestantes risco = alto → amarelo (hit)", () => {
    const r = evaluatePatient(rules, { cns: "000000000000000", risco: "alto" }, "gestantes");
    expect(r.level).toBe("amarelo");
    expect(r.triggeredRules.some((x) => x.column === "risco")).toBe(true);
  });

  it("Gestantes risco = habitual → miss", () => {
    const r = evaluatePatient(rules, { cns: "000000000000000", risco: "habitual" }, "gestantes");
    expect(r.triggeredRules.some((x) => x.column === "risco")).toBe(false);
  });

  it("Tuberculose dataUltimaAtualizacao > 30 dias → vermelho (hit)", () => {
    const r = evaluatePatient(
      rules,
      { cns: "000000000000000", dataUltimaAtualizacao: "01/01/2020" },
      "tuberculose",
    );
    expect(r.level).toBe("vermelho");
    expect(r.triggeredRules).toHaveLength(1);
  });

  it("Tuberculose dataUltimaAtualizacao recente → miss", () => {
    const r = evaluatePatient(
      rules,
      { cns: "000000000000000", dataUltimaAtualizacao: yesterday },
      "tuberculose",
    );
    expect(r.triggeredRules).toHaveLength(0);
  });

  it("Hipertensão dataUltimaConsulta > 180 dias → amarelo (hit)", () => {
    const r = evaluatePatient(
      rules,
      { cns: "000000000000000", dataUltimaConsulta: "01/01/2020" },
      "hipertensao",
    );
    expect(r.level).toBe("amarelo");
    expect(r.triggeredRules).toHaveLength(1);
  });

  it("Hipertensão dataUltimaConsulta recente → miss", () => {
    const r = evaluatePatient(
      rules,
      { cns: "000000000000000", dataUltimaConsulta: yesterday },
      "hipertensao",
    );
    expect(r.triggeredRules).toHaveLength(0);
  });

  it("No cross-layer leak: TB rule doesn't fire on a gestante", () => {
    // Gestante with an old dataUltimaAtualizacao field must not trigger the
    // TB rule, which is scoped to layer=tuberculose.
    const r = evaluatePatient(
      rules,
      { cns: "000000000000000", dataUltimaAtualizacao: "01/01/2020", ig: 30 },
      "gestantes",
    );
    expect(r.triggeredRules).toHaveLength(0);
  });
});
