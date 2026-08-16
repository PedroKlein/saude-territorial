/**
 * Cross-cutting field validators used by the patient Zod schemas.
 *
 * Kept in their own file so tests can exercise them without booting the
 * envelope schemas. Every helper returns a Zod schema that accepts empty
 * string / null (emit null) or a valid value (emit normalized form). Errors
 * are PT-BR because the messages land verbatim in `Field.error`.
 */

import { z } from "zod";

// ---------------------------------------------------------------------------
// Telefone
// ---------------------------------------------------------------------------

/**
 * BR phone: DDD (2 digits) + 8 or 9 subscriber digits. Accepts common
 * formatted inputs (parens, hyphens, spaces), emits digits-only canonical
 * form. Rejects short/long numbers, non-BR-DDD prefixes are permitted
 * because national landlines mix formats.
 */
const TELEFONE_DIGITS_RE = /^\d{10,11}$/;

export const TelefoneSchema = z
  .union([z.string(), z.null()])
  .transform((v, ctx): string | null => {
    if (v === null) return null;
    const digits = v.replace(/\D+/g, "");
    if (digits === "") return null;
    if (!TELEFONE_DIGITS_RE.test(digits)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Telefone deve ter DDD + 8 ou 9 dígitos.",
      });
      return z.NEVER;
    }
    return digits;
  });

// ---------------------------------------------------------------------------
// Pressão arterial
// ---------------------------------------------------------------------------

/**
 * Blood-pressure reading `NNN/NN` (systolic/diastolic in mmHg). Ranges
 * cover hypertensive urgency and clinical shock: sys 60–260, dia 30–160.
 * Values outside are almost certainly typos; validators catch them.
 * Empty input → null.
 */
const PA_RE = /^(\d{2,3})\s*\/\s*(\d{2,3})$/;

export const PressaoArterialSchema = z
  .union([z.string(), z.null()])
  .transform((v, ctx): string | null => {
    if (v === null) return null;
    const trimmed = v.trim();
    if (trimmed === "") return null;
    const match = PA_RE.exec(trimmed);
    if (!match) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Pressão arterial deve estar no formato NNN/NN (ex: 120/80).",
      });
      return z.NEVER;
    }
    const sys = Number(match[1]);
    const dia = Number(match[2]);
    if (sys < 60 || sys > 260) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Pressão sistólica fora da faixa clínica (60–260 mmHg).",
      });
      return z.NEVER;
    }
    if (dia < 30 || dia > 160) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Pressão diastólica fora da faixa clínica (30–160 mmHg).",
      });
      return z.NEVER;
    }
    if (sys <= dia) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Pressão sistólica deve ser maior que a diastólica.",
      });
      return z.NEVER;
    }
    return `${sys}/${dia}`;
  });

// ---------------------------------------------------------------------------
// PPD (mm)
// ---------------------------------------------------------------------------

/**
 * PPD skin-test induration in millimeters. Clinical ceiling ~30mm; anything
 * larger is almost surely a data-entry slip (someone typed 300 or reported
 * something in a different unit).
 */
export const PpdMmSchema = z
  .number()
  .int()
  .min(0, "PPD não pode ser negativo.")
  .max(30, "PPD acima de 30mm é implausível — verifique a leitura.");

// ---------------------------------------------------------------------------
// Cross-field date helpers
// ---------------------------------------------------------------------------

/** Today's date in ISO `yyyy-MM-dd` (wall clock). */
export function todayIso(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Returns true when `a` and `b` are both ISO date strings AND `a > b`.
 * Everything else (either side missing, either side not ISO) returns false —
 * callers using this in `superRefine` want a permissive gate.
 */
export function isoAfter(a: unknown, b: unknown): boolean {
  return typeof a === "string" && typeof b === "string" && a > b;
}
