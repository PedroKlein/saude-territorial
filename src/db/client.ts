import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

/**
 * Single Drizzle client for the app. Imports of the DB MUST come from this
 * file — no other `postgres(...)` calls anywhere. See
 * `.agents/skills/drizzle-data-access/SKILL.md` for the boundary rules.
 *
 * - `prepare: false` is a safe default: it's required by transaction-pooling
 *   proxies (e.g. PgBouncer in transaction mode) and harmless on direct
 *   connections and local Postgres, so we leave it on everywhere.
 * - `max: 1` keeps the dev connection footprint small. Raise for production
 *   once the pilot expands.
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
