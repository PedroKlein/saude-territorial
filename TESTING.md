# Testing & Verification Guide

This document describes how to verify that features actually work — not just that tests pass.

## Philosophy

**Tests passing ≠ feature working.** Unit tests verify logic in isolation. Browser validation
verifies the assembled app works for a real user. Both are required before considering a phase complete.

## Verification Layers

| Layer | What it catches | Tool |
|-------|----------------|------|
| `npx tsc --noEmit` | Type errors, missing imports | CLI |
| `npx vitest run` | Logic bugs, contract violations | CLI |
| `agent_browser` visual check | Unstyled pages, hydration errors, missing "use client" | Browser |
| `agent_browser` interaction | Broken buttons, failed navigations, OAuth flow | Browser |
| `curl` / `agent_browser` API check | 500 errors, missing routes, auth rejection | HTTP |
| Route protection check | Unauthenticated access to protected pages | Browser |

## Setup

### Prerequisites

```bash
mise run dev        # Start the dev server (port 3000)
mise run dev:auth   # Generate .auth-state.json (requires login once manually first)
```

### First-time setup (one-time only)

1. Log in manually at http://localhost:3000/login (Google OAuth)
2. Run `mise run dev:auth` — this refreshes the Google token and creates `.auth-state.json`
3. The auth state is valid for 7 days. Re-run `mise run dev:auth` when it expires.

If `mise run dev:auth` fails with "No Google account found", you need to log in manually first.

## agent_browser Patterns

### Key Rule: Always Use Batch Mode

agent_browser sessions get lost between individual tool calls. **Always use batch mode**
for multi-step interactions:

```jsonc
// CORRECT: single batch call
{
  "args": ["--state", ".auth-state.json", "batch"],
  "sessionMode": "fresh",
  "stdin": "[
    [\"open\", \"http://localhost:3000/settings\"],
    [\"wait\", \"2000\"],
    [\"snapshot\", \"-i\"]
  ]"
}

// WRONG: separate calls (session will be lost between them)
{ "args": ["open", "http://localhost:3000/settings"] }
{ "args": ["snapshot", "-i"] }  // ← will show about:blank
```

### Authenticated Browsing

Use `--state .auth-state.json` with `sessionMode: "fresh"` to browse as the authenticated user:

```jsonc
{
  "args": ["--state", ".auth-state.json", "batch"],
  "sessionMode": "fresh",
  "stdin": "[[\"open\", \"http://localhost:3000/settings\"], [\"wait\", \"2000\"], [\"snapshot\", \"-i\"]]"
}
```

### Unauthenticated Checks (no --state)

For verifying route protection redirects:

```jsonc
{
  "args": ["batch"],
  "sessionMode": "fresh",
  "stdin": "[[\"open\", \"http://localhost:3000/settings\"], [\"wait\", \"2000\"], [\"get\", \"url\"]]"
}
// Expected: URL should be http://localhost:3000/login (redirected by proxy.ts)
```

### API Route Validation

Use `agent_browser` to check API routes return correct status codes:

```jsonc
// Authenticated API check
{
  "args": ["--state", ".auth-state.json", "batch"],
  "sessionMode": "fresh",
  "stdin": "[[\"open\", \"http://localhost:3000/api/sheets?spreadsheetId=ID\"], [\"wait\", \"3000\"], [\"get\", \"text\", \"body\"]]"
}

// Unauthenticated API check (should get 401, not 500)
{
  "args": ["batch"],
  "sessionMode": "fresh",  
  "stdin": "[[\"open\", \"http://localhost:3000/api/sheets?spreadsheetId=ID\"], [\"wait\", \"2000\"], [\"get\", \"text\", \"body\"]]"
}
```

### Button Click Testing

```jsonc
{
  "args": ["--state", ".auth-state.json", "batch"],
  "sessionMode": "fresh",
  "stdin": "[
    [\"open\", \"http://localhost:3000/login\"],
    [\"wait\", \"2000\"],
    [\"eval\", \"document.querySelector('button')?.click(); 'clicked'\"],
    [\"wait\", \"3000\"],
    [\"get\", \"url\"]
  ]"
}
```

### Screenshots for Visual Verification

```jsonc
{
  "args": ["--state", ".auth-state.json", "batch"],
  "sessionMode": "fresh",
  "stdin": "[[\"open\", \"http://localhost:3000/settings\"], [\"wait\", \"2000\"], [\"screenshot\", \"/tmp/settings.png\"]]"
}
```

## curl Patterns

For API-only checks without browser overhead:

```bash
# Get auth cookie
COOKIE=$(curl -s -D - http://localhost:3000/api/auth/dev-session 2>/dev/null \
  | grep "set-cookie.*session_token" \
  | sed 's/.*session_token=\([^;]*\).*/\1/')

# Authenticated API call  
curl -s -H "Cookie: better-auth.session_token=$(python3 -c "import urllib.parse; print(urllib.parse.unquote('$COOKIE'))")" \
  "http://localhost:3000/api/sheets?spreadsheetId=YOUR_ID"

# Unauthenticated check (expect 401)
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/sheets
```

## Verification Checklist per Phase

After implementing a feature, verify ALL of these before committing:

### For UI Pages

- [ ] `npx tsc --noEmit` — no type errors
- [ ] `npx vitest run` — all tests pass
- [ ] Page renders (agent_browser snapshot shows expected elements)
- [ ] Page is styled (not raw unstyled HTML)
- [ ] Buttons have cursor-pointer and hover states
- [ ] All text is in PT-BR
- [ ] Page is protected (unauthenticated → redirects to /login)

### For API Routes

- [ ] `npx tsc --noEmit` — no type errors
- [ ] `npx vitest run` — all tests pass  
- [ ] Returns 401 without auth (not 500)
- [ ] Returns expected data with auth (use curl or agent_browser with --state)
- [ ] Error responses use PT-BR messages

### For Auth/Session

- [ ] Login button redirects to Google OAuth
- [ ] After OAuth callback, user has a valid session
- [ ] Protected routes redirect to /login without session
- [ ] `/login` redirects to app when already authenticated

## Common Gotchas

| Issue | Cause | Fix |
|-------|-------|-----|
| Page shows "This page couldn't load" | Server Component passing event handler to Client Component | Add `"use client"` to the page |
| Button click does nothing | Better Auth needs database tables | Run `echo 'y' \| npx auth migrate` |
| 500 on API route | googleapis needs real OAuth2Client | Use `new google.auth.OAuth2()` not plain object |
| 500 "no such table: verification" | Auth DB not migrated | `echo 'y' \| npx auth migrate` |
| Cookie not working | Better Auth signs cookies with HMAC | Use dev-session endpoint for signed cookies |
| proxy.ts not working | Wrong file location | Must be at `src/proxy.ts`, not `src/app/proxy.ts` |
| "API not enabled" from Google | Sheets API disabled in Cloud project | Enable at console.cloud.google.com |
| `auth.db` not found | Dev server started from wrong directory | Always start from project root |

## Custom Playwright Scripts

For complex multi-step flows that go beyond what `agent_browser` batch can do
(multi-page assertions, form submit → verify result → navigate elsewhere),
write a custom Playwright script:

```bash
# Run from project root (has access to node_modules/@playwright/test)
node scripts/test-my-flow.mjs
```

### Template

```javascript
// scripts/test-example-flow.mjs
import { chromium } from '@playwright/test';
import { readFileSync } from 'fs';

// Load auth state (same file agent_browser uses)
const STATE_FILE = '.auth-state.json';
const storageState = JSON.parse(readFileSync(STATE_FILE, 'utf-8'));

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ storageState });
const page = await context.newPage();

// Collect console errors
const errors = [];
page.on('pageerror', err => errors.push(err.message));

// --- Your test flow ---
await page.goto('http://localhost:3000/settings');
await page.waitForLoadState('networkidle');

// Fill the form
await page.fill('input[type="text"]', 'https://docs.google.com/spreadsheets/d/1Ub7kagnXCfE62oVNWSz0/edit');
await page.click('button:has-text("Salvar")');

// Wait and verify
await page.waitForTimeout(1000);
const successMsg = await page.textContent('body');

if (successMsg.includes('sucesso')) {
  console.log('✓ Settings form works end-to-end');
} else {
  console.error('✗ Expected success message, got:', successMsg);
  process.exitCode = 1;
}

// --- Cleanup ---
if (errors.length > 0) {
  console.error('Page errors:', errors);
  process.exitCode = 1;
}

await browser.close();
```

### When to use Playwright scripts vs agent_browser

| Scenario | Use |
|----------|-----|
| Quick visual check (page renders, elements exist) | `agent_browser` batch |
| Single click → verify redirect | `agent_browser` batch |
| Screenshot for review | `agent_browser` batch |
| Multi-step form: fill → submit → verify → navigate → verify side effect | Playwright script |
| Assertions with conditional logic | Playwright script |
| Testing flows across multiple pages with state | Playwright script |
| Generating test reports | Playwright script |
| Waiting for specific network requests | Playwright script |

### Running Playwright scripts

Playwright is installed as a dev dependency (`@playwright/test`). Scripts run from
the project root so they resolve the package correctly:

```bash
# One-off script
node scripts/test-my-flow.mjs

# Ensure chromium is available (run once)
npx playwright install chromium
```

The `.auth-state.json` file works with both `agent_browser --state` and
Playwright's `browser.newContext({ storageState })` — same format.

## Dev Session Endpoint

`GET /api/auth/dev-session` — DEV ONLY (disabled in production)

- Reads existing user from `auth.db`
- Refreshes Google access token using stored refresh token
- Returns a 302 redirect with properly signed session cookie
- Query param `?redirect=/path` controls where to redirect after

Used by:
- `scripts/dev-auth-state.mjs` (generates .auth-state.json for agent_browser)
- Direct browser navigation for quick manual testing
