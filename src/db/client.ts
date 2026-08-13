import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

/**
 * Single Drizzle client for the app. Imports of the DB MUST come from this
 * file — no other `postgres(...)` calls anywhere. See
 * `.agents/skills/drizzle-data-access/SKILL.md` for the boundary rules.
 *
 * Connection notes:
 * - `prepare: false` is required for Supabase's transaction pooler (port
 *   6543). If DATABASE_URL points at the session pooler (5432) or a direct
 *   connection, prepared statements still work, but leaving this off is the
 *   safe default.
 * - `max: 1` keeps the app friendly to Supabase pooler quotas during dev.
 *   Raise for production once the pilot expands.
 *
 * The URL is validated lazily: importing this module from Vitest (`NODE_ENV=test`
 * or `VITEST=true`) does NOT throw — schema tests that mock the DB can skip a
 * live connection entirely.
 */

const url = process.env.DATABASE_URL;

if (!url) {
  const inTest = process.env.NODE_ENV === "test" || process.env.VITEST === "true";
  if (!inTest) {
    throw new Error(
      "DATABASE_URL is not set. Put it in .env.local (see .env.local.example).",
    );
  }
}

// In tests, `postgres()` with a placeholder never opens a socket unless a
// query is issued — safe.
const client = postgres(url ?? "postgresql://placeholder@localhost:5432/placeholder", {
  prepare: false,
  max: 1,
});

export const db = drizzle(client, { schema });
export { schema };
export type DB = typeof db;
