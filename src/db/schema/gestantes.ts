import {
  boolean,
  date,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { patients } from "./patients";

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
  risco: text("risco"), // 'habitual' | 'alto' — normalized at API boundary (col K)
  // Bucketed text like "<12 sem", "12-24 sem", ">24 sem" (col L).
  // Kept as text because the buckets are clinically meaningful, not a raw week count.
  igAbertura: text("ig_abertura"),
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
  acompanhamentoPesoAltura: text("acompanhamento_peso_altura"), // "Em dia" | "Atrasada" | ""
  numeroVisitasDomiciliares: integer("numero_visitas_domiciliares").notNull().default(0),
  avaliacaoOdontoStatus: text("avaliacao_odonto_status"), // "Realizada" | "Agendada" | "Não realizada" | ""
  vacinaDtpa: text("vacina_dtpa"), // relevant after 20 semanas (col Z)

  // Exames TR / sorologia (sheet cols Q, R, S, T, AA, AB)
  trPrimeiroTri: text("tr_primeiro_tri"), // "Feito" | "Não Feito" | ""
  trSegundoTri: text("tr_segundo_tri"),
  trTerceiroTri: text("tr_terceiro_tri"),
  // "Não Reagente" | "REAGENTE" | "MONITORAR" | "". REAGENTE flips isExposta=true on save.
  resultadoTr: text("resultado_tr"),
  trHepBHepCPrimeiroTri: text("tr_hep_b_hep_c_primeiro_tri"), // AA — extended painel Sífilis+HIV+HepB+HepC
  trSifHivTerceiroTri: text("tr_sif_hiv_terceiro_tri"), // AB

  // Puerpério (sheet cols AC, AD, AE) — three fields, not one boolean
  isPuerpera: boolean("is_puerpera").notNull().default(false),
  puerperioConsulta: text("puerperio_consulta"), // AC
  puerperioVisitaDomiciliar: text("puerperio_visita_domiciliar"), // AD
  puerperioAvaliacaoOdonto: text("puerperio_avaliacao_odonto"), // AE

  // Exposição — collapsed boolean; the Sheet's "Gestantes expostas" tab has
  // 27 additional cols (TARV, VDRL, Anti-HBs, etc.) deferred post-MVP.
  isExposta: boolean("is_exposta").notNull().default(false),

  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type GestanteData = typeof gestantesData.$inferSelect;
export type NewGestanteData = typeof gestantesData.$inferInsert;
