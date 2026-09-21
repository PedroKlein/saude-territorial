// @vitest-environment node

import { describe, expect, it } from "vitest";

import { evaluateNonProdGate } from "./non-prod-gate";

const developmentEnv = { NODE_ENV: "development" } as const;

describe("non-production database gate", () => {
  it.each([
    { ...developmentEnv },
    { ...developmentEnv, DATABASE_DRIVER: "pglite" },
  ])("allows the fixed local PGlite database", (env) => {
    expect(evaluateNonProdGate(env)).toEqual({
      ok: true,
      host: ".data/pglite",
      reason: "fixed local PGlite path",
    });
  });

  it("refuses explicit PGlite in production", () => {
    expect(
      evaluateNonProdGate({ NODE_ENV: "production", DATABASE_DRIVER: "pglite" }),
    ).toEqual({
      ok: false,
      host: ".data/pglite",
      reason: "DATABASE_DRIVER=pglite is not supported in production.",
    });
  });

  it("retains the remote Postgres refusal", () => {
    expect(
      evaluateNonProdGate({
        ...developmentEnv,
        DATABASE_DRIVER: "postgres",
        DATABASE_URL: "postgresql://synthetic@example.com:5432/synthetic",
      }),
    ).toEqual({
      ok: false,
      host: "example.com:5432",
      reason:
        "not in KNOWN_NON_PROD_REFS, no dev/staging pattern in URL, and no SEED_SYNTHETIC=1 && I_HAVE_VERIFIED_NON_PROD=1 opt-out",
    });
  });

  it("allows a deliberately verified remote non-production Postgres database", () => {
    expect(
      evaluateNonProdGate({
        ...developmentEnv,
        DATABASE_DRIVER: "postgres",
        DATABASE_URL: "postgresql://synthetic@example.com:5432/synthetic",
        I_HAVE_VERIFIED_NON_PROD: "1",
        SEED_SYNTHETIC: "1",
      }),
    ).toEqual({
      ok: true,
      host: "example.com:5432",
      reason: "explicit opt-out",
    });
  });
});
