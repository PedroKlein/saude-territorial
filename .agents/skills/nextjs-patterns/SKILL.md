---
name: nextjs-patterns
description: >
  Next.js 16 App Router architecture patterns for this project. Covers the "use cache" opt-in
  caching model, proxy.ts (replaces middleware.ts), Server vs Client Component boundaries,
  dynamic imports for Leaflet, Turbopack conventions, and data fetching strategy (Server
  Components + TanStack Query). Use when creating pages, layouts, route handlers, or deciding
  component boundaries. Triggers on: new page, new route, "use client", "use cache", caching,
  proxy.ts, middleware, layout, loading, error boundary, Server Component, Client Component,
  streaming, Suspense, data fetching. Do NOT use for Leaflet-specific patterns (use
  leaflet-nextjs) or state management details (use tanstack-query or zustand-store).
---

# Next.js 16 App Router Patterns

## Core Mental Model

Next.js 16 is **dynamic by default**. Every page renders at request time unless you explicitly
opt into caching with `"use cache"`. This is the inverse of Next.js 14/15.

Three directives control the boundary:
- `"use client"` — marks a Client Component (interactivity, hooks, browser APIs)
- `"use cache"` — opts a component/function into caching (replaces old `revalidate`/`unstable_cache`)
- Server Components are the default — no directive needed

## Component Boundary Judgment

**Before adding `"use client"`, ask yourself:**
1. Can this be split so the interactive part is a leaf component? (Push boundary deeper)
2. Does this component's parent need to fetch data? (If yes, parent stays server)
3. Will this boundary force a large dependency into the client bundle?

**The non-obvious rule:** A Client Component CAN render Server Components passed as
`children` props — but it cannot import and render them directly. This enables the
"donut pattern": Server layout with client interactive shell receiving server children.

## Caching with "use cache"

The old model (`fetch(url, { next: { revalidate: 60 } })`, `unstable_cache`) is gone.
The new model uses three APIs:

```tsx
// Cache an entire page
"use cache"
import { cacheLife, cacheTag } from 'next/cache'

export default async function PatientsPage() {
  cacheLife('hours')  // TTL profiles: 'seconds' | 'minutes' | 'hours' | 'days' | 'weeks' | 'max'
  cacheTag('patients')  // Named tag for targeted invalidation
  const patients = await fetchPatients()
  return <PatientList patients={patients} />
}

// Cache a single function
async function getSheetData(tabName: string) {
  "use cache"
  cacheLife('minutes')
  cacheTag(`sheet-${tabName}`)
  return await sheetsApi.getValues(tabName)
}
```

**Invalidation** uses `revalidateTag`:
```tsx
"use server"
import { revalidateTag } from 'next/cache'

export async function updatePatient(cns: string, data: PatientUpdate) {
  await writeToSheet(cns, data)
  revalidateTag('patients')  // Purge all cached patient data
  revalidateTag(`patient-${cns}`)  // Purge specific patient
}
```

**Key rule:** `"use cache"` and `"use client"` are mutually exclusive in the same file.
Cache components run on the server and produce a static snapshot.

## proxy.ts (replaces middleware.ts)

File: `src/proxy.ts` (or `proxy.ts` at project root if no `src/` directory).
**CRITICAL:** Do NOT put it at `src/app/proxy.ts` — that path is silently ignored.
Runs on **every request** before route resolution.
Default runtime is **Node.js** (not Edge like the old middleware).

```tsx
// proxy.ts
import { NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/proxy'

export async function proxy(request: NextRequest) {
  // Refresh Supabase auth session (cookie-based)
  const response = await updateSession(request)

  // Protect authenticated routes
  const { pathname } = request.nextUrl
  if (pathname.startsWith('/map') || pathname.startsWith('/settings')) {
    const session = response.headers.get('x-session-status')
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

## Dynamic Imports (browser-only libraries)

Leaflet, map plugins, and any library that accesses `window` MUST use dynamic import:

```tsx
// app/(dashboard)/map/page.tsx — Server Component
import dynamic from 'next/dynamic'

const MapView = dynamic(() => import('@/components/map/MapView'), {
  ssr: false,  // Critical: prevents server-side execution
  loading: () => <MapSkeleton />,
})

export default function MapPage() {
  return <MapView />
}
```

## Data Fetching Strategy

| Where | How | When |
|-------|-----|------|
| Server Component | Direct `async/await` | Initial page load, SEO-critical data |
| Server Component | `"use cache"` + `cacheLife` | Data that can be stale for minutes/hours |
| Client Component | TanStack Query `useQuery` | Interactive data, polling, optimistic updates |
| Mutation | Server Action → `revalidateTag` | Write operations (sheet edits) |

```tsx
// Server Component fetches initial data
export default async function PatientPage({ params }: { params: Promise<{ cns: string }> }) {
  const { cns } = await params  // Next.js 16: params is async
  const patient = await getPatient(cns)
  return <PatientDetail initialData={patient} cns={cns} />
}

// Client Component uses TanStack Query for live updates
"use client"
function PatientDetail({ initialData, cns }: Props) {
  const { data } = useQuery({
    ...patientKeys.detail(cns),
    initialData,  // Hydrate from server fetch
  })
  return <DetailPanel patient={data} />
}
```

## Async Request APIs (Breaking in Next.js 16)

All request-scoped APIs are now **async only**:

```tsx
// Next.js 16 — MUST await
import { cookies, headers } from 'next/headers'
import { params, searchParams } from 'next/request'

export default async function Page({ params, searchParams }: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string }>
}) {
  const { id } = await params
  const { tab } = await searchParams
  const cookieStore = await cookies()
  const headersList = await headers()
}
```

## Route Handlers (API Routes)

```tsx
// app/api/sheets/[tabName]/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tabName: string }> }
) {
  const { tabName } = await params
  // ... fetch from Google Sheets
  return NextResponse.json(data)
}
```

Route handlers are **not cached** by default in Next.js 16. Add `"use cache"` if needed.

## Key Gotcha: `"use cache"` in Route Handlers

`"use cache"` does NOT work inside Route Handlers (app/api/ routes). It only works
in Server Components and standalone functions. For caching API responses, cache the
data-fetching function that the route handler calls:

```tsx
// lib/data.ts — cacheable
async function getTabData(tab: string) {
  "use cache"
  cacheLife('minutes')
  cacheTag(`tab-${tab}`)
  return await sheetsApi.getValues(tab)
}

// app/api/sheets/[tab]/route.ts — NOT cacheable directly
export async function GET(req, { params }) {
  const { tab } = await params
  const data = await getTabData(tab)  // This call hits the cache
  return NextResponse.json(data)
}
```

## NEVER

- **NEVER assume fetch() is cached** — Next.js 16 is dynamic by default; add `"use cache"` explicitly
- **NEVER use `middleware.ts`** — it's renamed to `proxy.ts` in Next.js 16; the codemod handles migration
- **NEVER access `params` or `searchParams` synchronously** — they are `Promise` in Next.js 16; always `await`
- **NEVER put `"use cache"` and `"use client"` in the same file** — they are mutually exclusive directives
- **NEVER use `"use client"` on a layout that wraps data-fetching children** — it forces the entire subtree client-side
- **NEVER import Leaflet/react-leaflet without `ssr: false` dynamic import** — Leaflet requires `window`
- **NEVER create Zustand stores as global variables in App Router** — use a provider pattern per the Zustand Next.js guide (one store per request on server)
- **NEVER use `useEffect` for data fetching** — use TanStack Query; it handles races, dedup, caching
- **NEVER use the old `unstable_cache` or `fetch({ next: { revalidate } })` patterns** — they're replaced by `"use cache"` + `cacheLife` + `cacheTag`
