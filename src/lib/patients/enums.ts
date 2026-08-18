/**
 * Enum inventory for patient extension tables.
 *
 * Canonical values are PT-BR verbatim (`Feito`, `Realizada`, `Não Reagente`,
 * ...) with two grandfathered lowercase exceptions:
 *
 *   - `risco` (`habitual | alto`) — LOCKED by the current alert rule literal
 *     match. Do not retitle without updating `ALERT_RULES`.
 *   - Nothing else.
 *
 * Zod schemas normalize whitespace and are case-INSENSITIVE on input to
 * absorb sheet drift (`ALTO`, `alto`, `Alto` all land at `alto`), then emit
 * the canonical form. Postgres enums store the canonical form and reject
 * anything else at the DB boundary.
 *
 * Every enum ships with a `LABELS` map for the UI's display layer, keyed by
 * canonical value. Display labels are also PT-BR (usually identical to the
 * canonical value), but kept as a separate map so the schema and the UI
 * don't couple at the string level.
 *
 * See `docs/roadmap.md § Enum discipline` for the source-of-truth
 * value sets; adding an enum here MUST land alongside a migration under
 * `supabase/migrations/` that creates the matching `pg_enum` type and
 * converts any existing text column.
 */

import { z } from "zod";

/**
 * Build a Zod schema that accepts one of `values` (case-insensitive, trimmed)
 * and emits the exact canonical form. Empty strings collapse to `null` when
 * the schema is used with `.nullable()`. Rejects everything else with a
 * PT-BR error message.
 */
function makeEnumSchema<T extends readonly [string, ...string[]]>(
  values: T,
  fieldLabel: string,
) {
  const lookup = new Map<string, T[number]>();
  for (const v of values) lookup.set(v.toLowerCase(), v);
  return z
    .union([z.string(), z.null()])
    .transform((v, ctx): T[number] | null => {
      if (v === null) return null;
      const trimmed = v.trim();
      if (trimmed === "") return null;
      const found = lookup.get(trimmed.toLowerCase());
      if (found !== undefined) return found;
      ctx.addIssue({
        code: "custom",
        message: `Valor inválido para ${fieldLabel}. Aceitos: ${values.join(", ")}.`,
      });
      return z.NEVER;
    });
}

/**
 * Risco gestacional. Grandfathered lowercase for alert-rule literal match.
 * Alert rule (`alert-rules.config.ts`) compares `risco = "alto"`.
 */
export const RISCO_VALUES = ["habitual", "alto"] as const;
export type Risco = (typeof RISCO_VALUES)[number];
export const RISCO_LABELS: Record<Risco, string> = {
  habitual: "Habitual",
  alto: "Alto risco",
};
export const RiscoSchema = makeEnumSchema(RISCO_VALUES, "risco");

/**
 * TR/Sorologia Sífilis+HIV por trimestre. Sheet cols Q, R, S (Gestantes).
 * `Feito` = amostra colhida; `Não Feito` = agendada mas não realizada;
 * `Não realizada` = trimestre passou sem exame.
 */
export const TR_STATUS_VALUES = ["Feito", "Não Feito", "Não realizada"] as const;
export type TrStatus = (typeof TR_STATUS_VALUES)[number];
export const TR_STATUS_LABELS: Record<TrStatus, string> = {
  Feito: "Feito",
  "Não Feito": "Não feito",
  "Não realizada": "Não realizada",
};
export const TrStatusSchema = makeEnumSchema(TR_STATUS_VALUES, "TR/Sorologia");

/**
 * Status de realização de uma ação clínica agendada — usado pelos
 * campos de avaliação odontológica, vacina DTpa, painéis TR estendidos e
 * pelas três colunas do trio pós-parto.
 */
export const STATUS_REALIZACAO_VALUES = [
  "Realizada",
  "Não realizada",
  "A realizar",
  "Não se aplica",
] as const;
export type StatusRealizacao = (typeof STATUS_REALIZACAO_VALUES)[number];
export const STATUS_REALIZACAO_LABELS: Record<StatusRealizacao, string> = {
  Realizada: "Realizada",
  "Não realizada": "Não realizada",
  "A realizar": "A realizar",
  "Não se aplica": "Não se aplica",
};
export const StatusRealizacaoSchema = makeEnumSchema(
  STATUS_REALIZACAO_VALUES,
  "status",
);

/**
 * Acompanhamento peso/altura pré-natal. Distinct enum from
 * `STATUS_REALIZACAO` — the sheet uses "Em dia / Atrasada" here, not
 * "Realizada / Não realizada".
 */
export const ACOMPANHAMENTO_STATUS_VALUES = [
  "Em dia",
  "Atrasada",
  "Não realizada",
] as const;
export type AcompanhamentoStatus = (typeof ACOMPANHAMENTO_STATUS_VALUES)[number];
export const ACOMPANHAMENTO_STATUS_LABELS: Record<AcompanhamentoStatus, string> = {
  "Em dia": "Em dia",
  Atrasada: "Atrasada",
  "Não realizada": "Não realizada",
};
export const AcompanhamentoStatusSchema = makeEnumSchema(
  ACOMPANHAMENTO_STATUS_VALUES,
  "acompanhamento peso/altura",
);

/**
 * Resultado do Teste Rápido consolidado (Gestantes col U).
 * `EXPOSTA` é o gatilho para a sub-layer Gestantes Expostas (Phase C).
 */
export const RESULTADO_TR_VALUES = [
  "MONITORAR",
  "EXPOSTA",
  "REAGENTE",
  "Não Reagente",
] as const;
export type ResultadoTr = (typeof RESULTADO_TR_VALUES)[number];
export const RESULTADO_TR_LABELS: Record<ResultadoTr, string> = {
  MONITORAR: "Monitorar",
  EXPOSTA: "Exposta",
  REAGENTE: "Reagente",
  "Não Reagente": "Não reagente",
};
export const ResultadoTrSchema = makeEnumSchema(
  RESULTADO_TR_VALUES,
  "resultado teste rápido",
);

/** IG na abertura do pré-natal, bucketizada — não é semana bruta. */
export const IG_ABERTURA_VALUES = ["< 12 sem", "12-24 sem", "> 24 sem"] as const;
export type IgAbertura = (typeof IG_ABERTURA_VALUES)[number];
export const IG_ABERTURA_LABELS: Record<IgAbertura, string> = {
  "< 12 sem": "Menos de 12 semanas",
  "12-24 sem": "Entre 12 e 24 semanas",
  "> 24 sem": "Mais de 24 semanas",
};
export const IgAberturaSchema = makeEnumSchema(
  IG_ABERTURA_VALUES,
  "IG na abertura",
);

/** Baciloscopia resultado consolidado (mantido pelo alert rule LOCKED). */
export const BACILOSCOPIA_RESULTADO_VALUES = ["Positiva", "Negativa"] as const;
export type BaciloscopiaResultado =
  (typeof BACILOSCOPIA_RESULTADO_VALUES)[number];
export const BACILOSCOPIA_RESULTADO_LABELS: Record<BaciloscopiaResultado, string> = {
  Positiva: "Positiva",
  Negativa: "Negativa",
};
export const BaciloscopiaResultadoSchema = makeEnumSchema(
  BACILOSCOPIA_RESULTADO_VALUES,
  "baciloscopia",
);

/** Teste Rápido Molecular. */
export const TRM_RESULTADO_VALUES = ["Detectável", "Não detectável"] as const;
export type TrmResultado = (typeof TRM_RESULTADO_VALUES)[number];
export const TRM_RESULTADO_LABELS: Record<TrmResultado, string> = {
  Detectável: "Detectável",
  "Não detectável": "Não detectável",
};
export const TrmResultadoSchema = makeEnumSchema(
  TRM_RESULTADO_VALUES,
  "TRM",
);

/** Cultura M. tuberculosis. */
export const CULTURA_RESULTADO_VALUES = [
  "Positiva",
  "Negativa",
  "Pendente",
] as const;
export type CulturaResultado = (typeof CULTURA_RESULTADO_VALUES)[number];
export const CULTURA_RESULTADO_LABELS: Record<CulturaResultado, string> = {
  Positiva: "Positiva",
  Negativa: "Negativa",
  Pendente: "Pendente",
};
export const CulturaResultadoSchema = makeEnumSchema(
  CULTURA_RESULTADO_VALUES,
  "cultura",
);

/** TDO — Tratamento Diretamente Observado. */
export const TDO_STATUS_VALUES = [
  "TDO regular",
  "TDO irregular/faltoso",
  "Não aplicável",
] as const;
export type TdoStatus = (typeof TDO_STATUS_VALUES)[number];
export const TDO_STATUS_LABELS: Record<TdoStatus, string> = {
  "TDO regular": "TDO regular",
  "TDO irregular/faltoso": "TDO irregular/faltoso",
  "Não aplicável": "Não aplicável",
};
export const TdoStatusSchema = makeEnumSchema(TDO_STATUS_VALUES, "TDO");

/** Tipo de entrada no tratamento TB (sheet col V). */
export const TIPO_ENTRADA_TB_VALUES = [
  "Caso novo",
  "Recidiva",
  "Reingresso após abandono",
  "Transferência",
  "Não sabe",
] as const;
export type TipoEntradaTb = (typeof TIPO_ENTRADA_TB_VALUES)[number];
export const TIPO_ENTRADA_TB_LABELS: Record<TipoEntradaTb, string> = {
  "Caso novo": "Caso novo",
  Recidiva: "Recidiva",
  "Reingresso após abandono": "Reingresso após abandono",
  Transferência: "Transferência",
  "Não sabe": "Não sabe",
};
export const TipoEntradaTbSchema = makeEnumSchema(
  TIPO_ENTRADA_TB_VALUES,
  "tipo de entrada",
);

/** Motivo de encerramento TB (sheet col AL). */
export const ENCERRAMENTO_MOTIVO_TB_VALUES = [
  "Cura",
  "Abandono",
  "Óbito por TB",
  "Óbito por outra causa",
  "Transferência",
  "Falência",
  "Mudança de diagnóstico",
] as const;
export type EncerramentoMotivoTb =
  (typeof ENCERRAMENTO_MOTIVO_TB_VALUES)[number];
export const ENCERRAMENTO_MOTIVO_TB_LABELS: Record<EncerramentoMotivoTb, string> = {
  Cura: "Cura",
  Abandono: "Abandono",
  "Óbito por TB": "Óbito por TB",
  "Óbito por outra causa": "Óbito por outra causa",
  Transferência: "Transferência",
  Falência: "Falência",
  "Mudança de diagnóstico": "Mudança de diagnóstico",
};
export const EncerramentoMotivoTbSchema = makeEnumSchema(
  ENCERRAMENTO_MOTIVO_TB_VALUES,
  "motivo de encerramento",
);
