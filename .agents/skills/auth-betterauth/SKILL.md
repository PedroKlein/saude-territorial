---
name: auth-betterauth
description: Google OAuth via Better Auth — identity only. Session cookies, dashboard route protection, sign-in/sign-out flows. Post-pivot (see docs/adr/ADR-001-drop-sheets.md), no Sheets/Google API scopes, no on-behalf-of token handling.
disable-model-invocation: true
---

# Better Auth — Identity-Only Google OAuth

## Scope of this skill

Everything auth-related **for identity**: who is this user, do they have a valid session, protect the dashboard routes, sign in and sign out. Nothing more.

**This skill does NOT cover data access.** All CRUD queries and mutations against Supabase go through Drizzle — see the `drizzle-data-access` skill. Auth's only relationship with data is "is there a session cookie set on this request".

## Historical note (post-pivot)

Before the pivot (see `docs/adr/ADR-001-drop-sheets.md`), this app requested the `https://www.googleapis.com/auth/spreadsheets` scope, refreshed Google access tokens on demand, and called Sheets on behalf of the signed-in user. **All of that is gone.** The scope is now `openid email profile` only, there is no refresh-token dance, and `getGoogleAccessToken` no longer exists.

If a future feature needs additional Google scopes (a "sync from Sheets" import, a Drive picker, etc.), use Better Auth's **incremental scope** pattern — do NOT re-broaden the initial sign-in.

## Setup

### `src/lib/auth.ts`

```typescript
import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import Database from "better-sqlite3";

export const auth = betterAuth({
  database: new Database("./auth.db"),
  plugins: [nextCookies()],
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      scope: ["openid", "email", "profile"],
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,   // 7 days
    updateAge: 60 * 60 * 24,        // refresh sliding-window daily
  },
});
```

**Rules:**
- Never add `spreadsheets`, `drive`, or any Google API scope here. Use incremental scopes for those.
- Never persist raw access tokens or refresh tokens outside Better Auth's own store.
- `BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` must all be present in env; the app should fail fast on start otherwise.

### `src/lib/auth-client.ts`

```typescript
import { createAuthClient } from "better-auth/client";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
});
```

Import `signIn`, `signOut`, `useSession` from `authClient` in client components.

## Route protection

### `proxy.ts` at repo root

```typescript
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const PROTECTED_PREFIXES = ["/map", "/settings"];
const AUTH_ROUTES = ["/login"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = await auth.api.getSession({ headers: request.headers });

  if (session && AUTH_ROUTES.includes(pathname)) {
    return NextResponse.redirect(new URL("/map", request.url));
  }

  const requiresAuth = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  if (!session && requiresAuth) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
```

## Sign-in / sign-out UI

```tsx
"use client";
import { authClient } from "@/lib/auth-client";

export function SignInButton() {
  return (
    <button
      onClick={() =>
        authClient.signIn.social({
          provider: "google",
          callbackURL: "/map",
        })
      }
    >
      Entrar com Google
    </button>
  );
}
```

Do **not** pass extra scopes to `signIn.social`. The default scopes from `auth.ts` are correct; adding more here defeats the identity-only stance.

## Reading the session in server components / API routes

```typescript
import { auth } from "@/lib/auth";

const session = await auth.api.getSession({ headers: request.headers });
if (!session) {
  return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
}
// session.user.id, session.user.email, session.user.name are all you get
```

## Testing

Mock `better-auth` at the module level to control session state per test. Never spin up a real Better Auth instance in unit tests.

```typescript
vi.mock("better-auth", () => ({
  betterAuth: vi.fn((config) => ({
    __capturedConfig: config,
    api: { getSession: vi.fn() },
  })),
}));
```

Assert the scope shape (identity-only) at least once — it's cheap insurance against a regression that re-adds Sheets scopes silently.

## Anti-patterns

- Requesting Google API scopes at sign-in "just in case" — request them incrementally when the feature that needs them is built.
- Storing patient data or personal identifiers in `auth.db` — that database is for authentication artefacts only.
- Building custom session logic on top of Better Auth — use its `getSession` and let it handle cookies, expiration, and refresh.
- Logging `session.token` or any raw credential — never. Log `session.user.id` when you must correlate.

## References

- `docs/adr/ADR-001-drop-sheets.md` — why the Sheets scope disappeared
- Better Auth docs — https://better-auth.com
