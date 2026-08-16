import {
  boolean,
  date,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { patients } from "./patients";

/** Risco gestacional — LOCKED lowercase for `alert-rules.config.ts` literal match. */
export const riscoGestante = pgEnum("risco_gestante", ["habitual", "alto"]);

/** IG na abertura pré-natal (bucketizada). */
export const igAberturaEnum = pgEnum("ig_abertura", [
  "< 12 sem",
  "12-24 sem",
  "> 24 sem",
]);

/** TR/Sorologia Sífilis+HIV por trimestre. */
export const trStatus = pgEnum("tr_status", ["Feito", "Não Feito", "Não realizada"]);

/** Status de realização de uma ação clínica. */
export const statusRealizacao = pgEnum("status_realizacao", [
  "Realizada",
  "Não realizada",
  "A realizar",
  "Não se aplica",
]);

/** Acompanhamento peso/altura pré-natal — vocabulário próprio. */
export const acompanhamentoStatus = pgEnum("acompanhamento_status", [
  "Em dia",
  "Atrasada",
  "Não realizada",
]);

/** Resultado consolidado do Teste Rápido — EXPOSTA aciona a sub-layer. */
export const resultadoTesteRapido = pgEnum("resultado_teste_rapido", [
  "MONITORAR",
  "EXPOSTA",
  "REAGENTE",
  "Não Reagente",
]);
/**
 * `gestantes_data` — pregnancy-specific fields.
 *
 * Column layout mirrors the real Gestantes tab (cols A–AF at
 * https://docs.google.com/spreadsheets/d/12_mmvJcCiFFyCm2V1q00Qd_wJfQP0i29gPKdtZCeyhU/edit).
 * Some columns in the sheet map to base `patients` (Nome, CNS, DOB, Endereço,
 * `vulnerabilidades`); the rest live here.
 *
 * `ig` (idade gestacional in weeks) is NOT stored. Computed in the API layer
 * from `dum` at request time — the sheet's col M carries the note
 * "colocar a fórmula para cálculo da IG", so the team wants it derived.
 * Storing a snapshot would drift; the alert rule `ig > 40` evaluates against
 * the fresh computed value.
 *
 * `risco` is normalized to lowercase `'habitual' | 'alto'` at the API boundary
 * (Zod). Seed rows may say Titlecase; the seed script lowercases them.
 */
export const gestantesData = pgTable("gestantes_data", {
  patientId: uuid("patient_id")
    .primaryKey()
    .references(() => patients.id, { onDelete: "cascade" }),

  // Core pré-natal (sheet cols I, J, K, L, N, O, U)
  dum: date("dum"), // Data da Última Menstruação (col I)
  dpp: date("dpp"), // Data Provável do Parto (col J)
  risco: riscoGestante("risco"), // 'habitual' | 'alto' — LOCKED lowercase (col K)
  // Bucketed text like "<12 sem", "12-24 sem", ">24 sem" (col L).
  igAbertura: igAberturaEnum("ig_abertura"),
  dataUltimaConsulta: date("data_ultima_consulta"), // col N
  dataProximaConsulta: date("data_proxima_consulta"), // col O — post-MVP alert
  numeroConsultas: integer("numero_consultas").notNull().default(0), // col U

  // Comorbidades pré-existentes — free-text cross-condition tags on the
  // Gestantes tab. Distinct from having a row in has_data/dm_data; these
  // are pregnancy-context flags, not separate condition monitoring.
  hasPreviaTag: text("has_previa_tag"), // col V, e.g. "HAS prévia"
  diabetesPreviaTag: text("diabetes_previa_tag"), // col W

  // Monitoramento clínico (sheet cols P, X, Y, Z + PA)
  pressaoArterial: text("pressao_arterial"), // last reading e.g. "120/80"
  acompanhamentoPesoAltura: acompanhamentoStatus("acompanhamento_peso_altura"),
  numeroVisitasDomiciliares: integer("numero_visitas_domiciliares").notNull().default(0),
  avaliacaoOdontoStatus: statusRealizacao("avaliacao_odonto_status"),
  vacinaDtpa: statusRealizacao("vacina_dtpa"), // relevant after 20 semanas (col Z)

  // Exames TR / sorologia (sheet cols Q, R, S, T, AA, AB)
  trPrimeiroTri: trStatus("tr_primeiro_tri"),
  trSegundoTri: trStatus("tr_segundo_tri"),
  trTerceiroTri: trStatus("tr_terceiro_tri"),
  // REAGENTE / EXPOSTA flips isExposta=true on save.
  resultadoTr: resultadoTesteRapido("resultado_tr"),
  trHepBHepCPrimeiroTri: statusRealizacao("tr_hep_b_hep_c_primeiro_tri"), // AA
  trSifHivTerceiroTri: statusRealizacao("tr_sif_hiv_terceiro_tri"), // AB

  // Puerpério (sheet cols AC, AD, AE) — three fields, not one boolean
  isPuerpera: boolean("is_puerpera").notNull().default(false),
  puerperioConsulta: statusRealizacao("puerperio_consulta"), // AC
  puerperioVisitaDomiciliar: statusRealizacao("puerperio_visita_domiciliar"), // AD
  puerperioAvaliacaoOdonto: statusRealizacao("puerperio_avaliacao_odonto"), // AE

  // Exposição — collapsed boolean; the Sheet's "Gestantes expostas" tab has
  // 27 additional cols (TARV, VDRL, Anti-HBs, etc.) deferred post-MVP.
  isExposta: boolean("is_exposta").notNull().default(false),

  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type GestanteData = typeof gestantesData.$inferSelect;
export type NewGestanteData = typeof gestantesData.$inferInsert;
