import { defineConfig } from "drizzle-kit";

/**
 * Drizzle Kit config — schema→SQL migration generation.
 *
 * The app and Better Auth use the same pg-core schema for local PGlite and
 * production Postgres.
 *
 * `drizzle-kit generate` reads schema files and emits SQL without contacting a
 * database. `scripts/migrate-db.ts` applies the generated migrations through
 * the selected runtime driver.
 */
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema/*.ts",
  out: "./drizzle",
  dbCredentials: {
    // Generation needs no connection; `db:push` remains Postgres-only and
    // therefore requires DATABASE_URL when explicitly used.
    url: process.env.DATABASE_URL ?? "postgresql://placeholder@localhost:5432/placeholder",
  },
  strict: true,
  verbose: true,
});
