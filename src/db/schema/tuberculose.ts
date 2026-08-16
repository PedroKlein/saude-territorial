import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { patients } from "./patients";

/** Baciloscopia — resultado consolidado (LOCKED por alert rule). */
export const baciloscopiaResultadoEnum = pgEnum("baciloscopia_resultado", [
  "Positiva",
  "Negativa",
]);

/** Teste Rápido Molecular. */
export const trmResultadoEnum = pgEnum("trm_resultado", [
  "Detectável",
  "Não detectável",
]);

/** Cultura M. tuberculosis. */
export const culturaResultadoEnum = pgEnum("cultura_resultado", [
  "Positiva",
  "Negativa",
  "Pendente",
]);

/** TDO — Tratamento Diretamente Observado. */
export const tdoStatusEnum = pgEnum("tdo_status", [
  "TDO regular",
  "TDO irregular/faltoso",
  "Não aplicável",
]);

/** Tipo de entrada no tratamento TB (sheet col V). */
export const tipoEntradaTbEnum = pgEnum("tipo_entrada_tb", [
  "Caso novo",
  "Recidiva",
  "Reingresso após abandono",
  "Transferência",
  "Não sabe",
]);

/** Motivo de encerramento TB (sheet col AL). */
export const encerramentoMotivoTbEnum = pgEnum("encerramento_motivo_tb", [
  "Cura",
  "Abandono",
  "Óbito por TB",
  "Óbito por outra causa",
  "Transferência",
  "Falência",
  "Mudança de diagnóstico",
]);
/**
 * `tuberculose_data` — single-row-per-case TB fields.
 *
 * Real TB tab has 43 columns (A–AQ) at
 * https://docs.google.com/spreadsheets/d/12_mmvJcCiFFyCm2V1q00Qd_wJfQP0i29gPKdtZCeyhU/edit?gid=1634675524.
 * Base identity cols (A–I) map to `patients`; the rest live here + in the
 * `tuberculose_consultas` sub-extension for the 1º–9º mês tracking.
 *
 * Design decision (T2.3a): the monthly follow-up columns Z–AH are modelled
 * as a separate table `tuberculose_consultas` rather than a JSONB column,
 * because TB treatment analysis ("average months to closure per microárea",
 * "adherence patterns") is a real post-MVP reporting use case that becomes
 * easy relational SQL and awkward JSONB un-nesting. Costs one extra table +
 * migration; benefits every future report.
 *
 * `contatosLista` (col AQ) carries names of household contacts — an
 * identifying-PII leak vector. Seed rows leave it NULL. The API create/edit
 * path attaches an LGPD warning validator when this field is set.
 */
export const tuberculoseData = pgTable("tuberculose_data", {
  patientId: uuid("patient_id")
    .primaryKey()
    .references(() => patients.id, { onDelete: "cascade" }),

  // Registro do caso (cols J, K)
  tipo: text("tipo"), // col J
  galRegistro: text("gal_registro"), // col K — laboratory registry code

  // Exames Diagnósticos (block L–T on the sheet)
  baciloscopiaPrimeiraData: date("baciloscopia_primeira_data"), // col L
  baciloscopiaSegundaData: date("baciloscopia_segunda_data"), // col M
  // Free-text summary for backwards-compat with the current alert rule and
  // the LOCKED spec vocabulary. Values: "Positiva" | "Negativa" | "".
  baciloscopiaResultado: baciloscopiaResultadoEnum("baciloscopia_resultado"),
  trmPrimeiraData: date("trm_primeira_data"), // col N — TRM 1ª amostra
  trmSegundaData: date("trm_segunda_data"), // col O
  trmResultado: trmResultadoEnum("trm_resultado"),
  culturaMTuberculosis: culturaResultadoEnum("cultura_m_tuberculosis"), // col P
  ppdMm: integer("ppd_mm"), // col Q — PPD skin test result in millimeters
  histopatologia: text("histopatologia"), // col R
  rxTorax: text("rx_torax"), // col S
  outrosExames: text("outros_exames"), // col T

  // Tratamento (cols U–Y)
  formaClinica: text("forma_clinica"), // col U
  tipoEntrada: tipoEntradaTbEnum("tipo_entrada"), // col V
  esquema: text("esquema"), // col W — drug regimen, e.g. "RHZE"
  dataInicio: date("data_inicio"), // col X
  formaTratamento: text("forma_tratamento"), // col Y
  tdoStatus: tdoStatusEnum("tdo_status"), // col AK

  // Encerramento (cols AL, AM)
  encerramentoMotivo: encerramentoMotivoTbEnum("encerramento_motivo"),
  encerramentoData: date("encerramento_data"),

  // Contatos (cols AN–AQ)
  contatosCoabitantes: integer("contatos_coabitantes"), // AN
  contatosExaminados: integer("contatos_examinados"), // AO
  todosContatosExaminados: boolean("todos_contatos_examinados"), // AP
  // AQ — LGPD hot spot: free-text names of household members. Seed=NULL.
  // API validator flags any write to this field and requires explicit consent
  // metadata in a future task; for MVP it's a free-text column with a comment.
  contatosLista: text("contatos_lista"),

  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type TuberculoseData = typeof tuberculoseData.$inferSelect;
export type NewTuberculoseData = typeof tuberculoseData.$inferInsert;

/**
 * `tuberculose_consultas` — 1..9 monthly follow-up consultations for a TB
 * patient (sheet cols Z–AH).
 *
 * Composite PK `(patient_id, mes)` — each patient has at most one row per
 * month. `CHECK mes BETWEEN 1 AND 9` guards the domain constraint.
 *
 * `dataUltimaAtualizacao` in the API response for a TB layer patient
 * computes `MAX(patients.updated_at, tuberculose_data.updated_at,
 * MAX(tuberculose_consultas.updated_at) OVER patient)`, so the LOCKED alert
 * rule `Tuberculose.dataUltimaAtualizacao older_than_days 30` fires
 * correctly whether the team edits base fields, TB metadata, or logs a
 * monthly follow-up.
 */
export const tuberculoseConsultas = pgTable(
  "tuberculose_consultas",
  {
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),
    mes: integer("mes").notNull(),
    realizada: boolean("realizada").notNull().default(false),
    data: date("data"),
    observacao: text("observacao"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.patientId, table.mes] }),
    mesRange: check("tuberculose_consultas_mes_range", sql`${table.mes} BETWEEN 1 AND 9`),
  }),
);

export type TuberculoseConsulta = typeof tuberculoseConsultas.$inferSelect;
export type NewTuberculoseConsulta = typeof tuberculoseConsultas.$inferInsert;
