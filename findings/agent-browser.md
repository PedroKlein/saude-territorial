# Agent Browser — Findings & Patterns

## Session Management (Critical)

**Sessions get lost between individual tool calls.** The browser context resets to
`about:blank` between separate `agent_browser` invocations.

**ALWAYS use batch mode** for multi-step interactions:

```jsonc
// ✅ Single batch call — session persists across steps
{ "args": ["batch"], "stdin": "[[\"open\",\"url\"],[\"wait\",\"2000\"],[\"snapshot\",\"-i\"]]" }

// ❌ Separate calls — second call will see about:blank
{ "args": ["open", "url"] }
{ "args": ["snapshot", "-i"] }  // LOST
```

## Authenticated Testing

Use `--state .auth-state.json` with `sessionMode: "fresh"`:

```jsonc
{
  "args": ["--state", ".auth-state.json", "batch"],
  "sessionMode": "fresh",
  "stdin": "[[\"open\", \"http://localhost:3000/settings\"], [\"wait\", \"2000\"], [\"snapshot\", \"-i\"]]"
}
```

Generate the state file: `mise run dev:auth` (or `node scripts/dev-auth-state.mjs`)

## Cookies Don't Persist from fetch()

Browser security prevents `fetch()` response `Set-Cookie` headers from being saved
to the cookie jar. This means:

```javascript
// ❌ This WON'T set cookies in the browser
eval("fetch('/api/auth/dev-session').then(r => r.text())")
// Cookie header is ignored by the browser's cookie store
```

The only solutions:
1. **Page navigation** to the URL (but this changes the current page)
2. **--state file** loaded at browser launch (the approach we use)

## Click Testing

For buttons that cause navigation (like OAuth redirect):

```jsonc
{
  "args": ["batch"],
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

Using `eval` with `document.querySelector` is more reliable than `click @ref`
for buttons that trigger navigation (refs go stale during redirect).

## Screenshots

```jsonc
{ "args": ["--state", ".auth-state.json", "batch"], "sessionMode": "fresh",
  "stdin": "[[\"open\",\"http://localhost:3000/settings\"],[\"wait\",\"2000\"],[\"screenshot\",\"/tmp/page.png\"]]" }
```

Screenshots are saved to the specified path and returned as inline images.

## When agent_browser Isn't Enough

For complex multi-step flows with assertions, write a Playwright script:

```bash
node scripts/test-my-flow.mjs
```

See `TESTING.md` for the template. Both agent_browser and Playwright scripts
use the same `.auth-state.json` format for authentication.

## Common Failures

| Symptom | Cause | Fix |
|---------|-------|-----|
| `about:blank` after open | Session lost between calls | Use batch mode |
| `net::ERR_CONNECTION_REFUSED` | Dev server not running | Start with `mise run dev` |
| `Element not found` after click | Page navigated, refs stale | Use eval + querySelector |
| Cookie not working after fetch | Browser security | Use --state file instead |
| `Chrome profile not found` | Invalid --profile name | Use `--state` instead of profiles |
