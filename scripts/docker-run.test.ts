// @vitest-environment node

import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);
const script = path.resolve("docker-run.sh");
const hostname = "app.example.org";
let directory: string;
let environment: NodeJS.ProcessEnv;

async function run(...args: string[]) {
  return execFileAsync("bash", [script, ...args], {
    cwd: directory,
    env: environment,
  });
}

async function dockerCalls() {
  return readFile(path.join(directory, "docker.log"), "utf8").catch(() => "");
}

beforeEach(async () => {
  directory = await mkdtemp(path.join(tmpdir(), "saude-https-test-"));
  environment = {
    ...process.env,
    PATH: `${directory}:${process.env.PATH}`,
    HTTPS_HOST: hostname,
    TLS_CERT_DIR: directory,
    SSL_CERT_FILE: path.join(directory, `${hostname}.fullchain.crt`),
    DOCKER_LOG: path.join(directory, "docker.log"),
    DOCKER_ORIGIN_LOG: path.join(directory, "origin.log"),
    FAIL_NGINX_CHECK: "0",
  };
  await writeFile(
    path.join(directory, "docker"),
    `#!/usr/bin/env bash
printf '%s\\n' "$*" >> "$DOCKER_LOG"
printf '%s\\n' "\${BETTER_AUTH_URL:-}" >> "$DOCKER_ORIGIN_LOG"
if [[ "$*" == *"nginx -t"* && "$FAIL_NGINX_CHECK" == "1" ]]; then
  exit 1
fi
`,
    { mode: 0o700 },
  );
  await execFileAsync("openssl", [
    "req", "-x509", "-newkey", "rsa:2048", "-noenc", "-days", "2",
    "-keyout", path.join(directory, `${hostname}.key`),
    "-out", path.join(directory, `${hostname}.fullchain.crt`),
    "-subj", `/CN=${hostname}`,
    "-addext", `subjectAltName=DNS:${hostname}`,
  ]);
});

afterEach(async () => {
  await rm(directory, { recursive: true, force: true });
});

describe("Docker deployment command", () => {
  it.each([
    ["dev", "compose -f docker-compose.dev.yml up"],
    ["prod", "compose -f docker-compose.prod.yml up --build -d"],
  ])("preserves the %s command", async (mode, expected) => {
    await run(mode);
    expect((await dockerCalls()).trim()).toBe(expected);
  });

  it("checks HTTPS without starting or recreating services", async () => {
    await run("https", "--check");
    const calls = await dockerCalls();
    expect(calls).toContain("-f docker-compose.prod.yml -f docker-compose.https.yml config --quiet");
    expect(calls).toContain("run --rm --no-deps proxy nginx -t");
    expect(calls).not.toContain(" up ");
  });

  it("sets the HTTPS auth origin before Compose interpolates the base file", async () => {
    environment.BETTER_AUTH_URL = "http://old.example.org:3000";
    await run("https", "--check");
    const origins = await readFile(path.join(directory, "origin.log"), "utf8");
    expect(origins.trim().split("\n")).toEqual([
      `https://${hostname}`,
      `https://${hostname}`,
    ]);
  });

  it("activates only app and proxy using existing images after validation", async () => {
    await run("https");
    const calls = (await dockerCalls()).trim().split("\n");
    expect(calls).toHaveLength(3);
    expect(calls[1]).toContain("nginx -t");
    expect(calls[2]).toContain("up -d --no-deps --no-build --force-recreate app proxy");
    expect(calls.join("\n")).not.toContain("down");
  });

  it("rejects a missing certificate before calling Docker", async () => {
    await rm(path.join(directory, `${hostname}.fullchain.crt`));
    await expect(run("https")).rejects.toThrow();
    expect(await dockerCalls()).toBe("");
  });

  it("rejects a mismatched private key before calling Docker", async () => {
    await execFileAsync("openssl", [
      "genpkey", "-algorithm", "RSA", "-pkeyopt", "rsa_keygen_bits:2048",
      "-out", path.join(directory, `${hostname}.key`),
    ]);
    await expect(run("https")).rejects.toThrow();
    expect(await dockerCalls()).toBe("");
  });

  it("rejects a certificate for another hostname before calling Docker", async () => {
    await execFileAsync("openssl", [
      "req", "-x509", "-key", path.join(directory, `${hostname}.key`),
      "-days", "2", "-out", path.join(directory, `${hostname}.fullchain.crt`),
      "-subj", "/CN=other.example.org",
      "-addext", "subjectAltName=DNS:other.example.org",
    ]);
    await expect(run("https")).rejects.toThrow(/hostname mismatch/);
    expect(await dockerCalls()).toBe("");
  });

  it("rejects the certificate after expiry before calling Docker", async () => {
    const { stdout } = await execFileAsync("which", ["openssl"]);
    environment.REAL_OPENSSL = stdout.trim();
    environment.VERIFY_AT_TIME = String(Math.floor(Date.now() / 1000) + 3 * 86_400);
    await writeFile(
      path.join(directory, "openssl"),
      `#!/usr/bin/env bash
if [[ "$1" == "verify" ]]; then
  shift
  exec "$REAL_OPENSSL" verify -attime "$VERIFY_AT_TIME" "$@"
fi
exec "$REAL_OPENSSL" "$@"
`,
      { mode: 0o700 },
    );
    await expect(run("https")).rejects.toThrow(/expired/);
    expect(await dockerCalls()).toBe("");
  });

  it("rejects an untrusted certificate before calling Docker", async () => {
    environment.SSL_CERT_FILE = "/dev/null";
    environment.SSL_CERT_DIR = directory;
    await expect(run("https")).rejects.toThrow();
    expect(await dockerCalls()).toBe("");
  });

  it("does not activate when Nginx validation fails", async () => {
    environment.FAIL_NGINX_CHECK = "1";
    await expect(run("https")).rejects.toThrow();
    expect(await dockerCalls()).toContain("nginx -t");
    expect(await dockerCalls()).not.toContain(" up ");
  });

  it("rejects unknown HTTPS arguments before calling Docker", async () => {
    await expect(run("https", "--unexpected")).rejects.toThrow();
    expect(await dockerCalls()).toBe("");
  });
});
