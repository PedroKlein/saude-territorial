/**
 * Patient CRUD Zod schemas — shared across API and (post-PE-5) client forms.
 *
 * The schemas define the request body shape for `PATCH /api/patients/[id]`
 * and (in PE-6) `POST /api/patients`. Every field is optional at the top
 * level so a PATCH may target any subset; the API rejects the empty body
 * separately.
 *
 * Body shape (structured, not flat) — the transaction knows which extension
 * table to touch by which top-level key is present:
 *
 *   {
 *     base?:        Partial<Base>,      // fields on `patients`
 *     gestantes?:   Partial<Gestantes>, // fields on `gestantes_data`
 *     tuberculose?: Partial<TB>,        // fields on `tuberculose_data`
 *     hipertensao?: Partial<HAS>,       // fields on `has_data`
 *   }
 *
 * Date fields accept the Brazilian display format `dd/MM/yyyy` from forms
 * OR the storage format `yyyy-MM-dd` from programmatic callers. Both are
 * normalized to ISO `yyyy-MM-dd` because the schema columns are `date`.
 *
 * `risco` is lowercased at the boundary — seed data may say "Alto", the
 * API always persists lowercase to keep the alert rule literal-match
 * (`risco = "alto"`) trivial.
 *
 * See `plans/pivot-execution.md#pe-5` for T5.1.
 */

import { z } from "zod";

import { isValidCns } from "./cns";

// ---------------------------------------------------------------------------
// Common helpers
// ---------------------------------------------------------------------------

/** ISO `yyyy-MM-dd` matcher used for storage-side date columns. */
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
/** Brazilian `dd/MM/yyyy` display format used in forms. */
const BR_DATE_RE = /^(\d{2})\/(\d{2})\/(\d{4})$/;

/**
 * Accepts `dd/MM/yyyy` or `yyyy-MM-dd` or empty string; emits ISO or null.
 * An explicit `null` is passed through — that's how a form clears a date.
 */
const dateFlex = z
  .union([z.string(), z.null()])
  .transform((v, ctx): string | null => {
    if (v === null) return null;
    const s = v.trim();
    if (s === "") return null;
    if (ISO_DATE_RE.test(s)) return s;
    const m = BR_DATE_RE.exec(s);
    if (m) return `${m[3]}-${m[2]}-${m[1]}`;
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Data inválida. Use dd/MM/yyyy.",
    });
    return z.NEVER;
  });

/** Trim + coerce empty string to null. Useful for optional text fields. */
const textOrNull = z
  .union([z.string(), z.null()])
  .transform((v): string | null => {
    if (v === null) return null;
    const s = v.trim();
    return s === "" ? null : s;
  });

/**
 * Brazilian postal code (CEP). Accepts 8-digit or hyphenated (NNNNN-NNN)
 * input, emits the canonical hyphenated form, or null when empty.
 * Rejects malformed strings so ViaCEP autofill doesn't run on garbage.
 */
const cepOrNull = z
  .union([z.string(), z.null()])
  .transform((v, ctx): string | null => {
    if (v === null) return null;
    const digits = v.replace(/\D/g, "");
    if (digits === "") return null;
    if (digits.length !== 8) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "CEP deve ter 8 dígitos.",
      });
      return z.NEVER;
    }
    return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  });

/** Non-empty string after trim (for required fields). */
const requiredText = z
  .string()
  .transform((v) => v.trim())
  .refine((v) => v.length > 0, { message: "Campo obrigatório." });

/** Latitude range for Porto Alegre metropolitan area — plus safety margin. */
const latitude = z
  .number()
  .refine((n) => n >= -31 && n <= -29, {
    message: "Latitude fora da faixa esperada (RS).",
  });

/** Longitude range for RS state — plus safety margin. */
const longitude = z
  .number()
  .refine((n) => n >= -52 && n <= -50, {
    message: "Longitude fora da faixa esperada (RS).",
  });

/**
 * Today's date in ISO `yyyy-MM-dd`. Wall-clock, not UTC — a form submitted
 * at 23:30 local time compares against the local calendar day. Callers that
 * need UTC discipline can post-process.
 */
function todayIso(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = (now.getMonth() + 1).toString().padStart(2, "0");
  const d = now.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** ISO date + integer day offset. Handles month/year rollover via `Date`. */
function addDaysToIso(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const base = new Date(Date.UTC(y, m - 1, d));
  base.setUTCDate(base.getUTCDate() + days);
  const yy = base.getUTCFullYear();
  const mm = (base.getUTCMonth() + 1).toString().padStart(2, "0");
  const dd = base.getUTCDate().toString().padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

// ---------------------------------------------------------------------------
// Base (patients)
// ---------------------------------------------------------------------------

export const BasePatchSchema = z
  .object({
    nomeCompleto: requiredText.optional(),
    // 15-digit CNS check enforced only on create; PATCH does not change CNS.
    dataNascimento: dateFlex.optional(),
    idade: z.number().int().min(0).max(130).nullable().optional(),
    telefone: textOrNull.optional(),
    rua: textOrNull.optional(),
    numero: textOrNull.optional(),
    complemento: textOrNull.optional(),
    bairro: textOrNull.optional(),
    cep: cepOrNull.optional(),
    microarea: textOrNull.optional(),
    // Direct-coord update: drag-to-fix + manual pin drop. Presence of either
    // switches the geocode path off and sets geocodeStatus='manual'.
    lat: latitude.optional(),
    lng: longitude.optional(),
    geocodeReference: textOrNull.optional(),
    vulnerabilidades: textOrNull.optional(),
  })
  .strict();

export type BasePatch = z.infer<typeof BasePatchSchema>;

// ---------------------------------------------------------------------------
// Gestantes extension
// ---------------------------------------------------------------------------

const RiscoEnum = z
  .union([z.literal("habitual"), z.literal("alto"), z.string()])
  .transform((v) => v.trim().toLowerCase())
  .refine((v) => v === "habitual" || v === "alto", {
    message: "Risco deve ser 'habitual' ou 'alto'.",
  }) as z.ZodType<"habitual" | "alto">;

export const GestantesPatchSchema = z
  .object({
    dum: dateFlex.optional(),
    dpp: dateFlex.optional(),
    risco: RiscoEnum.nullable().optional(),
    igAbertura: textOrNull.optional(),
    dataUltimaConsulta: dateFlex.optional(),
    dataProximaConsulta: dateFlex.optional(),
    numeroConsultas: z.number().int().min(0).optional(),
    hasPreviaTag: textOrNull.optional(),
    diabetesPreviaTag: textOrNull.optional(),
    pressaoArterial: textOrNull.optional(),
    acompanhamentoPesoAltura: textOrNull.optional(),
    numeroVisitasDomiciliares: z.number().int().min(0).optional(),
    avaliacaoOdontoStatus: textOrNull.optional(),
    vacinaDtpa: textOrNull.optional(),
    trPrimeiroTri: textOrNull.optional(),
    trSegundoTri: textOrNull.optional(),
    trTerceiroTri: textOrNull.optional(),
    resultadoTr: textOrNull.optional(),
    trHepBHepCPrimeiroTri: textOrNull.optional(),
    trSifHivTerceiroTri: textOrNull.optional(),
    isPuerpera: z.boolean().optional(),
    puerperioConsulta: textOrNull.optional(),
    puerperioVisitaDomiciliar: textOrNull.optional(),
    puerperioAvaliacaoOdonto: textOrNull.optional(),
    isExposta: z.boolean().optional(),
  })
  .strict()
  .superRefine((v, ctx) => {
    if (typeof v.dataUltimaConsulta === "string") {
      const today = todayIso();
      if (v.dataUltimaConsulta > today) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["dataUltimaConsulta"],
          message: "Data da última consulta não pode ser no futuro.",
        });
      }
    }
  })
  // DPP is computed server-side (DUM + 280d). Any client value is discarded.
  .transform((v) => {
    if (typeof v.dum === "string") {
      return { ...v, dpp: addDaysToIso(v.dum, 280) };
    }
    return v;
  });

export type GestantesPatch = z.infer<typeof GestantesPatchSchema>;

// ---------------------------------------------------------------------------
// Tuberculose extension (data only — consultas edited via a separate route
// once PE-5 lands. For MVP the edit form does not touch `tuberculose_consultas`.)
// ---------------------------------------------------------------------------

export const TuberculosePatchSchema = z
  .object({
    tipo: textOrNull.optional(),
    galRegistro: textOrNull.optional(),
    baciloscopiaPrimeiraData: dateFlex.optional(),
    baciloscopiaSegundaData: dateFlex.optional(),
    baciloscopiaResultado: textOrNull.optional(),
    trmPrimeiraData: dateFlex.optional(),
    trmSegundaData: dateFlex.optional(),
    trmResultado: textOrNull.optional(),
    culturaMTuberculosis: textOrNull.optional(),
    ppdMm: z.number().int().min(0).nullable().optional(),
    histopatologia: textOrNull.optional(),
    rxTorax: textOrNull.optional(),
    outrosExames: textOrNull.optional(),
    formaClinica: textOrNull.optional(),
    tipoEntrada: textOrNull.optional(),
    esquema: textOrNull.optional(),
    dataInicio: dateFlex.optional(),
    formaTratamento: textOrNull.optional(),
    tdoStatus: textOrNull.optional(),
    encerramentoMotivo: textOrNull.optional(),
    encerramentoData: dateFlex.optional(),
    contatosCoabitantes: z.number().int().min(0).nullable().optional(),
    contatosExaminados: z.number().int().min(0).nullable().optional(),
    todosContatosExaminados: z.boolean().nullable().optional(),
    // NOTE: `contatosLista` is a LGPD hot-spot (household names). Excluded
    // from the MVP edit surface; will require an explicit consent path.
  })
  .strict()
  .superRefine((v, ctx) => {
    if (
      typeof v.baciloscopiaPrimeiraData === "string" &&
      typeof v.baciloscopiaSegundaData === "string" &&
      v.baciloscopiaPrimeiraData > v.baciloscopiaSegundaData
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["baciloscopiaSegundaData"],
        message: "A 2ª baciloscopia não pode ser anterior à 1ª.",
      });
    }
    if (
      typeof v.dataInicio === "string" &&
      typeof v.encerramentoData === "string" &&
      v.dataInicio > v.encerramentoData
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["encerramentoData"],
        message: "A data de encerramento não pode ser anterior ao início.",
      });
    }
  });

export type TuberculosePatch = z.infer<typeof TuberculosePatchSchema>;

// ---------------------------------------------------------------------------
// Hipertensão extension
// ---------------------------------------------------------------------------

export const HasPatchSchema = z
  .object({
    dataUltimaConsulta: dateFlex.optional(),
    dataProximaConsulta: dateFlex.optional(),
    dataUltimaAfericaoPa: dateFlex.optional(),
    pressaoArterial: textOrNull.optional(),
    registroNotas: textOrNull.optional(),
    encaminhamentos: textOrNull.optional(),
  })
  .strict()
  .superRefine((v, ctx) => {
    if (typeof v.dataUltimaConsulta === "string") {
      const today = todayIso();
      if (v.dataUltimaConsulta > today) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["dataUltimaConsulta"],
          message: "Data da última consulta não pode ser no futuro.",
        });
      }
    }
  });

export type HasPatch = z.infer<typeof HasPatchSchema>;

// ---------------------------------------------------------------------------
// Envelope
// ---------------------------------------------------------------------------

export const PatientPatchSchema = z
  .object({
    base: BasePatchSchema.optional(),
    gestantes: GestantesPatchSchema.optional(),
    tuberculose: TuberculosePatchSchema.optional(),
    hipertensao: HasPatchSchema.optional(),
  })
  .strict()
  .refine(
    (v) =>
      v.base !== undefined ||
      v.gestantes !== undefined ||
      v.tuberculose !== undefined ||
      v.hipertensao !== undefined,
    { message: "Nada para atualizar." },
  );

export type PatientPatch = z.infer<typeof PatientPatchSchema>;

/** Address fields whose change triggers geocoding. */
export const ADDRESS_FIELDS = ["rua", "numero", "complemento", "bairro"] as const;
export type AddressField = (typeof ADDRESS_FIELDS)[number];

/** Extension layers with a 1:1 extension table under `patients`. */
export const EXTENSION_LAYERS = ["gestantes", "tuberculose", "hipertensao"] as const;
export type ExtensionLayer = (typeof EXTENSION_LAYERS)[number];


// ---------------------------------------------------------------------------
// Create (POST /api/patients)
// ---------------------------------------------------------------------------

/**
 * Body accepted by POST /api/patients.
 *
 * `cns` is validated here (server-side 15-digit regex) — PATCH never changes CNS.
 * `base.nomeCompleto` is required on create; all other fields are optional.
 * `condicao` selects which extension namespace must be present.
 * The matching extension object must be provided (even if empty `{}`).
 */
export const PatientCreateSchema = z
  .object({
    cns: z
      .string()
      .regex(/^\d{15}$/, "CNS deve ter exatamente 15 dígitos numéricos.")
      .refine(isValidCns, {
        message: "CNS inválido (checksum não confere).",
      }),
    base: z.object({
      nomeCompleto: requiredText,
      dataNascimento: dateFlex.optional(),
      idade: z.number().int().min(0).max(130).nullable().optional(),
      telefone: textOrNull.optional(),
      rua: textOrNull.optional(),
      numero: textOrNull.optional(),
      complemento: textOrNull.optional(),
      bairro: textOrNull.optional(),
      cep: cepOrNull.optional(),
      microarea: textOrNull.optional(),
      lat: latitude.nullable().optional(),
      lng: longitude.nullable().optional(),
      geocodeReference: textOrNull.optional(),
      vulnerabilidades: textOrNull.optional(),
    }),
    condicao: z.enum(["gestantes", "tuberculose", "hipertensao"]),
    gestantes: GestantesPatchSchema.optional(),
    tuberculose: TuberculosePatchSchema.optional(),
    hipertensao: HasPatchSchema.optional(),
  })
  .refine(
    (data) => {
      if (data.condicao === "gestantes") return data.gestantes !== undefined;
      if (data.condicao === "tuberculose") return data.tuberculose !== undefined;
      if (data.condicao === "hipertensao") return data.hipertensao !== undefined;
      return false;
    },
    { message: "Dados da condição são obrigatórios." },
  );

export type PatientCreate = z.infer<typeof PatientCreateSchema>;

// ---------------------------------------------------------------------------
// Condition attach (POST /api/patients/[id]/conditions)
// ---------------------------------------------------------------------------

/**
 * Body accepted by POST /api/patients/[id]/conditions.
 * Discriminated on `condicao` so the matching `data` schema is applied.
 */
export const ConditionAttachSchema = z.discriminatedUnion("condicao", [
  z.object({ condicao: z.literal("gestantes"), data: GestantesPatchSchema }),
  z.object({
    condicao: z.literal("tuberculose"),
    data: TuberculosePatchSchema,
  }),
  z.object({ condicao: z.literal("hipertensao"), data: HasPatchSchema }),
]);

export type ConditionAttach = z.infer<typeof ConditionAttachSchema>;