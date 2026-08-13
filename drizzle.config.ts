import { defineConfig } from "drizzle-kit";

/**
 * Drizzle Kit config — schema→SQL migration generation.
 *
 * Data plane is Postgres via `postgres-js` (see src/db/client.ts). Auth is
 * separate: Better Auth uses its own SQLite store (see src/lib/auth.ts).
 *
 * NOTE: `dbCredentials.url` is only consulted by `drizzle-kit push` and
 * `drizzle-kit migrate`. `drizzle-kit generate` reads schema files and emits
 * SQL without contacting Postgres. We prefer generating SQL locally and
 * applying via the Supabase MCP `apply_migration` channel — that keeps the
 * SQL auditable in git AND lets applies happen without a local Postgres
 * client. Local push remains available for developers who prefer it.
 */
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema/*.ts",
  out: "./supabase/migrations",
  dbCredentials: {
    // Falls back to a syntactically-valid placeholder so `generate` never
    // fails on unset envs. `push`/`migrate` still need a real URL.
    url: process.env.DATABASE_URL ?? "postgresql://placeholder@localhost:5432/placeholder",
  },
  strict: true,
  verbose: true,
});
