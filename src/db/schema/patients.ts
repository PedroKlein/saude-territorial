import {
  doublePrecision,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * Base `patients` — shared fields for every person tracked by the app.
 * Extension tables (gestantes_data, tuberculose_data, has_data) join on
 * `patient_id`. See SPEC.md § Data model for the base + extension rationale.
 *
 * Column naming: `id`/`cns`/timestamps/`lat/lng` in English (technical);
 * domain fields (`nomeCompleto`, `dataNascimento`, `microarea`) in Portuguese
 * per AGENTS.md naming rules.
 */

/** Geocode provenance for a patient's coordinates. */
export const geocodeStatus = pgEnum("geocode_status", [
  "geocoded", // Nominatim resolved the address; lat/lng from geocoder.
  "manual", // User dropped a pin or dragged the marker; lat/lng from user.
  "unresolved", // Address not resolvable and no manual pin yet; no map placement.
]);

export const patients = pgTable(
  "patients",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // 15-digit constraint is enforced by Zod at the API boundary rather than
    // a CHECK — synthetic seed CNS deliberately fail the check-digit rule
    // to signal they aren't real, and a CHECK on shape would still pass them.
    cns: text("cns").notNull().unique(),
    nomeCompleto: text("nome_completo").notNull(),
    dataNascimento: text("data_nascimento"), // ISO yyyy-MM-dd; nullable for seed rows without DOB.
    // The HAS + TB tabs surface Idade as a separate column alongside DOB.
    // Store what the team enters; derive from DOB when NULL. Discrepancies
    // between the two are the team's to resolve — the app does not overwrite.
    idade: integer("idade"),
    telefone: text("telefone"),
    rua: text("rua"),
    numero: text("numero"),
    complemento: text("complemento"),
    bairro: text("bairro"),
    cep: text("cep"),
    microarea: text("microarea"), // Plain tag (`MA1`..`MA5`); FK to a microareas table is post-MVP.
    lat: doublePrecision("lat"),
    lng: doublePrecision("lng"),
    geocodeStatus: geocodeStatus("geocode_status").notNull().default("unresolved"),
    // Free-form pin note e.g. "casa azul após a ponte" — only meaningful
    // when geocodeStatus = 'manual'.
    geocodeReference: text("geocode_reference"),
    // Cross-condition free-text social-vulnerability notes (Gestantes tab
    // col AF). Base-patient scope: not condition-specific.
    vulnerabilidades: text("vulnerabilidades"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    createdBy: text("created_by"), // Better Auth session.user.id; nullable for seed rows.
    updatedBy: text("updated_by"),
  },
  (table) => ({
    microareaIdx: index("patients_microarea_idx").on(table.microarea),
  }),
);

export type Patient = typeof patients.$inferSelect;
export type NewPatient = typeof patients.$inferInsert;
