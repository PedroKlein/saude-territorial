import { PGlite } from "@electric-sql/pglite";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js";
import { mkdirSync } from "node:fs";
import path from "node:path";
import postgres from "postgres";

import { getDatabaseDriver, PGLITE_DATA_DIR } from "./config";
import * as schema from "./schema";

export type { DatabaseDriver } from "./config";

export const databaseDriver = getDatabaseDriver();

const globalDatabase = globalThis as typeof globalThis & {
  pgliteClient?: PGlite;
};

let closeDatabaseConnection: () => Promise<void> = () => Promise.resolve();

function createDatabase(): PgDatabase<PgQueryResultHKT, typeof schema> {
  if (databaseDriver === "pglite") {
    const dataDir = path.resolve(PGLITE_DATA_DIR);
    mkdirSync(path.dirname(dataDir), { recursive: true });
    const client = globalDatabase.pgliteClient ?? new PGlite(dataDir);
    globalDatabase.pgliteClient = client;
    closeDatabaseConnection = async () => {
      await client.close();
      if (globalDatabase.pgliteClient === client) {
        delete globalDatabase.pgliteClient;
      }
    };
    return drizzlePglite(client, { schema });
  }

  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is required when DATABASE_DRIVER=postgres.");
  }

  const client = postgres(url, { prepare: false, max: 1 });
  closeDatabaseConnection = async () => client.end({ timeout: 5 });
  return drizzlePostgres(client, { schema });
}

export async function closeDatabase(): Promise<void> {
  await closeDatabaseConnection();
}

export const db = createDatabase();
export { schema };
export type DB = typeof db;
