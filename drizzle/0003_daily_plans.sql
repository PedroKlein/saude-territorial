-- 0003_daily_plans
--
-- Adds `daily_plans` + `daily_plan_stops` for the route-planner save/load
-- feature (UP-6.6). RLS enabled (default-deny) consistent with
-- 0002_enable_rls_deny_all. The Drizzle client connects as `postgres`
-- (rolbypassrls=true) so server-side reads keep working. Next.js session
-- gates guard the /api/plans route (SPEC LOCKED #10).

CREATE TABLE "daily_plans" (
  "id"         UUID                     PRIMARY KEY DEFAULT gen_random_uuid(),
  "date"       DATE                     NOT NULL,
  "acs_name"   TEXT,
  "profile"    TEXT                     NOT NULL,
  "notes"      TEXT,
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT "daily_plans_profile_check" CHECK ("profile" IN ('foot', 'car'))
);
--> statement-breakpoint

CREATE TABLE "daily_plan_stops" (
  "plan_id"    UUID    NOT NULL REFERENCES "daily_plans"("id") ON DELETE CASCADE,
  "patient_id" UUID    NOT NULL REFERENCES "patients"("id")    ON DELETE RESTRICT,
  "stop_order" INTEGER NOT NULL,
  CONSTRAINT "daily_plan_stops_pkey" PRIMARY KEY ("plan_id", "stop_order")
);
--> statement-breakpoint

ALTER TABLE "daily_plans"      ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "daily_plan_stops" ENABLE ROW LEVEL SECURITY;
