import { relations } from "drizzle-orm";

import { gestantesData } from "./gestantes";
import { hasData } from "./has";
import { patients } from "./patients";
import { tuberculoseConsultas, tuberculoseData } from "./tuberculose";

/**
 * Drizzle relations — centralised so schema files stay import-cycle free.
 *
 * A patient has at most one row in each extension table (base+extension is
 * a 1:1 pattern; multiple conditions = multiple extension rows for the same
 * patient). TB consultas are 1:N under a patient — the join goes through
 * `tuberculoseData` so `db.query.patients.findFirst({ with: { tuberculose:
 * { with: { consultas: true } } } })` is the natural read shape.
 */

export const patientsRelations = relations(patients, ({ one }) => ({
  gestantes: one(gestantesData, {
    fields: [patients.id],
    references: [gestantesData.patientId],
  }),
  tuberculose: one(tuberculoseData, {
    fields: [patients.id],
    references: [tuberculoseData.patientId],
  }),
  has: one(hasData, {
    fields: [patients.id],
    references: [hasData.patientId],
  }),
}));

export const gestantesDataRelations = relations(gestantesData, ({ one }) => ({
  patient: one(patients, {
    fields: [gestantesData.patientId],
    references: [patients.id],
  }),
}));

export const tuberculoseDataRelations = relations(tuberculoseData, ({ one, many }) => ({
  patient: one(patients, {
    fields: [tuberculoseData.patientId],
    references: [patients.id],
  }),
  consultas: many(tuberculoseConsultas),
}));

export const tuberculoseConsultasRelations = relations(tuberculoseConsultas, ({ one }) => ({
  patient: one(patients, {
    fields: [tuberculoseConsultas.patientId],
    references: [patients.id],
  }),
  tuberculose: one(tuberculoseData, {
    fields: [tuberculoseConsultas.patientId],
    references: [tuberculoseData.patientId],
  }),
}));

export const hasDataRelations = relations(hasData, ({ one }) => ({
  patient: one(patients, {
    fields: [hasData.patientId],
    references: [patients.id],
  }),
}));
