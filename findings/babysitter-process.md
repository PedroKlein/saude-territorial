# Babysitter Process — Findings & Best Practices

## Verification Gates Must Go Beyond Tests

A babysitter process phase is NOT complete with just `tsc + vitest`. Required gates:

1. **`npx tsc --noEmit`** — Type safety
2. **`npx vitest run`** — Logic correctness
3. **Visual check (agent_browser)** — Page renders correctly, is styled, is interactive
4. **API route check** — Returns 200/401, not 500
5. **Route protection** — Unauthenticated → redirect to /login
6. **Authenticated flow** — With `--state .auth-state.json`, features work end-to-end

## Browser Validation Task Pattern

After each implementation phase, add a browser validation step:

```javascript
await ctx.task(browserValidationTask, {
  projectDir,
  phase: 'settings',
  checks: [
    'Open /settings and verify form renders with proper styling',
    'Verify input field and save button exist',
    'Verify page is protected (unauthenticated → /login)',
  ],
});
```

The orchestrator executes these by:
1. Ensuring dev server is running
2. Running `node scripts/dev-auth-state.mjs` for auth
3. Using `agent_browser --state .auth-state.json batch` for UI checks
4. Using `curl` for API checks

## Common Issues in Process Execution

### Git Commits
- `git commit` may be blocked by user guardrails. Check `/Users/i572543/.pi/agent/extensions/guardrails.json`
- `git push` should ALWAYS remain blocked

### Subagent Model Override
- Specifying `model: "anthropic/claude-sonnet-4"` requires an Anthropic API key
- If no key is configured, omit the model override (uses default)

### Shell Tasks vs Agent Tasks
- Use shell for: tsc, vitest, git, curl, pnpm install
- Use agent for: code writing, code review, complex reasoning
- The orchestrator executes shell tasks directly via bash
- Agent tasks are delegated to subagents (worker)

### Process File Changes Mid-Run
- You CAN modify the process file during a run
- The babysitter SDK picks up changes for future iterations
- Document why in a commit message

## Dev Server Management

- Kill stale servers: `pkill -f "next dev"`
- Clean Next.js lock: `rm -rf .next/dev`
- Check port: `lsof -i :3000 | grep LISTEN`
- Start fresh: `mise run dev`

## Auth State Refresh

The `.auth-state.json` expires after 7 days. The Google access token inside
expires after 1 hour but is auto-refreshed by `scripts/dev-auth-state.mjs`.

If authenticated tests start failing with 401:
```bash
mise run dev:auth  # Re-generates .auth-state.json with fresh tokens
```

## Process Output: What "Done" Means

A phase is done when:
- Tests pass (all of them, not just the new ones)
- TypeScript compiles
- The UI renders correctly in a real browser (verified via screenshot)
- Protected routes redirect unauthenticated users
- API routes respond correctly with auth
- Code is committed with a conventional commit message
