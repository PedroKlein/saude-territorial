#!/usr/bin/env tsx

import { APIError } from "better-auth";

import { closeDatabase } from "../src/db/client";
import { auth } from "../src/lib/auth";

if (process.env.NODE_ENV === "production") {
  console.error("Refusing to seed a development user with NODE_ENV=production.");
  process.exit(1);
}

const email = process.env.DEV_USER_EMAIL ?? "dev@local.dev";
const password = process.env.DEV_USER_PASSWORD ?? "dev12345";
const name = process.env.DEV_USER_NAME ?? "Dev Local";

async function main(): Promise<void> {
  try {
    await auth.api.signUpEmail({ body: { email, password, name } });
    console.log("Created development user.");
  } catch (error) {
    if (
      error instanceof APIError &&
      error.body?.code === "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL"
    ) {
      console.log("Development user already exists.");
      return;
    }
    throw error;
  } finally {
    await closeDatabase();
  }
}

void main().catch((error: unknown) => {
  const code = error instanceof APIError ? error.body?.code ?? error.status : "UNKNOWN";
  console.error(`Failed to seed development user (${code}).`);
  process.exitCode = 1;
});
