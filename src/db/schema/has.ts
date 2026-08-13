import { date, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { patients } from "./patients";

/**
 * `has_data` — Hipertensão Arterial Sistêmica monitoring.
 *
 * Real HAS tab is compact (14 columns A–N) at
 * https://docs.google.com/spreadsheets/d/12_mmvJcCiFFyCm2V1q00Qd_wJfQP0i29gPKdtZCeyhU/edit?gid=1219017327.
 * Base identity cols map to `patients`; the HAS-specific fields live here.
 *
 * Naming note: the layer id in code is `hipertensao` (per SPEC taxonomy);
 * this table uses the clinical abbreviation `has`. Deliberate split; the API
 * layer bridges the two.
 */
export const hasData = pgTable("has_data", {
  patientId: uuid("patient_id")
    .primaryKey()
    .references(() => patients.id, { onDelete: "cascade" }),

  // Consultas (cols J, K)
  dataUltimaConsulta: date("data_ultima_consulta"), // drives LOCKED "> 180 dias" alert
  dataProximaConsulta: date("data_proxima_consulta"),

  // Aferições (col L) — separate from consultas: PA can be checked outside
  // a full consultation (ACS home visit, quick reading).
  dataUltimaAfericaoPa: date("data_ultima_afericao_pa"),

  // Registro clínico (cols M, N)
  pressaoArterial: text("pressao_arterial"), // last reading e.g. "140/90"
  // Free-text clinical observations alongside PA reading (col M carries a
  // "Parâmetro para normotenso" hint from the sheet).
  registroNotas: text("registro_notas"),
  encaminhamentos: text("encaminhamentos"), // free-text referrals (col N)

  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type HasData = typeof hasData.$inferSelect;
export type NewHasData = typeof hasData.$inferInsert;
