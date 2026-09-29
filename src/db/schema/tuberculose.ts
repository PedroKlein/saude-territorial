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

export const baciloscopiaResultadoEnum = pgEnum("baciloscopia_resultado", [
  "Negativo",
  "Positivo+",
  "Positivo++",
  "Positivo+++",
  "Não realizado",
  "<9 bacilos em 100 campos",
  "Amostra Insuficiente.",
]);

export const trmResultadoEnum = pgEnum("trm_resultado", [
  "Detectado/ Rifampicina Sensível",
  "Detectado Resistência à Rifampicina Não Detectado",
  "Detectado Resistência à Rifampicina Detectado",
  "Detectado traços / Rifampicina indeterminada",
  "Não Detectado",
  "Não realizado",
  "Amostra Insuficiente.",
  "Laudo indisponivel",
]);

export const culturaResultadoEnum = pgEnum("cultura_resultado", [
  "Positiva",
  "Negativa",
  "Pendente",
  "Não realizada",
]);

export const tdoStatusEnum = pgEnum("tdo_status", [
  "Não está em TDO",
  "TDO em dia",
  "TDO irregular/faltoso",
]);

export const tipoEntradaTbEnum = pgEnum("tipo_entrada_tb", [
  "Caso novo",
  "Recidiva",
  "Reingresso após abandono",
  "Transferência",
  "Não sabe",
]);

export const encerramentoMotivoTbEnum = pgEnum("encerramento_motivo_tb", [
  "Cura",
  "Completou tratamento",
  "Êxito do tratamento",
  "Abandono",
  "Transferência",
  "Óbito",
  "Falência",
  "Mudança diagnóstico",
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
  tipo: text("tipo"), // "Caso Fonte" | "Contato"
  galRegistro: text("gal_registro"), // col K — laboratory registry code

  // Amostras & Exames Diagnósticos (block L–T on the sheet)
  baciloscopiaPrimeiraData: date("baciloscopia_primeira_data"), // col L: Data da PRIMEIRA amostra
  baciloscopiaSegundaData: date("baciloscopia_segunda_data"), // col M: Data da SEGUNDA amostra
  baciloscopiaResultado: baciloscopiaResultadoEnum("baciloscopia_resultado"), // col N: 1ª amostra
  baciloscopiaSegundaResultado: baciloscopiaResultadoEnum("baciloscopia_segunda_resultado"), // col O: 2ª amostra
  trmPrimeiraData: date("trm_primeira_data"),
  trmSegundaData: date("trm_segunda_data"),
  trmData: date("trm_data"),
  trmResultado: trmResultadoEnum("trm_resultado"), // col P: Teste Rápido Molecular M. Tuberculosis
  culturaMTuberculosis: culturaResultadoEnum("cultura_m_tuberculosis"), // col Q: Cultura Escarro
  culturaOutros: text("cultura_outros"), // col R: Cultura Outros
  ppdMm: integer("ppd_mm"), // col S: PPD em milímetros
  histopatologia: text("histopatologia"), // col T: Histopatologia
  rxTorax: text("rx_torax"), // col U: RX Tórax
  outrosExames: text("outros_exames"), // col V: Outros Exames

  // Tratamento (cols W–AA, AK)
  formaClinica: text("forma_clinica"), // col W: Forma Clínica
  tipoEntrada: tipoEntradaTbEnum("tipo_entrada"), // col X: Tipo de Entrada
  esquema: text("esquema"), // col Y: Esquema
  dataInicio: date("data_inicio"), // col Z: Data de Início
  formaTratamento: text("forma_tratamento"), // col AA: Forma de Tratamento
  tdoStatus: tdoStatusEnum("tdo_status"), // col AK: TDO

  // Encerramento (cols AL, AM)
  encerramentoMotivo: encerramentoMotivoTbEnum("encerramento_motivo"), // col AL
  encerramentoData: date("encerramento_data"), // col AM

  // Contatos (cols AN–AQ)
  contatosCoabitantes: integer("contatos_coabitantes"), // AN: Pessoas que moram junto
  contatosExaminados: integer("contatos_examinados"), // AO: Pessoas examinadas
  todosContatosExaminados: boolean("todos_contatos_examinados"), // AP: Todos examinados
  contatosLista: text("contatos_lista"), // AQ: Lista das pessoas (JSON estruturado de contatos)

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
  (table) => [
    primaryKey({ columns: [table.patientId, table.mes] }),
    check("tuberculose_consultas_mes_range", sql`${table.mes} BETWEEN 1 AND 9`),
  ],
);

export type TuberculoseConsulta = typeof tuberculoseConsultas.$inferSelect;
export type NewTuberculoseConsulta = typeof tuberculoseConsultas.$inferInsert;
