# Testing & Verification Guide

How to verify that features actually work — not just that tests pass.

See [docs/gotchas.md](./docs/gotchas.md) for common non-obvious behaviors across the stack.

## Philosophy

**Tests passing ≠ feature working.** Unit tests verify logic in isolation. Browser validation verifies the assembled app works for a real user. Both are required before considering a change complete.

## Verification layers

| Layer | What it catches | Tool |
|---|---|---|
| `pnpm type-check` | Type errors, missing imports | CLI |
| `pnpm test` | Logic bugs, contract violations | CLI |
| `pnpm lint` | Style violations, unused code | CLI |
| `pnpm build` | Build-time failures, RSC/client boundary errors | CLI |
| Manual browser check | Unstyled pages, hydration errors, missing `"use client"` | Browser |
| Manual interaction | Broken buttons, failed navigations, OAuth flow | Browser |
| API check (`curl`) | 500 errors, missing routes, auth rejection | HTTP |
| Route protection | Unauthenticated access to protected pages | Browser |

## Setup

### Prerequisites

```bash
mise run dev        # Start the dev server (port 3000)
mise run dev:auth   # Generate .auth-state.json (requires login once manually first)
```

### First-time setup (one-time only)

1. Log in manually at http://localhost:3000/login (Google OAuth).
2. Run `mise run dev:auth` — refreshes the Google token and creates `.auth-state.json`.
3. The auth state is valid for 7 days. Re-run `mise run dev:auth` when it expires.

If `mise run dev:auth` fails with "No Google account found", log in manually first.

## curl patterns

For API-only checks without browser overhead:

```bash
# Get a signed dev-session cookie
COOKIE=$(curl -s -D - http://localhost:3000/api/auth/dev-session 2>/dev/null \
  | grep "set-cookie.*session_token" \
  | sed 's/.*session_token=\([^;]*\).*/\1/')

# Authenticated API call
curl -s -H "Cookie: better-auth.session_token=$(python3 -c "import urllib.parse; print(urllib.parse.unquote('$COOKIE'))")" \
  "http://localhost:3000/api/patients"

# Unauthenticated check (expect 401)
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/patients
```

## Verification checklist per change

After implementing a feature, verify all of these before committing.

### For UI pages

- [ ] `pnpm type-check` — no type errors
- [ ] `pnpm test` — all tests pass
- [ ] Page renders with expected elements
- [ ] Page is styled (not raw unstyled HTML)
- [ ] Buttons have `cursor-pointer` and hover states
- [ ] All user-facing text is in PT-BR
- [ ] Page is protected (unauthenticated → redirects to `/login`)

### For API routes

- [ ] `pnpm type-check` — no type errors
- [ ] `pnpm test` — all tests pass
- [ ] Returns 401 without auth (not 500)
- [ ] Returns expected data with auth (use `curl` with the dev-session cookie)
- [ ] Error responses use PT-BR messages

### For auth/session

- [ ] Login button redirects to Google OAuth
- [ ] After the OAuth callback, the user has a valid session
- [ ] Protected routes redirect to `/login` without a session
- [ ] `/login` redirects to the app when already authenticated

## Custom Playwright scripts

For complex multi-step flows (multi-page assertions, form submit → verify result → navigate elsewhere), write a custom Playwright script:

```bash
# Run from project root (has access to node_modules/@playwright/test)
node scripts/test-my-flow.mjs
```

### Template

```javascript
// scripts/test-example-flow.mjs
import { chromium } from '@playwright/test';
import { readFileSync } from 'fs';

const STATE_FILE = '.auth-state.json';
const storageState = JSON.parse(readFileSync(STATE_FILE, 'utf-8'));

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ storageState });
const page = await context.newPage();

const errors = [];
page.on('pageerror', err => errors.push(err.message));

await page.goto('http://localhost:3000/settings');
await page.waitForLoadState('networkidle');

const bodyText = await page.textContent('body');
if (bodyText.includes('Configurações')) {
  console.log('✓ Settings placeholder renders');
} else {
  console.error('✗ Expected "Configurações" heading, got:', bodyText?.slice(0, 200));
  process.exitCode = 1;
}

if (errors.length > 0) {
  console.error('Page errors:', errors);
  process.exitCode = 1;
}

await browser.close();
```

### Running Playwright scripts

Playwright is a dev dependency (`@playwright/test`). Scripts run from the project root so they resolve the package correctly:

```bash
node scripts/test-my-flow.mjs
npx playwright install chromium   # run once, ensures chromium is available
```

The `.auth-state.json` file works with Playwright's `browser.newContext({ storageState })`.

## Dev session endpoint

`GET /api/auth/dev-session` — DEV ONLY (disabled in production).

- Reads an existing user from `auth.db`
- Refreshes the Google access token using the stored refresh token
- Returns a 302 redirect with a properly signed session cookie
- Query param `?redirect=/path` controls where to redirect after

Used by:

- `scripts/dev-auth-state.mjs` (generates `.auth-state.json`)
- Direct browser navigation for quick manual testing
