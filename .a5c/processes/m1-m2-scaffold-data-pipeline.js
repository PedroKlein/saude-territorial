/**
 * @process saude-territorial/m1-m2-scaffold-data-pipeline
 * @description Scaffold a Next.js 16 health monitoring app with Google OAuth (Better Auth),
 * Supabase cache layer, Google Sheets API integration, and Nominatim geocoding pipeline.
 * Greenfield project — from zero to "data pipeline reads real spreadsheet and caches geocoded coords."
 *
 * Strict TDD: each phase writes tests first, then implements until tests pass.
 * Verification gates: tsc + ESLint + Vitest + next build + agent_browser UI validation.
 *
 * @inputs { projectDir: string, specPath: string }
 * @outputs { success: boolean, phases: array }
 */

import { defineTask } from '@a5c-ai/babysitter-sdk';

const MODEL = 'anthropic--claude-4.6-opus';
const EXECUTION = { model: MODEL, thinking: 'high' };
const SKILLS_DIR = '/Users/i572543/Dev/github.com/PedroKlein/saude-territorial/main/.agents/skills';

export async function process(inputs, ctx) {
  const {
    projectDir = '/Users/i572543/Dev/github.com/PedroKlein/saude-territorial/main',
    specPath = '/Users/i572543/Dev/github.com/PedroKlein/saude-territorial/main/SPEC.md',
    agentsPath = '/Users/i572543/Dev/github.com/PedroKlein/saude-territorial/main/AGENTS.md',
  } = inputs;

  ctx.log('info', `Starting M1+M2: Scaffold + Data Pipeline`);
  ctx.log('info', `Project dir: ${projectDir}`);

  // ============================================================================
  // RUNTIME SPEC READ (drift defense — spec bytes bypass compose pass)
  // ============================================================================

  const spec = await ctx.task(readFileTask, { filePath: specPath, label: 'SPEC.md' });
  const agents = await ctx.task(readFileTask, { filePath: agentsPath, label: 'AGENTS.md' });

  // ============================================================================
  // PHASE 1: PROJECT SCAFFOLD
  // ============================================================================

  ctx.log('info', 'Phase 1: Project Scaffold — Next.js 16, Tailwind v4, shadcn/ui, TS strict, Vitest');

  const scaffold = await ctx.task(scaffoldProjectTask, {
    projectDir,
    specStdout: spec.stdout,
    agentsStdout: agents.stdout,
  });

  await ctx.task(commitTask, {
    projectDir,
    message: 'chore(m1): initialize project structure and config files',
  });

  // Install dependencies
  await ctx.task(pnpmInstallTask, { projectDir });

  // Verify scaffold compiles
  await ctx.task(verifyTscTask, { projectDir });

  await ctx.task(commitTask, {
    projectDir,
    message: 'chore(m1): add pnpm lockfile',
  });

  // ============================================================================
  // PHASE 2: AUTH (Better Auth + Google OAuth) — TDD
  // ============================================================================

  ctx.log('info', 'Phase 2: Auth — Better Auth with Google OAuth + spreadsheets scope');

  await ctx.task(writeAuthTestsTask, {
    projectDir,
    specStdout: spec.stdout,
  });

  await ctx.task(commitTask, {
    projectDir,
    message: 'test(m1): add Better Auth + Google OAuth test suite',
  });

  await ctx.task(implementAuthTask, {
    projectDir,
    specStdout: spec.stdout,
    agentsStdout: agents.stdout,
  });

  await ctx.task(verifyTestsTask, { projectDir });
  await ctx.task(verifyTscTask, { projectDir });

  await ctx.task(commitTask, {
    projectDir,
    message: 'feat(m1): implement Better Auth with Google OAuth + spreadsheets scope',
  });

  // 🛑 BREAKPOINT: Review auth setup
  await ctx.breakpoint({
    title: 'Phase 2 Complete: Auth Setup',
    question: [
      'Better Auth + Google OAuth implemented with TDD.',
      'Review:',
      '- Login page with Google sign-in',
      '- proxy.ts route protection',
      '- Session with spreadsheets scope access token',
      '- Tests passing',
      '',
      'Proceed to Supabase + Settings + Sheets + Geocoding phases?',
    ].join('\n'),
    breakpointId: 'saude.m1.auth-review',
  });

  // ============================================================================
  // PHASE 3: SUPABASE WIRING — TDD
  // ============================================================================

  ctx.log('info', 'Phase 3: Supabase — client setup, cache tables, RLS policies');

  await ctx.task(writeSupabaseTestsTask, {
    projectDir,
    specStdout: spec.stdout,
  });

  await ctx.task(commitTask, {
    projectDir,
    message: 'test(m1): add Supabase cache layer tests',
  });

  await ctx.task(implementSupabaseTask, {
    projectDir,
    specStdout: spec.stdout,
    agentsStdout: agents.stdout,
  });

  await ctx.task(verifyTestsTask, { projectDir });
  await ctx.task(verifyTscTask, { projectDir });

  await ctx.task(commitTask, {
    projectDir,
    message: 'feat(m1): implement Supabase client, cache schema, and RLS policies',
  });

  // ============================================================================
  // PHASE 4: SETTINGS PAGE — TDD
  // ============================================================================

  ctx.log('info', 'Phase 4: Settings page — paste spreadsheet URL, store config');

  await ctx.task(writeSettingsTestsTask, {
    projectDir,
    specStdout: spec.stdout,
  });

  await ctx.task(commitTask, {
    projectDir,
    message: 'test(m1): add settings page and URL parser tests',
  });

  await ctx.task(implementSettingsTask, {
    projectDir,
    specStdout: spec.stdout,
    agentsStdout: agents.stdout,
  });

  await ctx.task(verifyTestsTask, { projectDir });
  await ctx.task(verifyTscTask, { projectDir });

  await ctx.task(commitTask, {
    projectDir,
    message: 'feat(m1): implement settings page with spreadsheet URL configuration',
  });

  // Browser validation: verify settings page renders and form works
  await ctx.task(browserValidationTask, {
    projectDir,
    phase: 'settings',
    checks: [
      'Open http://localhost:3000/settings (or /dashboard/settings) and verify the spreadsheet URL form renders',
      'Verify there is an input field for pasting a Google Sheets URL',
      'Verify there is a save/submit button with PT-BR text',
      'Verify the page title or heading references settings/configurações',
    ],
  });

  // ============================================================================
  // PHASE 5: GOOGLE SHEETS DATA LAYER — TDD
  // ============================================================================

  ctx.log('info', 'Phase 5: Google Sheets API — read tabs, parse headers, column mapping');

  await ctx.task(writeSheetsTestsTask, {
    projectDir,
    specStdout: spec.stdout,
  });

  await ctx.task(commitTask, {
    projectDir,
    message: 'test(m2): add Google Sheets parser, discovery, and sync tests',
  });

  await ctx.task(implementSheetsTask, {
    projectDir,
    specStdout: spec.stdout,
    agentsStdout: agents.stdout,
  });

  await ctx.task(verifyTestsTask, { projectDir });
  await ctx.task(verifyTscTask, { projectDir });

  await ctx.task(commitTask, {
    projectDir,
    message: 'feat(m2): implement Google Sheets data layer with auto-discovery and column mapping',
  });

  // Browser validation: verify sheets API route responds
  await ctx.task(browserValidationTask, {
    projectDir,
    phase: 'sheets',
    checks: [
      'Verify GET /api/sheets returns a response (200 or 401, not 500)',
      'Verify the sheets API route exists and is reachable',
    ],
  });

  // ============================================================================
  // PHASE 6: GEOCODING SERVICE — TDD
  // ============================================================================

  ctx.log('info', 'Phase 6: Geocoding — Nominatim, rate limiting, address normalization, cache');

  await ctx.task(writeGeocodingTestsTask, {
    projectDir,
    specStdout: spec.stdout,
  });

  await ctx.task(commitTask, {
    projectDir,
    message: 'test(m2): add geocoding normalizer, cache, and batch tests',
  });

  await ctx.task(implementGeocodingTask, {
    projectDir,
    specStdout: spec.stdout,
    agentsStdout: agents.stdout,
  });

  await ctx.task(verifyTestsTask, { projectDir });
  await ctx.task(verifyTscTask, { projectDir });

  await ctx.task(commitTask, {
    projectDir,
    message: 'feat(m2): implement Nominatim geocoding with rate limiting and Supabase cache',
  });

  // Browser validation: verify geocode API route responds
  await ctx.task(browserValidationTask, {
    projectDir,
    phase: 'geocoding',
    checks: [
      'Verify POST /api/geocode returns a response (200 or 401, not 500)',
      'Verify the geocode API route exists and is reachable',
    ],
  });

  // ============================================================================
  // PHASE 7: INTEGRATION VERIFICATION
  // ============================================================================

  ctx.log('info', 'Phase 7: Final integration — tsc + eslint + vitest + next build');

  await ctx.task(verifyFullIntegrationTask, { projectDir });

  // 🛑 BREAKPOINT: Final review
  await ctx.breakpoint({
    title: 'M1+M2 Complete: Scaffold + Data Pipeline',
    question: [
      'All phases complete. The app now has:',
      '- Next.js 16 + Tailwind v4 + shadcn/ui scaffold',
      '- Google OAuth (Better Auth) with spreadsheets scope',
      '- Supabase cache layer (coordinates, sync metadata, preferences)',
      '- Settings page to configure spreadsheet URL',
      '- Google Sheets API layer (auto-discover tabs, parse PT headers, rate limit)',
      '- Nominatim geocoding (1 req/s, address normalization, Supabase cache)',
      '- All tests passing, TypeScript compiles, Next.js builds',
      '',
      'Run complete?',
    ].join('\n'),
    breakpointId: 'saude.m2.final-review',
  });

  ctx.log('info', 'M1+M2 process complete!');

  return {
    success: true,
    phases: ['scaffold', 'auth', 'supabase', 'settings', 'sheets', 'geocoding', 'integration'],
  };
}

// ============================================================================
// SHARED TASKS
// ============================================================================

const readFileTask = defineTask('read-file', (args, taskCtx) => ({
  kind: 'shell',
  title: `Read ${args.label} at runtime (drift defense)`,
  shell: {
    command: `cat "${args.filePath}"`,
    expectedExitCode: 0,
    timeout: 5000,
  },
  io: {
    inputJsonPath: `tasks/${taskCtx.effectId}/inputs.json`,
    outputJsonPath: `tasks/${taskCtx.effectId}/output.json`,
  },
}));

const pnpmInstallTask = defineTask('pnpm-install', (args, taskCtx) => ({
  kind: 'shell',
  title: 'Install dependencies with pnpm',
  shell: {
    command: `cd "${args.projectDir}" && pnpm install`,
    expectedExitCode: 0,
    timeout: 120000,
  },
  io: {
    inputJsonPath: `tasks/${taskCtx.effectId}/inputs.json`,
    outputJsonPath: `tasks/${taskCtx.effectId}/output.json`,
  },
}));

const verifyTscTask = defineTask('verify-tsc', (args, taskCtx) => ({
  kind: 'shell',
  title: 'TypeScript compilation check',
  shell: {
    command: `cd "${args.projectDir}" && npx tsc --noEmit`,
    expectedExitCode: 0,
    timeout: 120000,
  },
  io: {
    inputJsonPath: `tasks/${taskCtx.effectId}/inputs.json`,
    outputJsonPath: `tasks/${taskCtx.effectId}/output.json`,
  },
}));

const verifyTestsTask = defineTask('verify-tests', (args, taskCtx) => ({
  kind: 'shell',
  title: 'Run Vitest test suite',
  shell: {
    command: `cd "${args.projectDir}" && npx vitest run --reporter=verbose`,
    expectedExitCode: 0,
    timeout: 180000,
  },
  io: {
    inputJsonPath: `tasks/${taskCtx.effectId}/inputs.json`,
    outputJsonPath: `tasks/${taskCtx.effectId}/output.json`,
  },
}));

const verifyFullIntegrationTask = defineTask('verify-full-integration', (args, taskCtx) => ({
  kind: 'shell',
  title: 'Full integration gate: tsc + eslint + vitest + next build',
  shell: {
    command: [
      `cd "${args.projectDir}"`,
      'npx tsc --noEmit',
      'npx eslint src/ --max-warnings=0',
      'npx vitest run',
      'npx next build',
    ].join(' && '),
    expectedExitCode: 0,
    timeout: 300000,
  },
  io: {
    inputJsonPath: `tasks/${taskCtx.effectId}/inputs.json`,
    outputJsonPath: `tasks/${taskCtx.effectId}/output.json`,
  },
}));

const commitTask = defineTask('git-commit', (args, taskCtx) => ({
  kind: 'shell',
  title: `Git commit: ${args.message}`,
  shell: {
    command: `cd "${args.projectDir}" && git add -A && git commit -m "${args.message}"`,
    expectedExitCode: 0,
    timeout: 30000,
  },
  io: {
    inputJsonPath: `tasks/${taskCtx.effectId}/inputs.json`,
    outputJsonPath: `tasks/${taskCtx.effectId}/output.json`,
  },
}));

// ============================================================================
// BROWSER VALIDATION TASK
// Runs the dev server, uses agent_browser to verify UI/API routes work at runtime.
// The orchestrating agent executes this by:
// 1. Starting the dev server (if not running)
// 2. Using agent_browser batch commands to verify the checks
// 3. Reporting pass/fail
// ============================================================================

const browserValidationTask = defineTask('browser-validation', (args, taskCtx) => ({
  kind: 'agent',
  title: `Browser validation: ${args.phase} phase`,
  execution: EXECUTION,
  agent: {
    name: 'general-purpose',
    prompt: {
      role: 'QA engineer validating the app works in a real browser',
      task: `Validate the ${args.phase} phase implementation works at runtime using the browser and HTTP requests.`,
      context: {
        projectDir: args.projectDir,
        phase: args.phase,
        checks: args.checks,
      },
      instructions: [
        '## Browser Validation Instructions',
        '',
        'You have access to agent_browser (for UI interaction) and bash (for curl/HTTP checks).',
        '',
        '## Steps:',
        '1. Ensure the dev server is running: `cd ' + args.projectDir + ' && npx next dev --turbopack -p 3000 &` (check with curl first)',
        '2. Wait for the server to be ready (curl http://localhost:3000 returns 200)',
        '3. For each check below, verify it passes:',
        '',
        '## Checks to verify:',
        ...args.checks.map((c, i) => `${i + 1}. ${c}`),
        '',
        '## How to use agent_browser:',
        '- Use batch mode with stdin for multi-step interactions:',
        '  agent_browser args=["batch"] stdin=\'[["open", "http://localhost:3000/path"], ["wait", "2000"], ["snapshot", "-i"]]\'',
        '- For API route checks, prefer curl:',
        '  curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/route',
        '',
        '## Output:',
        'Report which checks passed and which failed. If any check fails, explain what went wrong.',
        'Return JSON: { "success": boolean, "phase": string, "results": [{"check": string, "passed": boolean, "detail": string}] }',
      ],
      outputFormat: 'JSON: { success: boolean, phase: string, results: array }',
    },
    outputSchema: {
      type: 'object',
      required: ['success', 'phase', 'results'],
      properties: {
        success: { type: 'boolean' },
        phase: { type: 'string' },
        results: { type: 'array', items: { type: 'object' } },
      },
    },
  },
  io: {
    inputJsonPath: `tasks/${taskCtx.effectId}/inputs.json`,
    outputJsonPath: `tasks/${taskCtx.effectId}/output.json`,
  },
}));

// ============================================================================
// PHASE 1: SCAFFOLD
// ============================================================================

const scaffoldProjectTask = defineTask('scaffold-project', (args, taskCtx) => ({
  kind: 'agent',
  title: 'Create Next.js 16 project scaffold with Tailwind v4, shadcn/ui, TS strict, Vitest',
  execution: EXECUTION,
  agent: {
    name: 'general-purpose',
    prompt: {
      role: 'Senior Next.js 16 engineer setting up a greenfield project',
      task: 'Create the complete project scaffold for a health monitoring app. This is a greenfield repo — no code exists yet.',
      context: {
        projectDir: args.projectDir,
      },
      instructions: [
        '## Reference Skills (read these files for patterns):',
        `- ${SKILLS_DIR}/nextjs-patterns/SKILL.md — Next.js 16 App Router patterns, proxy.ts, "use cache"`,
        `- ${SKILLS_DIR}/tailwind-shadcn/SKILL.md — Tailwind v4 CSS-first @theme, shadcn/ui`,
        `- ${SKILLS_DIR}/typescript-strict/SKILL.md — TypeScript strict patterns, branded types`,
        `- ${SKILLS_DIR}/testing-patterns/SKILL.md — Vitest setup for this project`,
        '',
        '## SPEC (verbatim, do not paraphrase):',
        '---',
        args.specStdout,
        '---',
        '',
        '## AGENTS.md (verbatim):',
        '---',
        args.agentsStdout,
        '---',
        '',
        '## Your Task:',
        'Create all files for the project scaffold. Include:',
        '',
        '1. **package.json** — pnpm project with dependencies:',
        '   - next (latest), react@19, react-dom@19',
        '   - typescript, @types/react, @types/node',
        '   - tailwindcss@4, @tailwindcss/postcss, postcss',
        '   - better-auth',
        '   - @supabase/ssr, @supabase/supabase-js',
        '   - @tanstack/react-query',
        '   - zustand',
        '   - googleapis (for Sheets API)',
        '   - zod (validation)',
        '   - Dev: vitest, @testing-library/react, @vitejs/plugin-react, jsdom, eslint, eslint-config-next, @typescript-eslint/eslint-plugin',
        '   - Scripts: dev, build, start, lint, type-check, test',
        '',
        '2. **tsconfig.json** — strict mode, paths: { "@/*": ["./src/*"] }',
        '',
        '3. **next.config.ts** — minimal, turbopack-compatible',
        '',
        '4. **postcss.config.mjs** — with @tailwindcss/postcss plugin',
        '',
        '5. **vitest.config.ts** — with path aliases, jsdom environment, setup files',
        '',
        '6. **.eslintrc.json** — extends next/core-web-vitals + typescript-eslint strict',
        '',
        '7. **src/app/globals.css** — Tailwind v4 CSS-first:',
        '   ```css',
        '   @import "tailwindcss";',
        '   @theme { --color-primary: ...; --color-urgent-red: ...; --color-alert-yellow: ...; }',
        '   ```',
        '',
        '8. **src/app/layout.tsx** — Root layout with metadata (PT-BR lang, app title)',
        '',
        '9. **src/app/page.tsx** — Simple landing page placeholder',
        '',
        '10. **Directory structure** (create empty index.ts or placeholder files):',
        '    - src/lib/sheets/',
        '    - src/lib/geocoding/',
        '    - src/lib/alerts/',
        '    - src/lib/supabase/',
        '    - src/lib/routing/',
        '    - src/components/ui/',
        '    - src/components/auth/',
        '    - src/components/map/',
        '    - src/components/panels/',
        '    - src/components/sidebar/',
        '    - src/stores/',
        '    - src/types/',
        '    - src/hooks/',
        '    - src/config/',
        '',
        '11. **.env.local.example** — all required env vars (see SPEC)',
        '',
        '12. **.gitignore** — Next.js standard + .env.local + node_modules',
        '',
        'IMPORTANT:',
        '- Do NOT include tailwind.config.js/ts — Tailwind v4 uses CSS-first @theme.',
        '- Do NOT run pnpm install (will be done separately).',
        '- TypeScript strict: no any, no implicit returns.',
        '- All user-facing text in Brazilian Portuguese.',
      ],
      outputFormat: 'JSON: { success: boolean, filesCreated: string[] }',
    },
    outputSchema: {
      type: 'object',
      required: ['success', 'filesCreated'],
      properties: {
        success: { type: 'boolean' },
        filesCreated: { type: 'array', items: { type: 'string' } },
      },
    },
  },
  io: {
    inputJsonPath: `tasks/${taskCtx.effectId}/inputs.json`,
    outputJsonPath: `tasks/${taskCtx.effectId}/output.json`,
  },
}));

// ============================================================================
// PHASE 2: AUTH — TEST FIRST
// ============================================================================

const writeAuthTestsTask = defineTask('write-auth-tests', (args, taskCtx) => ({
  kind: 'agent',
  title: 'Write auth tests FIRST (TDD: red phase)',
  execution: EXECUTION,
  agent: {
    name: 'general-purpose',
    prompt: {
      role: 'Test engineer writing tests from specification (TDD red phase)',
      task: 'Write tests for the auth system BEFORE implementation exists. Tests should fail initially.',
      context: {
        projectDir: args.projectDir,
      },
      instructions: [
        '## Reference Skills (read these files):',
        `- ${SKILLS_DIR}/auth-betterauth/SKILL.md — Better Auth patterns for this project`,
        `- ${SKILLS_DIR}/testing-patterns/SKILL.md — Vitest setup and mocking patterns`,
        `- ${SKILLS_DIR}/lgpd-guard/SKILL.md — Never log tokens or auth data`,
        '',
        '## SPEC (verbatim):',
        '---',
        args.specStdout,
        '---',
        '',
        '## TDD Rules:',
        '- Write tests ONLY from the spec above. Do NOT read or create implementation files.',
        '- Tests should define the expected behavior/contract.',
        '- Tests will fail (red) until implementation is written.',
        '',
        '## Test Files to Create:',
        '',
        '1. **src/lib/auth.test.ts** — Auth server config tests:',
        '   - Auth config includes Google provider',
        '   - Scopes include spreadsheets',
        '   - Session contains access token',
        '',
        '2. **src/app/api/auth/[...all]/route.test.ts** — Route handler tests:',
        '   - Exports GET and POST handlers',
        '   - Responds to auth endpoints',
        '',
        '3. **src/components/auth/SignInButton.test.tsx** — Component tests:',
        '   - Renders sign-in button with PT-BR text',
        '   - Calls signIn on click',
        '',
        'Use vi.mock() to mock better-auth imports.',
        'Use @testing-library/react for component tests.',
        'Place test files colocated next to source (*.test.ts).',
      ],
      outputFormat: 'JSON: { success: boolean, testFiles: string[] }',
    },
    outputSchema: {
      type: 'object',
      required: ['success', 'testFiles'],
      properties: {
        success: { type: 'boolean' },
        testFiles: { type: 'array', items: { type: 'string' } },
      },
    },
  },
  io: {
    inputJsonPath: `tasks/${taskCtx.effectId}/inputs.json`,
    outputJsonPath: `tasks/${taskCtx.effectId}/output.json`,
  },
}));

const implementAuthTask = defineTask('implement-auth', (args, taskCtx) => ({
  kind: 'agent',
  title: 'Implement Better Auth + Google OAuth (TDD: green phase)',
  execution: EXECUTION,
  agent: {
    name: 'general-purpose',
    prompt: {
      role: 'Senior fullstack engineer implementing auth to make tests pass (TDD green phase)',
      task: 'Implement Better Auth with Google OAuth. Make all existing auth tests pass.',
      context: {
        projectDir: args.projectDir,
      },
      instructions: [
        '## Reference Skills (read these files):',
        `- ${SKILLS_DIR}/auth-betterauth/SKILL.md — Better Auth integration patterns`,
        `- ${SKILLS_DIR}/nextjs-patterns/SKILL.md — Next.js 16 patterns, proxy.ts`,
        `- ${SKILLS_DIR}/lgpd-guard/SKILL.md — Never log tokens, sanitize errors`,
        `- ${SKILLS_DIR}/ptbr-conventions/SKILL.md — PT-BR user-facing text`,
        `- ${SKILLS_DIR}/error-handling/SKILL.md — Error chain patterns`,
        '',
        '## SPEC (verbatim):',
        '---',
        args.specStdout,
        '---',
        '',
        '## AGENTS.md (verbatim):',
        '---',
        args.agentsStdout,
        '---',
        '',
        '## TDD Green Phase Rules:',
        '- Read existing test files FIRST to understand the expected behavior.',
        '- Implement the minimum code to make all tests pass.',
        '- Read existing project files to build on what exists.',
        '',
        '## Implementation Files:',
        '',
        '1. **src/lib/auth.ts** — Better Auth server config:',
        '   - Google provider with scopes: openid, email, profile, spreadsheets',
        '   - Access token storage in session for Sheets API calls',
        '   - Session management',
        '',
        '2. **src/lib/auth-client.ts** — Better Auth client for React',
        '',
        '3. **src/app/api/auth/[...all]/route.ts** — Better Auth route handler',
        '',
        '4. **src/app/(auth)/login/page.tsx** — Login page:',
        '   - "Entrar com Google" button',
        '   - App description in PT-BR',
        '   - Clean design using shadcn/ui components',
        '',
        '5. **src/app/proxy.ts** — Route protection:',
        '   - Check session for routes under (dashboard)/',
        '   - Redirect to /login if unauthenticated',
        '',
        '6. **src/components/auth/SignInButton.tsx** — Google sign-in button',
        '7. **src/components/auth/UserMenu.tsx** — User avatar + sign-out dropdown',
        '8. **src/types/auth.ts** — Session, User types',
        '',
        'IMPORTANT:',
        '- NEVER log access tokens or user data',
        '- All user-facing text in PT-BR',
        '- Use the exact Better Auth API patterns from the skill file',
      ],
      outputFormat: 'JSON: { success: boolean, filesCreated: string[], filesModified: string[] }',
    },
    outputSchema: {
      type: 'object',
      required: ['success'],
      properties: {
        success: { type: 'boolean' },
        filesCreated: { type: 'array', items: { type: 'string' } },
        filesModified: { type: 'array', items: { type: 'string' } },
      },
    },
  },
  io: {
    inputJsonPath: `tasks/${taskCtx.effectId}/inputs.json`,
    outputJsonPath: `tasks/${taskCtx.effectId}/output.json`,
  },
}));

// ============================================================================
// PHASE 3: SUPABASE — TEST FIRST
// ============================================================================

const writeSupabaseTestsTask = defineTask('write-supabase-tests', (args, taskCtx) => ({
  kind: 'agent',
  title: 'Write Supabase layer tests (TDD: red phase)',
  execution: EXECUTION,
  agent: {
    name: 'general-purpose',
    prompt: {
      role: 'Test engineer writing Supabase cache layer tests (TDD red phase)',
      task: 'Write tests for the Supabase cache layer BEFORE implementation. Tests define the contract.',
      context: {
        projectDir: args.projectDir,
      },
      instructions: [
        '## Reference Skills (read these files):',
        `- ${SKILLS_DIR}/supabase-patterns/SKILL.md — Supabase integration patterns`,
        `- ${SKILLS_DIR}/testing-patterns/SKILL.md — Vitest mocking patterns`,
        `- ${SKILLS_DIR}/lgpd-guard/SKILL.md — No patient data in Supabase`,
        '',
        '## SPEC (verbatim):',
        '---',
        args.specStdout,
        '---',
        '',
        '## TDD Rules: Write tests ONLY from spec. Do NOT create implementation.',
        '',
        '## Test Files to Create:',
        '',
        '1. **src/lib/supabase/client.test.ts**:',
        '   - createBrowserClient returns a valid client',
        '   - Uses correct env vars',
        '',
        '2. **src/lib/supabase/server.test.ts**:',
        '   - createServerClient works with cookie adapter',
        '',
        'Mock @supabase/ssr and @supabase/supabase-js.',
        'Tests colocated next to source files.',
      ],
      outputFormat: 'JSON: { success: boolean, testFiles: string[] }',
    },
    outputSchema: {
      type: 'object',
      required: ['success', 'testFiles'],
      properties: {
        success: { type: 'boolean' },
        testFiles: { type: 'array', items: { type: 'string' } },
      },
    },
  },
  io: {
    inputJsonPath: `tasks/${taskCtx.effectId}/inputs.json`,
    outputJsonPath: `tasks/${taskCtx.effectId}/output.json`,
  },
}));

const implementSupabaseTask = defineTask('implement-supabase', (args, taskCtx) => ({
  kind: 'agent',
  title: 'Implement Supabase client + cache tables + RLS (TDD: green phase)',
  execution: EXECUTION,
  agent: {
    name: 'general-purpose',
    prompt: {
      role: 'Senior backend engineer implementing Supabase cache layer (TDD green phase)',
      task: 'Implement Supabase client and schema. Make existing tests pass.',
      context: {
        projectDir: args.projectDir,
      },
      instructions: [
        '## Reference Skills (read these files):',
        `- ${SKILLS_DIR}/supabase-patterns/SKILL.md — @supabase/ssr client patterns`,
        `- ${SKILLS_DIR}/lgpd-guard/SKILL.md — No patient PII in Supabase`,
        `- ${SKILLS_DIR}/typescript-strict/SKILL.md — Type patterns`,
        '',
        '## SPEC (verbatim):',
        '---',
        args.specStdout,
        '---',
        '',
        '## AGENTS.md (verbatim):',
        '---',
        args.agentsStdout,
        '---',
        '',
        '## Read existing test files and project structure first.',
        '',
        '## Implementation:',
        '',
        '1. **src/lib/supabase/client.ts** — Browser client (createBrowserClient)',
        '2. **src/lib/supabase/server.ts** — Server client (createServerClient + cookies)',
        '3. **src/lib/supabase/types.ts** — Database type definitions',
        '4. **supabase/migrations/001_initial_schema.sql**:',
        '   - coordinates_cache (id uuid PK, address_hash text UNIQUE, lat float8, lng float8, confidence float4, raw_address text, created_at timestamptz, updated_at timestamptz)',
        '   - sync_metadata (id uuid PK, user_id uuid, spreadsheet_id text, tab_name text, last_synced_at timestamptz, row_count int, status text, UNIQUE(user_id, spreadsheet_id, tab_name))',
        '   - user_preferences (id uuid PK, user_id uuid UNIQUE, spreadsheet_id text, active_layers jsonb, map_center jsonb, map_zoom int, created_at timestamptz, updated_at timestamptz)',
        '   - manual_pins (id uuid PK, user_id uuid, patient_cns text, lat float8, lng float8, reference_text text, created_at timestamptz)',
        '5. **supabase/migrations/002_rls_policies.sql**:',
        '   - Enable RLS on all tables',
        '   - Users can only CRUD their own rows (user_id = auth.uid())',
        '   - coordinates_cache is shared (read: all authenticated, write: all authenticated)',
        '',
        'IMPORTANT: Supabase is CACHE only. Never store patient names, addresses, or health data.',
      ],
      outputFormat: 'JSON: { success: boolean, filesCreated: string[] }',
    },
    outputSchema: {
      type: 'object',
      required: ['success'],
      properties: {
        success: { type: 'boolean' },
        filesCreated: { type: 'array', items: { type: 'string' } },
      },
    },
  },
  io: {
    inputJsonPath: `tasks/${taskCtx.effectId}/inputs.json`,
    outputJsonPath: `tasks/${taskCtx.effectId}/output.json`,
  },
}));

// ============================================================================
// PHASE 4: SETTINGS — TEST FIRST
// ============================================================================

const writeSettingsTestsTask = defineTask('write-settings-tests', (args, taskCtx) => ({
  kind: 'agent',
  title: 'Write settings page tests (TDD: red phase)',
  execution: EXECUTION,
  agent: {
    name: 'general-purpose',
    prompt: {
      role: 'Test engineer writing settings page tests (TDD red phase)',
      task: 'Write tests for the settings/spreadsheet configuration page.',
      context: {
        projectDir: args.projectDir,
      },
      instructions: [
        '## Reference Skills (read these files):',
        `- ${SKILLS_DIR}/testing-patterns/SKILL.md — Component testing patterns`,
        `- ${SKILLS_DIR}/ptbr-conventions/SKILL.md — PT-BR text conventions`,
        '',
        '## SPEC (verbatim):',
        '---',
        args.specStdout,
        '---',
        '',
        '## TDD Rules: Write tests from spec only. No implementation.',
        '',
        '## Test Files:',
        '',
        '1. **src/components/settings/SpreadsheetConfig.test.tsx**:',
        '   - Renders form with URL input field',
        '   - Shows PT-BR labels ("Cole a URL da planilha")',
        '   - Extracts spreadsheet ID from valid URL',
        '   - Shows error for invalid URL format',
        '   - Calls save handler with extracted spreadsheet ID',
        '',
        '2. **src/lib/sheets/url-parser.test.ts** (utility):',
        '   - Extracts ID from https://docs.google.com/spreadsheets/d/{id}/edit',
        '   - Handles various URL formats (with/without /edit, with gid param)',
        '   - Returns null for invalid URLs',
        '',
        'Mock Supabase calls. Use @testing-library/react for components.',
      ],
      outputFormat: 'JSON: { success: boolean, testFiles: string[] }',
    },
    outputSchema: {
      type: 'object',
      required: ['success', 'testFiles'],
      properties: {
        success: { type: 'boolean' },
        testFiles: { type: 'array', items: { type: 'string' } },
      },
    },
  },
  io: {
    inputJsonPath: `tasks/${taskCtx.effectId}/inputs.json`,
    outputJsonPath: `tasks/${taskCtx.effectId}/output.json`,
  },
}));

const implementSettingsTask = defineTask('implement-settings', (args, taskCtx) => ({
  kind: 'agent',
  title: 'Implement settings page + dashboard layout (TDD: green phase)',
  execution: EXECUTION,
  agent: {
    name: 'general-purpose',
    prompt: {
      role: 'Senior React/Next.js engineer implementing settings UI (TDD green phase)',
      task: 'Implement the settings page and dashboard layout. Make existing tests pass.',
      context: {
        projectDir: args.projectDir,
      },
      instructions: [
        '## Reference Skills (read these files):',
        `- ${SKILLS_DIR}/tailwind-shadcn/SKILL.md — shadcn/ui + Tailwind v4 patterns`,
        `- ${SKILLS_DIR}/ptbr-conventions/SKILL.md — PT-BR formatting`,
        `- ${SKILLS_DIR}/nextjs-patterns/SKILL.md — App Router page patterns`,
        '',
        '## SPEC (verbatim):',
        '---',
        args.specStdout,
        '---',
        '',
        '## AGENTS.md (verbatim):',
        '---',
        args.agentsStdout,
        '---',
        '',
        '## Read existing tests and project files first.',
        '',
        '## Implementation:',
        '',
        '1. **src/lib/sheets/url-parser.ts** — Extract spreadsheet ID from Google Sheets URL',
        '2. **src/components/settings/SpreadsheetConfig.tsx** — Form component:',
        '   - Input for Google Sheets URL',
        '   - Validate URL format',
        '   - Extract and display spreadsheet ID',
        '   - Save to Supabase user_preferences',
        '   - Success/error feedback',
        '3. **src/app/(dashboard)/layout.tsx** — Dashboard layout:',
        '   - Header with user menu, sync badge placeholder',
        '   - Sidebar placeholder (for layers in M3)',
        '   - Main content area',
        '4. **src/app/(dashboard)/settings/page.tsx** — Settings page',
        '5. **src/app/(dashboard)/page.tsx** — Dashboard home (redirect to map or show setup prompt)',
        '',
        'UI: Use shadcn/ui (Card, Input, Button, Label). All text PT-BR.',
      ],
      outputFormat: 'JSON: { success: boolean, filesCreated: string[], filesModified: string[] }',
    },
    outputSchema: {
      type: 'object',
      required: ['success'],
      properties: {
        success: { type: 'boolean' },
        filesCreated: { type: 'array', items: { type: 'string' } },
        filesModified: { type: 'array', items: { type: 'string' } },
      },
    },
  },
  io: {
    inputJsonPath: `tasks/${taskCtx.effectId}/inputs.json`,
    outputJsonPath: `tasks/${taskCtx.effectId}/output.json`,
  },
}));

// ============================================================================
// PHASE 5: GOOGLE SHEETS — TEST FIRST
// ============================================================================

const writeSheetsTestsTask = defineTask('write-sheets-tests', (args, taskCtx) => ({
  kind: 'agent',
  title: 'Write Google Sheets data layer tests (TDD: red phase)',
  execution: EXECUTION,
  agent: {
    name: 'general-purpose',
    prompt: {
      role: 'Test engineer writing Google Sheets integration tests (TDD red phase)',
      task: 'Write comprehensive tests for the Sheets data layer: parser, discovery, sync, rate limiting.',
      context: {
        projectDir: args.projectDir,
      },
      instructions: [
        '## Reference Skills (read these files):',
        `- ${SKILLS_DIR}/sheets-data-layer/SKILL.md — Google Sheets API patterns`,
        `- ${SKILLS_DIR}/domain-model/SKILL.md — Healthcare domain, field semantics`,
        `- ${SKILLS_DIR}/testing-patterns/SKILL.md — Mocking googleapis`,
        `- ${SKILLS_DIR}/typescript-strict/SKILL.md — Zod validation patterns`,
        '',
        '## SPEC (verbatim):',
        '---',
        args.specStdout,
        '---',
        '',
        '## TDD Rules: Write tests from spec only. Do NOT read/create implementation.',
        '',
        '## Test Files:',
        '',
        '1. **src/lib/sheets/parser.test.ts** — Column mapping + data parsing:',
        '   - Maps Portuguese headers to English fields (Nome→name, CNS→cns, Rua→street)',
        '   - Handles date parsing (dd/MM/yyyy → Date)',
        '   - Handles empty cells (returns null/undefined)',
        '   - Handles numeric fields (Idade, IG)',
        '   - Extracts common patient base fields',
        '   - Handles tab-specific fields (Gestantes: DUM, DPP, Risco)',
        '',
        '2. **src/lib/sheets/discovery.test.ts** — Tab auto-discovery:',
        '   - Returns list of all tab names from spreadsheet',
        '   - Includes metadata (row count, column count)',
        '   - Distinguishes patient tabs from location tabs (PSE, ILPI)',
        '',
        '3. **src/lib/sheets/sync.test.ts** — Sync orchestration:',
        '   - Determines which tabs are stale (last_synced_at older than threshold)',
        '   - Updates sync_metadata after successful read',
        '   - Handles partial sync failures gracefully',
        '',
        '4. **src/lib/sheets/client.test.ts** — Sheets API client:',
        '   - Reads values from a specified range',
        '   - Handles rate limit errors (429) with retry',
        '   - Uses user OAuth token from session',
        '',
        '5. **src/app/api/sheets/[tabName]/route.test.ts** — API handler:',
        '   - Returns parsed patient data for a given tab',
        '   - Returns 401 if no session',
        '   - Returns 404 for unknown tab names',
        '',
        'Mock googleapis with vi.mock(). Use synthetic data only (no real patient info).',
        'Use SYNTHETIC data examples: { Nome: "Maria Silva (fictício)", CNS: "000000000000000" }',
      ],
      outputFormat: 'JSON: { success: boolean, testFiles: string[] }',
    },
    outputSchema: {
      type: 'object',
      required: ['success', 'testFiles'],
      properties: {
        success: { type: 'boolean' },
        testFiles: { type: 'array', items: { type: 'string' } },
      },
    },
  },
  io: {
    inputJsonPath: `tasks/${taskCtx.effectId}/inputs.json`,
    outputJsonPath: `tasks/${taskCtx.effectId}/output.json`,
  },
}));

const implementSheetsTask = defineTask('implement-sheets', (args, taskCtx) => ({
  kind: 'agent',
  title: 'Implement Google Sheets data layer (TDD: green phase)',
  execution: EXECUTION,
  agent: {
    name: 'general-purpose',
    prompt: {
      role: 'Senior backend engineer implementing Google Sheets integration (TDD green phase)',
      task: 'Implement the Sheets data layer. Make all existing sheets tests pass.',
      context: {
        projectDir: args.projectDir,
      },
      instructions: [
        '## Reference Skills (read these files):',
        `- ${SKILLS_DIR}/sheets-data-layer/SKILL.md — Write-then-cache pattern, rate limiting`,
        `- ${SKILLS_DIR}/domain-model/SKILL.md — Field semantics, tab→layer mapping`,
        `- ${SKILLS_DIR}/typescript-strict/SKILL.md — Zod schemas, branded types`,
        `- ${SKILLS_DIR}/error-handling/SKILL.md — Error chain from Sheets API to client`,
        `- ${SKILLS_DIR}/lgpd-guard/SKILL.md — NEVER log patient data`,
        '',
        '## SPEC (verbatim):',
        '---',
        args.specStdout,
        '---',
        '',
        '## AGENTS.md (verbatim):',
        '---',
        args.agentsStdout,
        '---',
        '',
        '## Read existing test files and project structure first.',
        '',
        '## Implementation:',
        '',
        '1. **src/lib/sheets/client.ts** — Google Sheets API v4 client:',
        '   - Use googleapis package',
        '   - Accept OAuth token from session',
        '   - batchGet for reading ranges',
        '   - Rate limit: token bucket (300 reads/min, 60 writes/min)',
        '   - Retry on 429 with exponential backoff',
        '',
        '2. **src/lib/sheets/discovery.ts** — Auto-discover tabs:',
        '   - spreadsheets.get() to list all sheets',
        '   - Return: { name, rowCount, columnCount, isPatientTab }',
        '',
        '3. **src/lib/sheets/parser.ts** — Parse sheet data:',
        '   - Column mapping: Portuguese header → English field name',
        '   - Common fields: Data última atualização, Nome, CNS, Data Nascimento, Idade, Telefone, Rua, Número, Complemento',
        '   - Tab-specific: Gestantes (DUM, DPP, Risco, IG), TB (Baciloscopia, TRM), etc.',
        '   - Date parsing: dd/MM/yyyy → Date object',
        '   - Zod schema validation at boundary',
        '',
        '4. **src/lib/sheets/sync.ts** — Sync orchestration:',
        '   - Check sync_metadata for staleness',
        '   - Fetch stale tabs from Sheets API',
        '   - Update sync_metadata on success',
        '',
        '5. **src/lib/sheets/types.ts** — Types + Zod schemas:',
        '   - PatientBase, ColumnMapping, SheetTab, SyncStatus',
        '',
        '6. **src/app/api/sheets/route.ts** — GET: list all tabs',
        '7. **src/app/api/sheets/[tabName]/route.ts** — GET: read tab data',
        '',
        'CRITICAL: NEVER log patient names, CNS, addresses, or health conditions.',
        'Only log: "Synced tab X: Y rows" (no PII in the message).',
      ],
      outputFormat: 'JSON: { success: boolean, filesCreated: string[] }',
    },
    outputSchema: {
      type: 'object',
      required: ['success'],
      properties: {
        success: { type: 'boolean' },
        filesCreated: { type: 'array', items: { type: 'string' } },
      },
    },
  },
  io: {
    inputJsonPath: `tasks/${taskCtx.effectId}/inputs.json`,
    outputJsonPath: `tasks/${taskCtx.effectId}/output.json`,
  },
}));

// ============================================================================
// PHASE 6: GEOCODING — TEST FIRST
// ============================================================================

const writeGeocodingTestsTask = defineTask('write-geocoding-tests', (args, taskCtx) => ({
  kind: 'agent',
  title: 'Write geocoding service tests (TDD: red phase)',
  execution: EXECUTION,
  agent: {
    name: 'general-purpose',
    prompt: {
      role: 'Test engineer writing geocoding tests (TDD red phase)',
      task: 'Write tests for Nominatim geocoding: normalization, caching, rate limiting, batch processing.',
      context: {
        projectDir: args.projectDir,
      },
      instructions: [
        '## Reference Skills (read these files):',
        `- ${SKILLS_DIR}/geospatial/SKILL.md — Geocoding patterns, address normalization`,
        `- ${SKILLS_DIR}/testing-patterns/SKILL.md — Mocking HTTP calls`,
        `- ${SKILLS_DIR}/lgpd-guard/SKILL.md — No addresses in logs`,
        '',
        '## SPEC (verbatim):',
        '---',
        args.specStdout,
        '---',
        '',
        '## TDD Rules: Write tests from spec only. No implementation.',
        '',
        '## Test Files:',
        '',
        '1. **src/lib/geocoding/normalize.test.ts** — Address normalization:',
        '   - Expands abbreviations: "R." → "Rua", "Av." → "Avenida", "Trav." → "Travessa"',
        '   - Normalizes case and accents',
        '   - Handles "s/n" (sem número) → returns null for number',
        '   - Separates street + number from combined strings',
        '   - Handles common Porto Alegre patterns',
        '',
        '2. **src/lib/geocoding/cache.test.ts** — Supabase coordinate cache:',
        '   - Returns cached coordinates on cache hit (by address hash)',
        '   - Returns null on cache miss',
        '   - Stores new geocoding result in cache',
        '   - Hash is deterministic for same normalized address',
        '',
        '3. **src/lib/geocoding/batch.test.ts** — Batch geocoding:',
        '   - Processes addresses at max 1 per second',
        '   - Skips addresses already in cache',
        '   - Returns results progressively (callback per result)',
        '   - Handles geocoding failures gracefully (marks as unresolved)',
        '',
        '4. **src/lib/geocoding/client.test.ts** — Nominatim client:',
        '   - Sends structured query (street, city=Porto Alegre, state=RS)',
        '   - Includes User-Agent header',
        '   - Returns lat/lng + confidence on success',
        '   - Returns null on no results',
        '   - Respects 1 req/s rate limit',
        '',
        '5. **src/app/api/geocode/route.test.ts** — API handler:',
        '   - POST with single address returns coordinates',
        '   - POST with batch returns array of results',
        '   - Returns 401 without session',
        '',
        'Mock fetch() for Nominatim. Mock Supabase for cache.',
        'Use synthetic addresses only (not real Porto Alegre addresses).',
      ],
      outputFormat: 'JSON: { success: boolean, testFiles: string[] }',
    },
    outputSchema: {
      type: 'object',
      required: ['success', 'testFiles'],
      properties: {
        success: { type: 'boolean' },
        testFiles: { type: 'array', items: { type: 'string' } },
      },
    },
  },
  io: {
    inputJsonPath: `tasks/${taskCtx.effectId}/inputs.json`,
    outputJsonPath: `tasks/${taskCtx.effectId}/output.json`,
  },
}));

const implementGeocodingTask = defineTask('implement-geocoding', (args, taskCtx) => ({
  kind: 'agent',
  title: 'Implement Nominatim geocoding service (TDD: green phase)',
  execution: EXECUTION,
  agent: {
    name: 'general-purpose',
    prompt: {
      role: 'Senior backend engineer implementing geocoding (TDD green phase)',
      task: 'Implement the geocoding service. Make all existing geocoding tests pass.',
      context: {
        projectDir: args.projectDir,
      },
      instructions: [
        '## Reference Skills (read these files):',
        `- ${SKILLS_DIR}/geospatial/SKILL.md — Nominatim patterns, rate limits, address normalization`,
        `- ${SKILLS_DIR}/error-handling/SKILL.md — Error handling patterns`,
        `- ${SKILLS_DIR}/lgpd-guard/SKILL.md — Never log addresses`,
        `- ${SKILLS_DIR}/typescript-strict/SKILL.md — Type patterns`,
        '',
        '## SPEC (verbatim):',
        '---',
        args.specStdout,
        '---',
        '',
        '## AGENTS.md (verbatim):',
        '---',
        args.agentsStdout,
        '---',
        '',
        '## Read existing test files and project structure first.',
        '',
        '## Implementation:',
        '',
        '1. **src/lib/geocoding/client.ts** — Nominatim API client:',
        '   - Base URL: https://nominatim.openstreetmap.org/search',
        '   - Structured query params: street, city, state, country, format=json',
        '   - Default: city=Porto Alegre, state=Rio Grande do Sul, country=Brazil',
        '   - User-Agent: "saude-territorial/1.0 (health monitoring app)"',
        '   - Timeout: 10s',
        '   - Rate limit: 1 request per second (mandatory Nominatim policy)',
        '',
        '2. **src/lib/geocoding/normalize.ts** — Brazilian address normalization:',
        '   - Abbreviation expansion (R.→Rua, Av.→Avenida, Trav.→Travessa, Est.→Estrada)',
        '   - Case normalization (title case)',
        '   - "s/n" or "S/N" → number is null',
        '   - Handle combined "Rua X, 123" → separate street and number',
        '',
        '3. **src/lib/geocoding/cache.ts** — Supabase coordinate cache:',
        '   - Hash: SHA-256 of normalized address string',
        '   - Lookup: query coordinates_cache by address_hash',
        '   - Store: insert into coordinates_cache with confidence',
        '',
        '4. **src/lib/geocoding/batch.ts** — Queue-based batch geocoding:',
        '   - Queue with 1000ms minimum between requests',
        '   - Check cache first, skip cached addresses',
        '   - Process queue sequentially',
        '   - Callback/event per completed result',
        '',
        '5. **src/lib/geocoding/types.ts** — Types:',
        '   - GeocodingResult { lat, lng, confidence, source }',
        '   - NormalizedAddress { street, number, city, state }',
        '   - CacheEntry, BatchResult',
        '',
        '6. **src/app/api/geocode/route.ts** — POST handler:',
        '   - Accept: { address: string } or { addresses: string[] }',
        '   - Check auth session',
        '   - Return coordinates + confidence',
        '',
        'CRITICAL: Never log full addresses. Only "geocoded N addresses, M cached, K failed".',
      ],
      outputFormat: 'JSON: { success: boolean, filesCreated: string[] }',
    },
    outputSchema: {
      type: 'object',
      required: ['success'],
      properties: {
        success: { type: 'boolean' },
        filesCreated: { type: 'array', items: { type: 'string' } },
      },
    },
  },
  io: {
    inputJsonPath: `tasks/${taskCtx.effectId}/inputs.json`,
    outputJsonPath: `tasks/${taskCtx.effectId}/output.json`,
  },
}));
