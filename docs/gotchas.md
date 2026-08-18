# Common gotchas and non-obvious behavior

Behaviors and constraints that aren't obvious from the code alone. Read the relevant section before working in that area.

## Next.js 16

### proxy.ts location

`proxy.ts` MUST live at one of these paths:

- `src/proxy.ts` ✅
- `proxy.ts` (project root) ✅
- `src/app/proxy.ts` ❌ silently ignored

Next.js internals check for `/proxy` or `/src/proxy` specifically.

### Server Components cannot pass functions to Client Components

```tsx
// ❌ Crashes: "Event handlers cannot be passed to Client Component props"
// A Server Component (default) rendering a Client Component with a callback prop.
export default function SettingsPage() {
  return <SomeClientForm onSave={(id) => console.log(id)} />;
}

// ✅ Add "use client" to the page.
"use client";
export default function SettingsPage() {
  return <SomeClientForm onSave={(id) => console.log(id)} />;
}
```

If a page passes callback props to a Client Component, the page itself must be `"use client"`.

### Turbopack and tsconfig changes

On first `next dev --turbopack`, Turbopack may auto-modify `tsconfig.json`:

- Adds `.next/dev/types/**/*.ts` to `include`
- Changes `jsx` to `react-jsx`

This is expected; commit it.

### Dynamic import for Leaflet

Leaflet requires `window`. Always:

```tsx
const MapView = dynamic(() => import("@/components/map/MapView"), { ssr: false });
```

## Better Auth

### Cookie signing

Better Auth signs session cookies with HMAC-SHA256. The cookie value format is `{token}.{base64_signature}`:

- Signature is **standard base64** (not base64url), exactly 44 chars, ending with `=`
- Signed with the `BETTER_AUTH_SECRET` env var
- Verification checks `signature.length === 44 && signature.endsWith("=")`

Node equivalent:

```javascript
import crypto from "crypto";
const signature = crypto.createHmac("sha256", BETTER_AUTH_SECRET).update(token).digest("base64");
const signedToken = encodeURIComponent(`${token}.${signature}`);
```

You cannot set `better-auth.session_token` with just the raw token — it must be signed. Use the dev-session endpoint for testing.

### SQLite for local development

Better Auth uses SQLite via `better-sqlite3`:

```typescript
import Database from "better-sqlite3";
export const auth = betterAuth({
  database: new Database("./auth.db"),
  // ...
});
```

- Install: `pnpm add better-sqlite3` + `pnpm add -D @types/better-sqlite3`
- Approve builds: `pnpm approve-builds better-sqlite3`
- `auth.db` is gitignored

### Database migration

Use the built-in CLI — do NOT write custom migration scripts:

```bash
echo 'y' | npx auth migrate
```

Creates `user`, `session`, `account`, `verification` tables. Common error `SqliteError: no such table: verification` → you forgot to run migrate.

### Refresh token behavior

Google only issues a refresh token on **first authorization**:

```typescript
socialProviders: {
  google: {
    accessType: "offline",   // required for refresh token
    prompt: "consent",       // forces re-consent → guarantees a new refresh token
  }
}
```

Without `prompt: "consent"`, returning users won't get a new refresh token if the old one was lost.

### nextCookies plugin

`nextCookies()` intercepts `getSession` to read cookies via Next.js `headers()`. Required for Server Components and Route Handlers to access the session:

```typescript
import { nextCookies } from "better-auth/next-js";
export const auth = betterAuth({ plugins: [nextCookies()] });
```

### toNextJsHandler

The auth route handler must use `toNextJsHandler`, which returns `{ GET, POST }`:

```typescript
// src/app/api/auth/[...all]/route.ts
import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";
export const { GET, POST } = toNextJsHandler(auth);
```

### Dependency version conflicts

`@better-auth/cli` can pull an old `better-call` (1.1.8) that conflicts with `@better-auth/core` (needs 1.3.7+). Symptom:

```
Export kAPIErrorHeaderSymbol doesn't exist in target module
```

Fix: remove `@better-auth/cli` from devDependencies. Use `npx auth@latest migrate` instead (installs temporarily).

## UI patterns

### Never ship unstyled pages

A page is not done until it has:

- Proper spacing and layout (not raw HTML stacking)
- Card/container with border and shadow for form sections
- Styled inputs with borders, focus rings, and placeholder text
- Buttons with `cursor-pointer`, background color, hover state, active press effect
- Responsive max-width container
- Consistent heading hierarchy
- PT-BR text for all user-facing content

### Global interactive styles

In `globals.css`, all interactive elements get `cursor-pointer` automatically:

```css
button, a, [role="button"], input[type="submit"], select {
  cursor: pointer;
}
```

### Button pattern

```tsx
<button className="cursor-pointer rounded-md bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-light hover:shadow-md active:scale-[0.98] transition-all">
  Salvar
</button>
```

### Input pattern

```tsx
<input className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
```

### Card / section pattern

```tsx
<div className="rounded-lg border bg-white p-6 shadow-sm">
  <h3 className="mb-1 text-lg font-semibold text-gray-900">Title</h3>
  <p className="mb-4 text-sm text-gray-500">Description</p>
  {/* content */}
</div>
```

### Dashboard layout pattern

```tsx
<div className="min-h-screen bg-gray-50">
  <header className="border-b bg-white px-6 py-4 shadow-sm">
    <div className="mx-auto flex max-w-5xl items-center justify-between">
      <h1 className="text-xl font-bold text-primary">Saúde Territorial</h1>
    </div>
  </header>
  <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
</div>
```

### Color tokens (from globals.css @theme)

- `primary`: #1B5E20 (dark green — app brand)
- `primary-light`: #4CAF50 (hover state)
- `urgent-red`: #D32F2F (critical alerts)
- `alert-yellow`: #F9A825 (attention alerts)
- `safe-green`: #388E3C (normal/ok state)

## Development environment

| Issue | Cause | Fix |
|---|---|---|
| Page shows "This page couldn't load" | Server Component passing an event handler to a Client Component | Add `"use client"` to the page |
| Button click does nothing | Better Auth tables missing | `echo 'y' \| npx auth migrate` |
| 500 on API route | Route handler bug | Check server logs; ensure the Drizzle client is initialized |
| `no such table: verification` | Auth DB not migrated | `echo 'y' \| npx auth migrate` |
| Cookie not working | Better Auth signs cookies with HMAC | Use the dev-session endpoint for signed cookies |
| `proxy.ts` not working | Wrong file location | Must be `src/proxy.ts`, not `src/app/proxy.ts` |
| `auth.db` not found | Dev server started from the wrong directory | Always start from the project root |
