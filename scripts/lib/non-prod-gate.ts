/**
 * Non-prod DB gate — refuses to run against production-shaped databases.
 *
 * Consumed by:
 *   - `scripts/verify-non-prod-db.ts` (CLI wrapper, run via `&&` from
 *     package.json destructive scripts)
 *   - `scripts/seed-patients.ts` (in-process check, defense-in-depth: guards
 *     against direct `tsx scripts/seed-patients.ts` invocations that would
 *     bypass the shell chain)
 *
 * Never logs the password portion of DATABASE_URL — only the host+port.
 *
 * See `docs/adr/ADR-002-drizzle-orm.md` and
 * `plans/pivot-execution.md#mandatory-pre-db-mutation-gate`.
 */

/** Known non-prod project refs. Add refs as new dev/staging projects appear. */
export const KNOWN_NON_PROD_REFS = [
  "gplnvzxtqpqyznqiysza", // saude-territorial PoC (the only Supabase project as of PE-0)
] as const;

/** Host patterns that unambiguously indicate a non-prod environment. */
const NON_PROD_HOST_PATTERN = /localhost|127\.0\.0\.1|-dev\.|staging|test/;

export interface GateResult {
  readonly ok: boolean;
  readonly host: string;
  readonly reason: string;
}

/**
 * Evaluate the gate against the environment. Pure function — no side effects,
 * no process.exit. Callers decide how to react.
 */
export function evaluateNonProdGate(env: NodeJS.ProcessEnv = process.env): GateResult {
  const url = env.DATABASE_URL ?? "";

  if (!url) {
    return { ok: false, host: "<unset>", reason: "DATABASE_URL is not set" };
  }

  let host: string;
  try {
    const parsed = new URL(url);
    host = `${parsed.hostname}${parsed.port ? `:${parsed.port}` : ""}`;
  } catch {
    return { ok: false, host: "<unparseable URL>", reason: "DATABASE_URL is not a valid URL" };
  }

  if (env.SEED_SYNTHETIC === "1" && env.I_HAVE_VERIFIED_NON_PROD === "1") {
    return { ok: true, host, reason: "explicit opt-out" };
  }

  if (KNOWN_NON_PROD_REFS.some((ref) => url.includes(ref))) {
    return { ok: true, host, reason: "whitelisted non-prod ref" };
  }

  if (NON_PROD_HOST_PATTERN.test(url)) {
    return { ok: true, host, reason: "matched dev/staging pattern" };
  }

  return {
    ok: false,
    host,
    reason:
      "not in KNOWN_NON_PROD_REFS, no dev/staging pattern in URL, and no SEED_SYNTHETIC=1 && I_HAVE_VERIFIED_NON_PROD=1 opt-out",
  };
}

/**
 * Enforce the gate: log the decision and exit(1) on refusal. Used both by
 * the CLI entry (verify-non-prod-db.ts) and by seed-patients.ts.
 */
export function enforceNonProdGate(env: NodeJS.ProcessEnv = process.env): void {
  const result = evaluateNonProdGate(env);
  if (result.ok) {
    console.error(`verify-non-prod-db: allowing operation on ${result.host} (${result.reason}).`);
    return;
  }
  console.error(`Refusing to run against ${result.host}: ${result.reason}.`);
  if (result.host !== "<unset>" && result.host !== "<unparseable URL>") {
    console.error(
      "If this really is a non-prod database, add its project ref to KNOWN_NON_PROD_REFS in scripts/lib/non-prod-gate.ts.",
    );
  }
  process.exit(1);
}
