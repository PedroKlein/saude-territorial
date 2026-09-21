#!/usr/bin/env tsx

import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { migrate as migratePglite } from "drizzle-orm/pglite/migrator";
import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js";
import { migrate as migratePostgres } from "drizzle-orm/postgres-js/migrator";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";

import { getDatabaseDriver, PGLITE_DATA_DIR } from "../src/db/config";
import { enforceNonProdGate } from "./lib/non-prod-gate";

const migrationsFolder = path.resolve(__dirname, "../drizzle");

async function main(): Promise<void> {
  enforceNonProdGate();

  const driver = getDatabaseDriver();
  if (driver === "postgres") {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is required when DATABASE_DRIVER=postgres.");

    const client = postgres(url, { prepare: false, max: 1 });
    try {
      await migratePostgres(drizzlePostgres(client), { migrationsFolder });
    } finally {
      await client.end({ timeout: 5 });
    }
    return;
  }

  const dataDir = path.resolve(PGLITE_DATA_DIR);
  await mkdir(path.dirname(dataDir), { recursive: true });
  const client = new PGlite(dataDir);
  try {
    await migratePglite(drizzlePglite(client), { migrationsFolder });
  } finally {
    await client.close();
  }
}

void main().catch((error: unknown) => {
  console.error("Migration failed:", error instanceof Error ? error.message : String(error));
  process.exit(1);
});
