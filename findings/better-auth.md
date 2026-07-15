# Better Auth — Findings & Gotchas

## Cookie Signing (Critical)

Better Auth signs session cookies using HMAC-SHA256. The cookie value format is:

```
{token}.{base64_signature}
```

- Signature is **standard base64** (not base64url), exactly 44 chars, ending with `=`
- Signed using the `BETTER_AUTH_SECRET` env var
- Verification checks: `signature.length === 44 && signature.endsWith("=")`

**Node.js equivalent:**
```javascript
import crypto from 'crypto';
const signature = crypto.createHmac('sha256', BETTER_AUTH_SECRET).update(token).digest('base64');
const signedToken = encodeURIComponent(`${token}.${signature}`);
```

**Implication:** You cannot manually set `better-auth.session_token` cookie with just the raw
token value. It MUST be signed. Use the dev-session endpoint for testing.

## SQLite for Local Development

Better Auth supports SQLite via `better-sqlite3`:

```typescript
import Database from "better-sqlite3";
export const auth = betterAuth({
  database: new Database("./auth.db"),
  // ... rest of config
});
```

- Install: `pnpm add better-sqlite3` + `pnpm add -D @types/better-sqlite3`
- Approve builds: `pnpm approve-builds better-sqlite3`
- Add `auth.db` to `.gitignore`

## Database Migration

Use the **built-in CLI** — do NOT write custom migration scripts:

```bash
echo 'y' | npx auth migrate
```

This creates: `user`, `session`, `account`, `verification` tables.

**Common error:** `SqliteError: no such table: verification` → you forgot to run migrate.

## Refresh Token Behavior

Google only issues a refresh token on **first authorization**. Critical config:

```typescript
socialProviders: {
  google: {
    accessType: "offline",   // Required for refresh token
    prompt: "consent",       // Forces re-consent → guarantees new refresh token
  }
}
```

Without `prompt: "consent"`, returning users won't get a new refresh token if the old one
was lost.

## nextCookies Plugin

The `nextCookies()` plugin intercepts `getSession` to read cookies via Next.js `headers()`.
This is required for Server Components and Route Handlers to access the session.

```typescript
import { nextCookies } from "better-auth/next-js";
export const auth = betterAuth({
  plugins: [nextCookies()],
});
```

## toNextJsHandler

Route handler must use `toNextJsHandler` — it returns `{ GET, POST }`:

```typescript
// src/app/api/auth/[...all]/route.ts
import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";
export const { GET, POST } = toNextJsHandler(auth);
```

## Dependency Version Conflicts

The `@better-auth/cli` package can pull in an old version of `better-call` (1.1.8)
that conflicts with `@better-auth/core` (needs 1.3.7+). Symptom:

```
Export kAPIErrorHeaderSymbol doesn't exist in target module
```

**Fix:** Remove `@better-auth/cli` from devDependencies. Use `npx auth@latest migrate`
instead (it installs temporarily).
