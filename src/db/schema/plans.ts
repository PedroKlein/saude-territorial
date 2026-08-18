import {
  check,
  date,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import { patients } from "./patients";

/**
 * `daily_plans` — header row for a single ACS daily visit plan.
 *
 * Profile is validated by a CHECK constraint (SQL) and by Zod at the API
 * boundary. Drizzle uses plain `text` for the column so `$inferSelect` stays
 * a readable string; runtime callers must treat it as `'foot' | 'car'`.
 */
export const dailyPlans = pgTable(
  "daily_plans",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** ISO date string e.g. "2025-08-13". */
    date: date("date").notNull(),
    acsName: text("acs_name"),
    profile: text("profile").notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check(
      "daily_plans_profile_check",
      sql`${table.profile} IN ('foot', 'car')`,
    ),
  ],
);

export type DailyPlan = typeof dailyPlans.$inferSelect;
export type NewDailyPlan = typeof dailyPlans.$inferInsert;

/**
 * `daily_plan_stops` — ordered patient stops for a plan.
 * PK = (plan_id, stop_order) so order is both identity and position.
 */
export const dailyPlanStops = pgTable(
  "daily_plan_stops",
  {
    planId: uuid("plan_id")
      .notNull()
      .references(() => dailyPlans.id, { onDelete: "cascade" }),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "restrict" }),
    stopOrder: integer("stop_order").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.planId, table.stopOrder] }),
  ],
);

export type DailyPlanStop = typeof dailyPlanStops.$inferSelect;
export type NewDailyPlanStop = typeof dailyPlanStops.$inferInsert;
