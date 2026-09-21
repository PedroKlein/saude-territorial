// @vitest-environment node

import { execFile } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";
import { afterEach, describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);
const require = createRequire(import.meta.url);
const tsxLoader = pathToFileURL(require.resolve("tsx")).href;
const clientModuleUrl = pathToFileURL(path.resolve("src/db/client.ts")).href;
const temporaryDirectories: string[] = [];

async function runClient(
  source: string,
  cwd: string,
  environment: Record<string, string | undefined> = {},
) {
  const childEnvironment = { ...process.env };
  delete childEnvironment.DATABASE_DRIVER;
  delete childEnvironment.DATABASE_URL;
  childEnvironment.NODE_ENV = "development";
  Object.assign(childEnvironment, environment);

  return execFileAsync(
    process.execPath,
    [
      "--import",
      tsxLoader,
      "--input-type=module",
      "--eval",
      `const { db, databaseDriver } = await import(${JSON.stringify(clientModuleUrl)}); ${source}`,
    ],
    {
      cwd,
      env: childEnvironment,
    },
  );
}

async function makeTemporaryDirectory() {
  const directory = await mkdtemp(path.join(tmpdir(), "saude-territorial-pglite-"));
  temporaryDirectories.push(directory);
  return directory;
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, { recursive: true, force: true }),
    ),
  );
});

describe("database runtime", () => {
  it("defaults to a persistent local PGlite database without DATABASE_URL", async () => {
    const directory = await makeTemporaryDirectory();

    await runClient(
      `
        if (databaseDriver !== "pglite") throw new Error("Expected PGlite");
        await db.execute("create table runtime_probe (value text not null)");
        await db.execute("insert into runtime_probe values ('persisted')");
        await db.$client.close();
      `,
      directory,
    );

    await expect(
      runClient(
        `
          const result = await db.execute("select value from runtime_probe");
          if (result.rows[0]?.value !== "persisted") throw new Error("PGlite data was not persisted");
          await db.$client.close();
        `,
        directory,
      ),
    ).resolves.toBeDefined();
  }, 30_000);

  it("requires DATABASE_URL for the postgres driver", async () => {
    const directory = await makeTemporaryDirectory();

    await expect(
      runClient("", directory, { DATABASE_DRIVER: "postgres" }),
    ).rejects.toThrow("DATABASE_URL is required when DATABASE_DRIVER=postgres.");
  });

  it("uses postgres.js when explicitly selected", async () => {
    const directory = await makeTemporaryDirectory();

    await expect(
      runClient(
        `
          if (databaseDriver !== "postgres") throw new Error("Expected postgres.js");
          await db.$client.end({ timeout: 0 });
        `,
        directory,
        {
          DATABASE_DRIVER: "postgres",
          DATABASE_URL: "postgresql://synthetic@localhost:5432/synthetic",
        },
      ),
    ).resolves.toBeDefined();
  });

  it("defaults to postgres.js in production", async () => {
    const directory = await makeTemporaryDirectory();

    await expect(
      runClient(
        `
          if (databaseDriver !== "postgres") throw new Error("Expected postgres.js");
          await db.$client.end({ timeout: 0 });
        `,
        directory,
        {
          DATABASE_URL: "postgresql://synthetic@localhost:5432/synthetic",
          NODE_ENV: "production",
        },
      ),
    ).resolves.toBeDefined();
  });

  it("refuses PGlite in production", async () => {
    const directory = await makeTemporaryDirectory();

    await expect(
      runClient("", directory, {
        DATABASE_DRIVER: "pglite",
        NODE_ENV: "production",
      }),
    ).rejects.toThrow("DATABASE_DRIVER=pglite is not supported in production.");
  });

  it("rejects unknown database drivers", async () => {
    const directory = await makeTemporaryDirectory();

    await expect(
      runClient("", directory, { DATABASE_DRIVER: "sqlite" }),
    ).rejects.toThrow("Unsupported DATABASE_DRIVER: sqlite");
  });

  it("reuses the PGlite client when the module is recreated", async () => {
    const directory = await makeTemporaryDirectory();

    await runClient(
      `
        const second = await import(${JSON.stringify(`${clientModuleUrl}?hmr=second`)});
        if (db.$client !== second.db.$client) throw new Error("PGlite client was recreated");
        await db.$client.close();
      `,
      directory,
    );
  }, 30_000);
});
