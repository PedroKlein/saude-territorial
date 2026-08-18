#!/usr/bin/env tsx
/**
 * seed-dev-user — create a local email/password user so a fresh clone can log
 * in without any external identity provider.
 *
 * Uses Better Auth's server API (proper password hashing). Idempotent: a
 * second run is a no-op if the user already exists. Refuses to run with
 * NODE_ENV=production — this mints a known-password account and must never
 * touch a real auth store.
 *
 * Credentials default to dev@local / dev12345 and can be overridden with
 * DEV_USER_EMAIL / DEV_USER_PASSWORD / DEV_USER_NAME.
 */

import { auth } from "@/lib/auth";

if (process.env.NODE_ENV === "production") {
  console.error("Refusing to seed a dev user with NODE_ENV=production.");
  process.exit(1);
}

const email = process.env.DEV_USER_EMAIL ?? "dev@local.dev";
const password = process.env.DEV_USER_PASSWORD ?? "dev12345";
const name = process.env.DEV_USER_NAME ?? "Dev Local";

async function main(): Promise<void> {
  try {
    await auth.api.signUpEmail({ body: { email, password, name } });
    console.log(`Created dev user: ${email} / ${password}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (/exist|already|unique/i.test(message)) {
      console.log(`Dev user already exists: ${email} (login with password ${password})`);
      return;
    }
    console.error(`Failed to create dev user: ${message}`);
    process.exit(1);
  }
}

void main();
