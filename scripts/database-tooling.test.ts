// @vitest-environment node

import { PGlite } from "@electric-sql/pglite";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import postgres from "postgres";
import { afterEach, describe, expect, it } from "vitest";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const require = createRequire(import.meta.url);
const tsxLoader = require.resolve("tsx");
const repoRoot = process.cwd();
const temporaryDirectories: string[] = [];
const tableNames = ["patients", "gestantes_data", "tuberculose_data", "has_data"] as const;

type SeedCounts = Record<(typeof tableNames)[number], number>;

function commandEnvironment(overrides: Record<string, string | undefined>) {
  const env = { ...process.env };
  delete env.DATABASE_DRIVER;
  delete env.DATABASE_URL;
  delete env.I_HAVE_VERIFIED_NON_PROD;
  delete env.SEED_SYNTHETIC;
  return Object.assign(env, overrides);
}

async function runScript(
  script: "migrate-db.ts" | "reset-db.ts" | "seed-patients.ts",
  cwd: string,
  environment: Record<string, string | undefined>,
) {
  return execFileAsync(
    process.execPath,
    ["--import", tsxLoader, path.join(repoRoot, "scripts", script)],
    { cwd, env: commandEnvironment(environment) },
  );
}

async function makeTemporaryDirectory() {
  const directory = await mkdtemp(path.join(tmpdir(), "saude-territorial-tooling-"));
  temporaryDirectories.push(directory);
  return directory;
}

async function readPgliteCounts(directory: string): Promise<SeedCounts> {
  const client = new PGlite(path.join(directory, ".data/pglite"));
  const counts: SeedCounts = {
    patients: 0,
    gestantes_data: 0,
    tuberculose_data: 0,
    has_data: 0,
  };
  try {
    for (const table of tableNames) {
      const result = await client.query<{ count: number }>(
        `select count(*)::int as count from ${table}`,
      );
      counts[table] = result.rows[0]?.count ?? 0;
    }
    return counts;
  } finally {
    await client.close();
  }
}

async function migrateAndSeedPglite(directory: string) {
  await runScript("migrate-db.ts", directory, {});
  await runScript("seed-patients.ts", directory, { SEED_SYNTHETIC: "1" });
  return readPgliteCounts(directory);
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, { recursive: true, force: true }),
    ),
  );
});

describe("database tooling", () => {
  it("migrates and seeds local PGlite without Docker or DATABASE_URL", async () => {
    const directory = await makeTemporaryDirectory();

    const counts = await migrateAndSeedPglite(directory);

    expect(counts.patients).toBeGreaterThan(0);
    expect(counts.gestantes_data).toBeGreaterThan(0);
    expect(counts.tuberculose_data).toBeGreaterThan(0);
    expect(counts.has_data).toBeGreaterThan(0);
  }, 30_000);

  it("resets only the fixed local PGlite database", async () => {
    const directory = await makeTemporaryDirectory();
    await migrateAndSeedPglite(directory);

    const client = new PGlite(path.join(directory, ".data/pglite"));
    try {
      await client.exec("create table reset_probe (value text)");
    } finally {
      await client.close();
    }

    await runScript("reset-db.ts", directory, {});
    await migrateAndSeedPglite(directory);

    const resetClient = new PGlite(path.join(directory, ".data/pglite"));
    try {
      const probe = await resetClient.query<{ exists: boolean }>(
        "select to_regclass('reset_probe') is not null as exists",
      );
      expect(probe.rows[0]?.exists).toBe(false);
    } finally {
      await resetClient.close();
    }

    expect(await readPgliteCounts(directory)).toEqual({
      patients: 68,
      gestantes_data: 55,
      tuberculose_data: 5,
      has_data: 8,
    });
  }, 30_000);

  it("does not delete a legacy auth database", async () => {
    const directory = await makeTemporaryDirectory();
    const legacyAuthDatabase = path.join(directory, "auth.db");
    await writeFile(legacyAuthDatabase, "legacy-sentinel");

    await runScript("reset-db.ts", directory, {});

    expect(await readFile(legacyAuthDatabase, "utf8")).toBe("legacy-sentinel");
  });

  it("refuses to reset a Postgres target", async () => {
    const directory = await makeTemporaryDirectory();

    await expect(
      runScript("reset-db.ts", directory, {
        DATABASE_DRIVER: "postgres",
        DATABASE_URL: "postgresql://synthetic@example.com:5432/synthetic",
      }),
    ).rejects.toThrow("db:reset supports only the fixed local PGlite database.");
  });

  it.skipIf(!process.env.TEST_POSTGRES_URL)(
    "loads equal aggregate synthetic seed counts in PGlite and Postgres",
    async () => {
      const url = process.env.TEST_POSTGRES_URL;
      if (!url) throw new Error("TEST_POSTGRES_URL is required");

      const directory = await makeTemporaryDirectory();
      const pgliteCounts = await migrateAndSeedPglite(directory);

      await runScript("migrate-db.ts", repoRoot, {
        DATABASE_DRIVER: "postgres",
        DATABASE_URL: url,
        I_HAVE_VERIFIED_NON_PROD: "1",
        SEED_SYNTHETIC: "1",
      });
      await runScript("seed-patients.ts", repoRoot, {
        DATABASE_DRIVER: "postgres",
        DATABASE_URL: url,
        I_HAVE_VERIFIED_NON_PROD: "1",
        SEED_SYNTHETIC: "1",
      });

      const sql = postgres(url, { prepare: false, max: 1 });
      const postgresCounts: SeedCounts = {
        patients: 0,
        gestantes_data: 0,
        tuberculose_data: 0,
        has_data: 0,
      };
      try {
        for (const table of tableNames) {
          const [result] = await sql.unsafe<{ count: number }[]>(
            `select count(*)::int as count from ${table}`,
          );
          postgresCounts[table] = result?.count ?? 0;
        }
        expect(postgresCounts).toEqual(pgliteCounts);
      } finally {
        await sql.end({ timeout: 5 });
      }
    },
    60_000,
  );
});
