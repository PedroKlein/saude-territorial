---
name: supabase-patterns
description: >
  Supabase integration patterns for this Next.js 16 project. Supabase is used as a CACHE
  layer (not source of truth — that's Google Sheets). Covers @supabase/ssr client setup,
  proxy.ts session refresh, Row Level Security for multi-user access, TypeScript type
  generation, migration patterns, and the cache table schema design. Use when setting up
  Supabase clients, writing RLS policies, designing cache tables, running migrations, or
  handling auth session refresh. Triggers on: Supabase, createClient, RLS, policy, migration,
  type generation, supabase-js, @supabase/ssr, cookie, session refresh, proxy.ts supabase,
  cache table, geocode_cache, sync_metadata. Do NOT use for Google Sheets data layer
  (use sheets-data-layer) or auth setup (use auth-betterauth).
---

# Supabase Patterns (Cache Layer)

## Role in Architecture

```
Google Sheets (SOURCE OF TRUTH — patient data)
    ↕
Supabase (CACHE — geocoded coords, sync metadata, user preferences, alert results)
    ↕
Client (TanStack Query)
```

Supabase stores:
- Geocoded coordinates (address → lat/lng cache)
- Sync metadata (last sync timestamp per tab)
- User preferences (default layers, map view)
- Computed alert results (pre-computed urgency for faster map load)
- Team/spreadsheet configuration

Supabase does NOT store:
- Patient names, CNS, health conditions (those stay in Google Sheets only)
- Raw sheet data (we don't replicate the spreadsheet)

## proxy.ts Composition (Supabase + Better Auth)

A single `proxy.ts` file handles BOTH Supabase session refresh AND route protection.
This skill owns the Supabase session-refresh leg; `auth-betterauth` owns the
route-protection leg. Here's how they compose:

```typescript
// proxy.ts (root)
import { updateSession } from '@/lib/supabase/proxy'  // This skill
import { auth } from '@/lib/auth'                      // auth-betterauth
import { NextRequest, NextResponse } from 'next/server'

export async function proxy(request: NextRequest) {
  // 1. Refresh Supabase session cookies (this skill)
  const response = await updateSession(request)

  // 2. Check Better Auth session for protected routes (auth-betterauth skill)
  const { pathname } = request.nextUrl
  if (pathname.startsWith('/map') || pathname.startsWith('/settings')) {
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg)$).*)'],
}
```

## Client Setup (@supabase/ssr)

Three clients for three contexts:

```typescript
// lib/supabase/server.ts — Server Components & Route Handlers
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/supabase'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Components can't set cookies — that's OK,
            // proxy.ts handles the refresh
          }
        },
      },
    }
  )
}
```

```typescript
// lib/supabase/client.ts — Client Components
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/supabase'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

```typescript
// lib/supabase/proxy.ts — Session refresh in proxy.ts
import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session — MUST call getUser, not getSession
  await supabase.auth.getUser()

  return response
}
```

**Critical:** Use `getAll`/`setAll` — never individual `get`/`set`/`remove` (deprecated
pattern that breaks with chunked cookies).

## Type Generation

```bash
pnpm supabase gen types typescript --project-id "$PROJECT_ID" > src/types/supabase.ts
```

Run after every migration. Commit the generated types.

## Cache Table Schema

```sql
-- supabase/migrations/001_cache_tables.sql

-- Geocoded address cache
create table geocode_cache (
  id uuid primary key default gen_random_uuid(),
  cache_key text unique not null,  -- normalized address hash
  lat double precision not null,
  lng double precision not null,
  confidence float not null default 0,
  raw_address text not null,
  geocoded_at timestamptz not null default now()
);

-- Sync metadata per sheet tab
create table sync_metadata (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references teams(id) not null,
  tab_name text not null,
  last_sync_at timestamptz not null default now(),
  row_count int not null default 0,
  unique (team_id, tab_name)
);

-- User preferences
create table user_preferences (
  user_id uuid primary key references auth.users(id),
  default_layers text[] not null default '{"gestantes","territories"}',
  map_center point not null default point(-30.03, -51.23),
  map_zoom int not null default 14,
  updated_at timestamptz not null default now()
);

-- Team configuration (which spreadsheet, which unit)
create table teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  spreadsheet_id text not null,
  health_unit text not null default 'US Moab Caldas',
  created_at timestamptz not null default now()
);

create table team_members (
  team_id uuid references teams(id) not null,
  user_id uuid references auth.users(id) not null,
  role text not null default 'member',  -- 'admin' | 'member'
  primary key (team_id, user_id)
);
```

## Row Level Security (RLS)

```sql
-- Enable RLS on all tables
alter table geocode_cache enable row level security;
alter table sync_metadata enable row level security;
alter table user_preferences enable row level security;
alter table teams enable row level security;
alter table team_members enable row level security;

-- Geocode cache: append-only shared cache (no updates/deletes)
create policy "geocode_cache_read" on geocode_cache
  for select to authenticated using (true);

create policy "geocode_cache_insert" on geocode_cache
  for insert to authenticated with check (true);

create policy "geocode_cache_no_update" on geocode_cache
  for update to authenticated using (false);

create policy "geocode_cache_no_delete" on geocode_cache
  for delete to authenticated using (false);

-- User preferences: users manage their own
create policy "prefs_own" on user_preferences
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Sync metadata: team members only
create policy "sync_team_read" on sync_metadata
  for select to authenticated
  using (team_id in (
    select team_id from team_members where user_id = auth.uid()
  ));

-- Teams: members can read their team
create policy "teams_member_read" on teams
  for select to authenticated
  using (id in (
    select team_id from team_members where user_id = auth.uid()
  ));
```

## Migration Workflow

```bash
# Create a new migration
pnpm supabase migration new add_alert_cache

# Apply locally
pnpm supabase db reset

# Push to remote
pnpm supabase db push

# Regenerate types
pnpm supabase gen types typescript --project-id "$PROJECT_ID" > src/types/supabase.ts
```

## Querying with Types

```typescript
import { createClient } from '@/lib/supabase/server'

export async function getCachedCoordinates(cacheKey: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('geocode_cache')
    .select('lat, lng, confidence')
    .eq('cache_key', cacheKey)
    .single()

  if (error && error.code !== 'PGRST116') throw error  // PGRST116 = no rows
  return data
}
```

## Cache Invalidation

When a Sheet write changes address fields (rua, numero), the old geocoded coordinates
are stale. Delete the corresponding cache entry:

```typescript
// In the Sheet write-then-cache flow (see sheets-data-layer skill)
async function invalidateGeoCache(oldAddress: NormalizedAddress) {
  const cacheKey = buildCacheKey(oldAddress)
  await supabase.from('geocode_cache').delete().eq('cache_key', cacheKey)
}
```

## Key Supabase Gotcha

`PGRST116` from `.single()` is NOT a thrown error — it returns `{ data: null, error: { code: 'PGRST116' } }`.
Handle it as "no rows found", not as a failure:

```typescript
const { data, error } = await supabase.from('geocode_cache').select().eq('key', k).single()
if (error && error.code !== 'PGRST116') throw error  // Real error
return data  // null if not found, typed result if found
```

## NEVER

- **NEVER store patient names, CNS, or health data in Supabase** — it's a cache for coordinates and metadata only; patient data stays in Google Sheets
- **NEVER use `getSession()` in proxy.ts to check auth** — use `getUser()` which actually validates the JWT against Supabase Auth
- **NEVER use individual `get`/`set`/`remove` cookie methods** — use `getAll`/`setAll`; Supabase chunks cookies and individual methods miss chunks
- **NEVER skip RLS** — even for "internal" tables; defense in depth
- **NEVER allow UPDATE or DELETE on geocode_cache without explicit need** — the cache is append-only by default; address changes should delete-and-reinsert via the invalidation flow above
- **NEVER forget to regenerate types after migration** — stale types cause runtime errors that TypeScript should catch
- **NEVER create a global Supabase client in App Router** — create per-request in server contexts (see client setup above)
