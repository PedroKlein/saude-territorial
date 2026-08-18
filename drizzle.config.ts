import { defineConfig } from "drizzle-kit";

/**
 * Drizzle Kit config — schema→SQL migration generation.
 *
 * Data plane is plain Postgres via `postgres-js` (see src/db/client.ts). Auth
 * is separate: Better Auth uses its own SQLite store (see src/lib/auth.ts).
 *
 * `drizzle-kit generate` reads schema files and emits SQL without contacting
 * Postgres. `drizzle-kit migrate`/`push` apply against DATABASE_URL — locally
 * this is the docker-compose Postgres (see docker-compose.yml / `mise run db:up`).
 */
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema/*.ts",
  out: "./drizzle",
  dbCredentials: {
    // Falls back to a syntactically-valid placeholder so `generate` never
    // fails on unset envs. `push`/`migrate` still need a real URL.
    url: process.env.DATABASE_URL ?? "postgresql://placeholder@localhost:5432/placeholder",
  },
  strict: true,
  verbose: true,
});
