---
name: supabase-patterns
description: Supabase-JS integration for THIS app is limited to the auth/session boundary — reading the signed-in user's session in server components and API routes. All data access (patients, layers, alerts, geocoding cache) goes through Drizzle. Use this skill only for auth-adjacent Supabase work.
disable-model-invocation: true
---

# Supabase — Auth Boundary Only

## Scope

Post-pivot (see `docs/adr/ADR-002-drizzle-orm.md`), the two libraries have a hard boundary:

| Concern | Library |
|---|---|
| **Data queries / mutations** — patients, layers, alerts | Drizzle ORM (`drizzle-data-access` skill) |
| **Schema, migrations** | Drizzle Kit |
| **Auth, sessions, cookies** | Better Auth (`auth-betterauth` skill), with Supabase-JS for user metadata reads when needed |
| **Supabase Storage** (files) | `@supabase/supabase-js` (deferred; not in MVP) |
| **Supabase Realtime** (subscriptions) | `@supabase/supabase-js` (deferred; not in MVP) |

**This skill covers the auth boundary and future Storage/Realtime use.** For patient CRUD, joins across `patients` + extension tables, migrations, or seed scripts, see the `drizzle-data-access` skill instead.

## Historical note

An earlier version of this skill covered `@supabase/supabase-js` as the primary data access layer (patient reads with `.select("*, gestantes_data(*)")`, `coordinates_cache` writes with `.upsert()`, `sync_metadata` tracking). That role has moved entirely to Drizzle. If you find yourself writing `.from("patients").select(...)`, stop — you should be writing Drizzle.

## Why this split exists

Prisma-vs-Supabase-JS-vs-Drizzle was evaluated during the pivot planning. Drizzle won for data because:
1. Native RLS-friendly (uses user JWT if enabled) — no service-role bypass footgun that Prisma has.
2. SQL-native migrations you can inspect and commit.
3. TS-native schema, no code-gen step.
4. Better agent DX for typed `include`-style joins.

Supabase-JS stays for the parts of the Supabase surface Drizzle can't reach: Storage (file uploads), Realtime (WebSocket subscriptions), and Auth admin operations. As of MVP, none of these are used, but the boundary is documented here so it stays clean if they arrive.

## When you need Supabase-JS in this app

Currently: only when interacting with Supabase's **non-Postgres** surface. If you're touching a table, use Drizzle.

If a future feature needs Supabase Storage (e.g., patient photo uploads) or Realtime (e.g., live sync between ACS devices), instantiate the Supabase client at that boundary with only the scopes it needs:

```typescript
// src/lib/supabase-storage.ts  — hypothetical, not in MVP
import { createBrowserClient } from "@supabase/ssr";

export function makeStorageClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

Use it only for `.storage` calls — never `.from(...)` (that path is Drizzle territory).

## Auth-adjacent Supabase reads (advanced)

Better Auth owns the primary session. If you ever need to correlate a Better Auth user with a Supabase auth row (e.g., for RLS policies keyed on Supabase's `auth.uid()`), do it in a dedicated helper — never sprinkle Supabase client instantiation across the codebase.

For MVP, this isn't needed. Session identity comes from Better Auth (`session.user.id`), and Drizzle queries key on Better Auth user IDs directly.

## Env variables

Present but only relevant when Storage / Realtime land:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` — **never** import into a client-facing route or component. Only for admin scripts (seed, backups) and future server-side maintenance jobs. Treat this key like a production credential in every environment.

## Anti-patterns

- Using `@supabase/supabase-js` for any table read — that's Drizzle territory now.
- Instantiating Supabase clients at module scope with the service-role key — leaks into every request, defeats RLS.
- Bridging Better Auth and Supabase Auth silently — if you need both identity systems, document the reason and centralize the bridge.
- Reintroducing `coordinates_cache`, `sync_metadata`, `manual_pins`, or `user_preferences` at the Supabase-JS layer — those tables (or their new equivalents) live in Drizzle schema now.

## References

- `docs/adr/ADR-002-drizzle-orm.md` — why data moved to Drizzle
- `drizzle-data-access` skill — the actual data patterns for this app
- `auth-betterauth` skill — the session boundary this skill defers to
