#!/usr/bin/env tsx
/**
 * verify-non-prod-db — CLI wrapper for `enforceNonProdGate`.
 *
 * Invoked (via package.json `&&` chaining) before any destructive DB step
 * such as `drizzle-kit push`, `drizzle-kit migrate`, or `db:seed`.
 *
 * The gate logic lives in `scripts/lib/non-prod-gate.ts` so
 * `scripts/seed-patients.ts` can import and call it in-process — defense
 * in depth against direct-invocation bypasses of the shell chain.
 */

import { enforceNonProdGate } from "./lib/non-prod-gate";

enforceNonProdGate();
