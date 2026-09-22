#!/usr/bin/env tsx

import { rm } from "node:fs/promises";
import path from "node:path";

import { getDatabaseDriver, getPgliteDataDir } from "../src/db/config";

async function main(): Promise<void> {
  if (getDatabaseDriver() !== "pglite") {
    throw new Error("db:reset supports only the fixed local PGlite database.");
  }

  await rm(path.resolve(getPgliteDataDir()), { recursive: true, force: true });
}

void main().catch((error: unknown) => {
  console.error("Reset failed:", error instanceof Error ? error.message : String(error));
  process.exit(1);
});
