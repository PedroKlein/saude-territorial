import { describe, expect, it } from "vitest";

import {
  GestantesPatchSchema,
  HasPatchSchema,
  PatientCreateSchema,
  TuberculosePatchSchema,
} from "./schemas";
import { computeCnsChecksum } from "./cns";

/**
 * Schema refinements added in UP-1.4 — cross-field date invariants, DPP
 * server-side computation, and CNS checksum on create.
 */

const validCns = (() => {
  const prefix = "12345678901";
  return prefix + computeCnsChecksum(prefix);
})();

const yesterday = (() => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
})();

const tomorrow = (() => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
})();

describe("PatientCreateSchema — CNS checksum", () => {
  const validBody = {
    cns: validCns,
    base: { nomeCompleto: "Fulano de Tal" },
    condicao: "hipertensao" as const,
    hipertensao: {},
  };

  it("accepts a CNS whose checksum matches", () => {
    expect(() => PatientCreateSchema.parse(validBody)).not.toThrow();
  });

  it("rejects a CNS with a tampered digit", () => {
    const tampered =
      validCns.slice(0, 5) + String((Number(validCns[5]) + 1) % 10) + validCns.slice(6);
    expect(() => PatientCreateSchema.parse({ ...validBody, cns: tampered })).toThrow();
  });

  it("rejects a CNS that is not 15 digits", () => {
    expect(() => PatientCreateSchema.parse({ ...validBody, cns: "12345" })).toThrow();
  });
});

describe("GestantesPatchSchema — refinements", () => {
  it("computes DPP from DUM (280 days later)", () => {
    const parsed = GestantesPatchSchema.parse({ dum: "01/01/2025" });
    expect(parsed.dpp).toBe("2025-10-08");
  });

  it("overrides a client-provided DPP with the computed value", () => {
    const parsed = GestantesPatchSchema.parse({
      dum: "01/01/2025",
      dpp: "31/12/2025", // wrong — server should overwrite
    });
    expect(parsed.dpp).toBe("2025-10-08");
  });

  it("passes DPP through untouched when DUM is absent", () => {
    const parsed = GestantesPatchSchema.parse({ dpp: "05/06/2025" });
    expect(parsed.dpp).toBe("2025-06-05");
  });

  it("rejects dataUltimaConsulta in the future", () => {
    expect(() =>
      GestantesPatchSchema.parse({ dataUltimaConsulta: tomorrow }),
    ).toThrow();
  });

  it("accepts dataUltimaConsulta on or before today", () => {
    expect(() =>
      GestantesPatchSchema.parse({ dataUltimaConsulta: yesterday }),
    ).not.toThrow();
  });
});

describe("TuberculosePatchSchema — refinements", () => {
  it("rejects a 2ª baciloscopia dated before the 1ª", () => {
    expect(() =>
      TuberculosePatchSchema.parse({
        baciloscopiaPrimeiraData: "10/03/2025",
        baciloscopiaSegundaData: "05/03/2025",
      }),
    ).toThrow();
  });

  it("accepts baciloscopias in order", () => {
    expect(() =>
      TuberculosePatchSchema.parse({
        baciloscopiaPrimeiraData: "01/03/2025",
        baciloscopiaSegundaData: "10/03/2025",
      }),
    ).not.toThrow();
  });

  it("rejects encerramento before início", () => {
    expect(() =>
      TuberculosePatchSchema.parse({
        dataInicio: "01/06/2025",
        encerramentoData: "01/01/2025",
      }),
    ).toThrow();
  });

  it("accepts encerramento after início", () => {
    expect(() =>
      TuberculosePatchSchema.parse({
        dataInicio: "01/01/2025",
        encerramentoData: "01/06/2025",
      }),
    ).not.toThrow();
  });
});

describe("HasPatchSchema — refinements", () => {
  it("rejects dataUltimaConsulta in the future", () => {
    expect(() => HasPatchSchema.parse({ dataUltimaConsulta: tomorrow })).toThrow();
  });

  it("accepts dataUltimaConsulta on or before today", () => {
    expect(() =>
      HasPatchSchema.parse({ dataUltimaConsulta: yesterday }),
    ).not.toThrow();
  });
});
