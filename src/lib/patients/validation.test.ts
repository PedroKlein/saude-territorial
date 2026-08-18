/**
 * Phase A validation coverage — enum coercion + cross-field date rules +
 * range validators. Every rule this file adds MUST fail on a plausible bug,
 * not on plumbing (see AGENTS.md §Testing).
 */

import { describe, expect, it } from "vitest";

import {
  AcompanhamentoStatusSchema,
  BaciloscopiaResultadoSchema,
  EncerramentoMotivoTbSchema,
  IgAberturaSchema,
  ResultadoTrSchema,
  RiscoSchema,
  StatusRealizacaoSchema,
  TdoStatusSchema,
  TipoEntradaTbSchema,
  TrStatusSchema,
} from "./enums";
import {
  GestantesPatchSchema,
  HasPatchSchema,
  TuberculosePatchSchema,
} from "./schemas";
import {
  PpdMmSchema,
  PressaoArterialSchema,
  TelefoneSchema,
} from "./validation";

// ---------------------------------------------------------------------------
// Date helpers (shared across cross-field cases)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Enum coercion
// ---------------------------------------------------------------------------

describe("Enum coercion — case-insensitive, whitespace-tolerant", () => {
  it("normalises risco case variants to the canonical lowercase form", () => {
    for (const input of ["alto", "ALTO", "Alto", "  Alto "]) {
      expect(RiscoSchema.parse(input)).toBe("alto");
    }
  });

  it("emits null for empty and null risco input", () => {
    expect(RiscoSchema.parse("")).toBeNull();
    expect(RiscoSchema.parse(null)).toBeNull();
  });

  it("rejects unknown risco values", () => {
    expect(() => RiscoSchema.parse("médio")).toThrow();
  });

  it("preserves canonical casing for PT-BR verbatim enums", () => {
    expect(TrStatusSchema.parse("feito")).toBe("Feito");
    expect(TrStatusSchema.parse("NÃO FEITO")).toBe("Não Feito");
    expect(BaciloscopiaResultadoSchema.parse("negativa")).toBe("Negativa");
    expect(TdoStatusSchema.parse("tdo regular")).toBe("TDO regular");
    expect(TipoEntradaTbSchema.parse("caso novo")).toBe("Caso novo");
    expect(EncerramentoMotivoTbSchema.parse("ÓBITO POR TB")).toBe("Óbito por TB");
    expect(ResultadoTrSchema.parse("exposta")).toBe("EXPOSTA");
  });

  it("keeps distinct enums for shape-similar fields", () => {
    // TR/Sorologia trimester status ≠ generic realização status.
    expect(() => TrStatusSchema.parse("A realizar")).toThrow();
    expect(StatusRealizacaoSchema.parse("A realizar")).toBe("A realizar");
    expect(() => AcompanhamentoStatusSchema.parse("Feito")).toThrow();
  });

  it("normalizes bucketed IG abertura", () => {
    expect(IgAberturaSchema.parse("< 12 sem")).toBe("< 12 sem");
    expect(IgAberturaSchema.parse("< 12 SEM")).toBe("< 12 sem");
    expect(() => IgAberturaSchema.parse("18 sem")).toThrow();
  });

  it("surfaces the accepted values in the error message", () => {
    try {
      RiscoSchema.parse("invalid");
      throw new Error("should have thrown");
    } catch (err) {
      // ZodError#issues[0].message is what lands in Field.error.
      const first = (err as { issues: { message: string }[] }).issues[0]!;
      expect(first.message).toMatch(/habitual/);
      expect(first.message).toMatch(/alto/);
    }
  });
});

// ---------------------------------------------------------------------------
// Field validators
// ---------------------------------------------------------------------------

describe("TelefoneSchema", () => {
  it("emits digits-only canonical form", () => {
    expect(TelefoneSchema.parse("(51) 99999-1234")).toBe("51999991234");
    expect(TelefoneSchema.parse("51 3333-4444")).toBe("5133334444");
  });

  it("accepts null / empty as null", () => {
    expect(TelefoneSchema.parse("")).toBeNull();
    expect(TelefoneSchema.parse(null)).toBeNull();
  });

  it("rejects short / long numbers", () => {
    expect(() => TelefoneSchema.parse("12345")).toThrow();
    expect(() => TelefoneSchema.parse("123456789012")).toThrow();
  });
});

describe("PressaoArterialSchema", () => {
  it("accepts NNN/NN with clinical values, emits normalised form", () => {
    expect(PressaoArterialSchema.parse("120/80")).toBe("120/80");
    expect(PressaoArterialSchema.parse("140 / 90")).toBe("140/90");
  });

  it("rejects out-of-range systolic/diastolic", () => {
    expect(() => PressaoArterialSchema.parse("50/30")).toThrow();
    expect(() => PressaoArterialSchema.parse("120/20")).toThrow();
    expect(() => PressaoArterialSchema.parse("300/80")).toThrow();
  });

  it("rejects sys ≤ dia (bad reading)", () => {
    expect(() => PressaoArterialSchema.parse("80/120")).toThrow();
  });

  it("rejects garbage strings", () => {
    expect(() => PressaoArterialSchema.parse("normal")).toThrow();
    expect(() => PressaoArterialSchema.parse("120-80")).toThrow();
  });
});

describe("PpdMmSchema", () => {
  it("rejects PPD above 30mm", () => {
    expect(() => PpdMmSchema.parse(35)).toThrow();
  });

  it("accepts 0–30", () => {
    expect(PpdMmSchema.parse(0)).toBe(0);
    expect(PpdMmSchema.parse(15)).toBe(15);
    expect(PpdMmSchema.parse(30)).toBe(30);
  });
});

// ---------------------------------------------------------------------------
// Cross-field date rules
// ---------------------------------------------------------------------------

describe("Gestantes cross-field", () => {
  it("rejects próxima consulta earlier than the última", () => {
    expect(() =>
      GestantesPatchSchema.parse({
        dataUltimaConsulta: "10/03/2025",
        dataProximaConsulta: "01/03/2025",
      }),
    ).toThrow();
  });

  it("rejects same-day próxima consulta as última", () => {
    expect(() =>
      GestantesPatchSchema.parse({
        dataUltimaConsulta: "10/03/2025",
        dataProximaConsulta: "10/03/2025",
      }),
    ).toThrow();
  });

  it("accepts próxima strictly after última", () => {
    expect(() =>
      GestantesPatchSchema.parse({
        dataUltimaConsulta: "10/03/2025",
        dataProximaConsulta: "24/03/2025",
      }),
    ).not.toThrow();
  });

  it("rejects DUM in the future", () => {
    expect(() => GestantesPatchSchema.parse({ dum: tomorrow })).toThrow();
  });

  it("accepts DUM on or before today", () => {
    expect(() => GestantesPatchSchema.parse({ dum: yesterday })).not.toThrow();
  });
});

describe("Tuberculose cross-field", () => {
  it("rejects início do tratamento anterior à 1ª baciloscopia", () => {
    expect(() =>
      TuberculosePatchSchema.parse({
        baciloscopiaPrimeiraData: "10/03/2025",
        dataInicio: "05/03/2025",
      }),
    ).toThrow();
  });

  it("accepts início after or equal to 1ª baciloscopia", () => {
    expect(() =>
      TuberculosePatchSchema.parse({
        baciloscopiaPrimeiraData: "01/03/2025",
        dataInicio: "10/03/2025",
      }),
    ).not.toThrow();
  });

  it("rejects encerramento no futuro", () => {
    expect(() =>
      TuberculosePatchSchema.parse({ encerramentoData: tomorrow }),
    ).toThrow();
  });

  it("rejects início no futuro", () => {
    expect(() => TuberculosePatchSchema.parse({ dataInicio: tomorrow })).toThrow();
  });

  it("rejects contatos examinados > coabitantes", () => {
    expect(() =>
      TuberculosePatchSchema.parse({
        contatosCoabitantes: 3,
        contatosExaminados: 5,
      }),
    ).toThrow();
  });

  it("accepts examinados ≤ coabitantes", () => {
    expect(() =>
      TuberculosePatchSchema.parse({
        contatosCoabitantes: 5,
        contatosExaminados: 3,
      }),
    ).not.toThrow();
  });
});

describe("HAS cross-field", () => {
  it("rejects próxima ≤ última", () => {
    expect(() =>
      HasPatchSchema.parse({
        dataUltimaConsulta: "10/03/2025",
        dataProximaConsulta: "01/03/2025",
      }),
    ).toThrow();
    expect(() =>
      HasPatchSchema.parse({
        dataUltimaConsulta: "10/03/2025",
        dataProximaConsulta: "10/03/2025",
      }),
    ).toThrow();
  });

  it("rejects aferição no futuro", () => {
    expect(() => HasPatchSchema.parse({ dataUltimaAfericaoPa: tomorrow })).toThrow();
  });
});
