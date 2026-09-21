// @vitest-environment node

import { PGlite } from "@electric-sql/pglite";
import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";
import { afterEach, describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);
const repositoryRoot = path.resolve(import.meta.dirname, "..");
const temporaryDirectories: string[] = [];

async function makeTemporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(path.join(tmpdir(), "saude-auth-"));
  temporaryDirectories.push(directory);
  return directory;
}

async function runScript(
  script: "migrate-db.ts" | "seed-dev-user.ts",
  directory: string,
  environment: Record<string, string | undefined> = {},
): Promise<{ stdout: string; stderr: string }> {
  const { stdout, stderr } = await execFileAsync(
    path.join(repositoryRoot, "node_modules/.bin/tsx"),
    [path.join(repositoryRoot, "scripts", script)],
    {
      cwd: directory,
      env: {
        PATH: process.env.PATH,
        NODE_ENV: "development",
        BETTER_AUTH_SECRET: "synthetic-test-secret-at-least-32-characters",
        BETTER_AUTH_URL: "http://localhost:3000",
        DEV_USER_EMAIL: "dev.synthetic@example.invalid",
        DEV_USER_PASSWORD: "synthetic-password-1234",
        DEV_USER_NAME: "Usuário Sintético",
        ...environment,
      },
    },
  );
  return { stdout, stderr };
}

async function runAuthSmoke(
  directory: string,
  environment: Record<string, string | undefined> = {},
): Promise<string> {
  const authModule = pathToFileURL(path.join(repositoryRoot, "src/lib/auth.ts")).href;
  const databaseModule = pathToFileURL(path.join(repositoryRoot, "src/db/client.ts")).href;
  const script = path.join(directory, "auth-smoke.ts");
  await writeFile(
    script,
    `import { auth } from ${JSON.stringify(authModule)};
import { closeDatabase } from ${JSON.stringify(databaseModule)};

async function main(): Promise<void> {
  try {
    const response = await auth.api.signInEmail({
      body: {
        email: process.env.DEV_USER_EMAIL ?? "",
        password: process.env.DEV_USER_PASSWORD ?? "",
      },
      asResponse: true,
    });
    const cookie = response.headers.get("set-cookie")?.split(";", 1)[0];
    if (!response.ok || !cookie) throw new Error("Authentication did not return a session cookie.");
    const session = await auth.api.getSession({ headers: new Headers({ cookie }) });
    if (!session) throw new Error("Session cookie was not accepted.");
    console.log("Authentication verified.");
  } finally {
    await closeDatabase();
  }
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
`,
  );
  const { stdout } = await execFileAsync(path.join(repositoryRoot, "node_modules/.bin/tsx"), [script], {
    cwd: directory,
    env: {
      PATH: process.env.PATH,
      NODE_ENV: "development",
      BETTER_AUTH_SECRET: "synthetic-test-secret-at-least-32-characters",
      BETTER_AUTH_URL: "http://localhost:3000",
      DEV_USER_EMAIL: "dev.synthetic@example.invalid",
      DEV_USER_PASSWORD: "synthetic-password-1234",
      ...environment,
    },
  });
  return stdout;
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, { recursive: true, force: true, maxRetries: 3 }),
    ),
  );
});

describe("shared Better Auth database", () => {
  it("seeds the development user idempotently in PGlite without logging credentials", async () => {
    const directory = await makeTemporaryDirectory();
    await runScript("migrate-db.ts", directory);

    const firstOutput = await runScript("seed-dev-user.ts", directory);
    const secondOutput = await runScript("seed-dev-user.ts", directory);

    expect(firstOutput.stdout.trim()).toBe("Created development user.");
    expect(secondOutput.stdout.trim()).toBe("Development user already exists.");
    for (const output of [firstOutput, secondOutput]) {
      expect(`${output.stdout}${output.stderr}`).not.toContain("dev.synthetic@example.invalid");
      expect(`${output.stdout}${output.stderr}`).not.toContain("synthetic-password-1234");
    }
    expect((await runAuthSmoke(directory)).trim()).toBe("Authentication verified.");

    const client = new PGlite(path.join(directory, ".data/pglite"));
    try {
      const users = await client.query<{ count: number }>(
        'select count(*)::int as count from "user"',
      );
      const accounts = await client.query<{ count: number }>(
        'select count(*)::int as count from "account"',
      );
      expect(users.rows[0]?.count).toBe(1);
      expect(accounts.rows[0]?.count).toBe(1);
    } finally {
      await client.close();
    }
  }, 30_000);

  it.skipIf(!process.env.TEST_POSTGRES_URL)(
    "seeds the development user idempotently in Postgres",
    async () => {
      const directory = await makeTemporaryDirectory();
      const databaseEnvironment = {
        DATABASE_DRIVER: "postgres",
        DATABASE_URL: process.env.TEST_POSTGRES_URL,
      };
      await runScript("migrate-db.ts", directory, databaseEnvironment);

      const firstOutput = await runScript("seed-dev-user.ts", directory, databaseEnvironment);
      const secondOutput = await runScript("seed-dev-user.ts", directory, databaseEnvironment);

      expect(firstOutput.stdout.trim()).toBe("Created development user.");
      expect(secondOutput.stdout.trim()).toBe("Development user already exists.");
      for (const output of [firstOutput, secondOutput]) {
        expect(`${output.stdout}${output.stderr}`).not.toContain("dev.synthetic@example.invalid");
        expect(`${output.stdout}${output.stderr}`).not.toContain("synthetic-password-1234");
      }
      expect((await runAuthSmoke(directory, databaseEnvironment)).trim()).toBe(
        "Authentication verified.",
      );
    },
    30_000,
  );
});
