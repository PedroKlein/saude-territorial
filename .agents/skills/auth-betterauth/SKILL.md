---
name: auth-betterauth
description: >
  Better Auth integration for this Next.js 16 project with Google OAuth. Better Auth is the
  successor to Auth.js/NextAuth.js (Auth.js team joined Better Auth Sep 2025). Covers Google
  OAuth setup with custom scopes (spreadsheets), access token management for Sheets API
  on-behalf-of calls, session handling, proxy.ts route protection, incremental scope requests
  (linkSocial), and token refresh. Use when setting up auth, protecting routes, accessing
  the Google Sheets API token, refreshing tokens, or handling auth errors. Triggers on:
  Better Auth, auth, login, session, Google OAuth, access token, scope, spreadsheets scope,
  token refresh, sign in, sign out, protected route, proxy.ts auth, linkSocial, on-behalf-of.
  Do NOT use for Supabase Auth (we use Better Auth, not Supabase Auth for the primary login)
  or general proxy.ts patterns (use nextjs-patterns).
---

# Better Auth + Google OAuth

## Why Better Auth

Auth.js (formerly NextAuth.js) is now maintenance-only — the team joined Better Auth
(Sep 2025). Better Auth is TypeScript-first, framework-agnostic, and has first-class
support for:
- Incremental scope requests (critical for requesting Sheets access after initial login)
- Access token storage + retrieval (needed to call Google Sheets API on-behalf-of)
- Accumulated granted scopes per account
- Plugin system for 2FA, organizations, etc.

## Google Refresh Token: The #1 Production Failure

Google only issues a refresh token the FIRST time a user grants access. If you lose
the refresh token (or didn't request one), Sheets API calls fail silently after 1 hour.

**Always use `prompt: 'consent'` + `accessType: 'offline'`** in the provider config.
Without both, returning users won't get a new refresh token.

If a user reports "sheets stopped loading": they need to go to
https://myaccount.google.com/permissions, remove the app, and sign in again.

## Setup

```typescript
// lib/auth.ts — Server-side auth configuration
import { betterAuth } from 'better-auth'
import { nextCookies } from 'better-auth/next-js'
import Database from 'better-sqlite3'  // Local dev (SQLite)
// For production: import { Pool } from 'pg'

export const auth = betterAuth({
  // Local dev: SQLite file (zero config, just works)
  database: new Database('./auth.db'),
  // Production: use Supabase Postgres pooler
  // database: new Pool({ connectionString: process.env.DATABASE_URL }),
  plugins: [nextCookies()],  // Auto-sets cookies on responses
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      // Request spreadsheets scope at login
      scope: [
        'openid',
        'email',
        'profile',
        'https://www.googleapis.com/auth/spreadsheets',
      ],
      // Store access + refresh tokens for Sheets API calls
      accessType: 'offline',        // Gets refresh token
      prompt: 'consent',            // Forces consent screen → ensures refresh token
      includeGrantedScopes: true,   // Accumulate scopes across flows
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,   // 7 days
    updateAge: 60 * 60 * 24,        // Refresh session daily
  },
})
```

```typescript
// lib/auth-client.ts — Client-side auth hooks
import { createAuthClient } from 'better-auth/react'

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL,
})

// Export typed hooks
export const { useSession, signIn, signOut } = authClient
```

## Route Handler

```typescript
// app/api/auth/[...all]/route.ts
import { auth } from '@/lib/auth'
import { toNextJsHandler } from 'better-auth/next-js'

export const { GET, POST } = toNextJsHandler(auth)
```

## Sign In Flow

```tsx
// components/auth/LoginButton.tsx
"use client"
import { signIn } from '@/lib/auth-client'

export function LoginButton() {
  return (
    <Button onClick={() => signIn.social({ provider: 'google' })}>
      Entrar com Google
    </Button>
  )
}
```

## Getting the Access Token (for Sheets API)

Better Auth provides a dedicated `getAccessToken` API that handles refresh automatically:

```typescript
// lib/sheets/auth.ts — get Google access token for Sheets API calls
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'

export async function getGoogleAccessToken(): Promise<string> {
  // getAccessToken auto-refreshes if the token is expired — no manual expiry check needed.
  // ALWAYS call this fresh before each Sheets API call. Never cache the returned string.
  const result = await auth.api.getAccessToken({
    body: { providerId: 'google' },
    headers: await headers(),
  })

  if (!result?.accessToken) throw new Error('No Google access token available')
  return result.accessToken
}
```

Client-side (for triggering scope checks):
```typescript
"use client"
const { data } = await authClient.getAccessToken({ providerId: 'google' })
```

**Listing accounts** (to check granted scopes):
```typescript
const accounts = await authClient.user.listAccounts()
const google = accounts.data?.find(a => a.providerId === 'google')
```
```

Use in API routes:

```typescript
// app/api/sheets/[tabName]/route.ts
import { auth } from '@/lib/auth'
import { getGoogleAccessToken } from '@/lib/auth'
import { headers } from 'next/headers'

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const token = await getGoogleAccessToken()
  const sheetsData = await fetchSheetWithToken(token, tabName)

  return NextResponse.json(sheetsData)
}
```

## Incremental Scope Requests

If user first logs in without Sheets scope, request it later.
**Check before requesting** — calling `linkSocial` when scope is already granted
forces an unnecessary re-consent screen:

```typescript
"use client"
import { authClient } from '@/lib/auth-client'

async function ensureSheetsAccess(grantedScopes: string[]) {
  const sheetsScope = 'https://www.googleapis.com/auth/spreadsheets'
  if (grantedScopes.includes(sheetsScope)) return  // Already have it

  await authClient.linkSocial({
    provider: 'google',
    scopes: [sheetsScope],
  })
}
```

## Route Protection in proxy.ts

**File location:** `src/proxy.ts` (NOT `src/app/proxy.ts` — that path is silently ignored).

```typescript
// src/proxy.ts
import { auth } from '@/lib/auth'

export async function proxy(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: request.headers,
  })

  const { pathname } = request.nextUrl

  // Protect app routes
  if (pathname.startsWith('/map') || pathname.startsWith('/settings')) {
    if (!session) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  // Redirect logged-in users away from login
  if (pathname === '/login' && session) {
    return NextResponse.redirect(new URL('/map', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api/auth|_next/static|_next/image|favicon.ico).*)'],
}
```

## Server-Side Session Access

```typescript
// In Server Components or Route Handlers
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'

export default async function DashboardLayout({ children }) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/login')

  return (
    <div>
      <Sidebar user={session.user} />
      {children}
    </div>
  )
}
```

## NEVER

- **NEVER store Google access tokens in localStorage or cookies** — Better Auth stores them server-side in the database; access via `getGoogleAccessToken()`
- **NEVER use `getSession()` alone to validate auth** — sessions can be stale; use the API route protection pattern or validate token expiry
- **NEVER request Sheets scope without `accessType: 'offline'`** — without it, you don't get a refresh token and can't make API calls when the session expires
- **NEVER assume the access token is valid just because you have one** — always call `getGoogleAccessToken()` which auto-refreshes; never store or reuse a previous token string
- **NEVER skip `prompt: 'consent'`** — Google only issues refresh tokens on first consent; without forcing it, returning users won't get a new refresh token
- **NEVER cache the access token string** — always call `getAccessToken()` fresh before each Sheets API call; Better Auth handles refresh internally; caching risks using an expired token
- **NEVER call Google Sheets API from Client Components** — always proxy through your API routes; the access token must never reach the browser
- **NEVER hardcode Google OAuth client credentials** — use environment variables; they differ between dev and prod
- **NEVER block on auth check in proxy.ts for public routes** — only check session for protected paths; checking everywhere adds latency to every request
- **NEVER assume the access token is valid** — always check expiry and refresh if needed before making Sheets API calls
