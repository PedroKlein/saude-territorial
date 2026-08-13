---
name: tanstack-query
description: >
  TanStack Query v5 patterns for this Next.js 16 health monitoring app. Covers query key
  factories, cache invalidation after sheet writes, optimistic updates for patient edits,
  prefetching in Server Components with hydration, dependent queries for layered data,
  and polling strategies. Use when fetching data in Client Components, writing mutations,
  invalidating cache, or designing query architecture. Triggers on: useQuery, useMutation,
  queryClient, invalidateQueries, prefetch, optimistic update, stale time, query key,
  cache, refetch, polling, infinite query, dependent query, TanStack, React Query.
  Do NOT use for server-side data fetching (use nextjs-patterns "use cache") or client
  state (use zustand-store).
---

# TanStack Query v5 Patterns

## Query Key Factory

Single source of truth for query keys. Prevents stale cache and enables targeted invalidation:

```typescript
// lib/queries/keys.ts
export const patientKeys = {
  all: ['patients'] as const,
  lists: () => [...patientKeys.all, 'list'] as const,
  list: (filters: PatientFilters) => [...patientKeys.lists(), filters] as const,
  details: () => [...patientKeys.all, 'detail'] as const,
  detail: (cns: CNS) => [...patientKeys.details(), cns] as const,
}

export const sheetKeys = {
  all: ['sheets'] as const,
  tab: (tabName: SheetTabId) => [...sheetKeys.all, tabName] as const,
  tabRange: (tabName: SheetTabId, range: string) => [...sheetKeys.tab(tabName), range] as const,
}

export const geocodeKeys = {
  all: ['geocode'] as const,
  address: (address: string) => [...geocodeKeys.all, address] as const,
}
```

**Why hierarchical:** `invalidateQueries({ queryKey: patientKeys.all })` wipes everything.
`invalidateQueries({ queryKey: patientKeys.detail(cns) })` wipes only one patient.

## queryOptions Helper (DRY + Type Safety)

Consolidate `queryKey` + `queryFn` + options in one object. Reuse across `useQuery`,
`prefetchQuery`, and `getQueryData`:

```typescript
// lib/queries/patients.ts
import { queryOptions } from '@tanstack/react-query'

export function patientListOptions(filters: PatientFilters) {
  return queryOptions({
    queryKey: patientKeys.list(filters),
    queryFn: () => fetchPatients(filters),
    staleTime: 5 * 60 * 1000,  // 5 min — sheet data doesn't change per-second
  })
}

export function patientDetailOptions(cns: CNS) {
  return queryOptions({
    queryKey: patientKeys.detail(cns),
    queryFn: () => fetchPatient(cns),
    staleTime: 2 * 60 * 1000,
  })
}
```

## Server Component Prefetch + Client Hydration

Fetch in the Server Component, hydrate in the Client Component:

```tsx
// app/(dashboard)/map/page.tsx — Server Component
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query'
import { patientListOptions } from '@/lib/queries/patients'

export default async function MapPage() {
  const queryClient = new QueryClient()
  await queryClient.prefetchQuery(patientListOptions({ layer: 'gestantes' }))

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <MapView />  {/* Client Component — useQuery reads from prefetched cache */}
    </HydrationBoundary>
  )
}

// components/map/MapView.tsx — Client Component
"use client"
import { useQuery } from '@tanstack/react-query'
import { patientListOptions } from '@/lib/queries/patients'

export function PatientLayer({ filters }: { filters: PatientFilters }) {
  const { data, isLoading } = useQuery(patientListOptions(filters))
  // data is immediately available from server prefetch — no loading flash
}
```

## Mutations: Write to Supabase (via Drizzle) → Invalidate Cache

Post-pivot (see `docs/adr/ADR-001-drop-sheets.md`), Supabase is the source of truth and Drizzle owns writes. The write-to-Sheet-first pattern is dead. Same TanStack Query shape, different destination:

```typescript
// lib/queries/mutations.ts
import { useMutation, useQueryClient } from '@tanstack/react-query'

export function useUpdatePatient() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<PatientRow> }) => {
      // Write through the CRUD API which uses Drizzle against Supabase (source of truth)
      const res = await fetch(`/api/patients/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error(await res.text())
      return res.json()
    },
    onSuccess: (_, { id }) => {
      // Invalidate related queries — triggers refetch
      queryClient.invalidateQueries({ queryKey: patientKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: patientKeys.lists() })
    },
    onError: (error) => {
      toast.error(`Erro ao salvar: ${error.message}`)
    },
  })
}
```

## Optimistic Updates (instant UI feedback)

For patient edits where Sheet write is slow (~1-2s):

```typescript
export function useUpdatePatientOptimistic() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ cns, data }: { cns: CNS; data: Partial<PatientRow> }) =>
      updateSheetRow(cns, data),

    onMutate: async ({ cns, data }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: patientKeys.detail(cns) })

      // Snapshot previous value for rollback
      const previous = queryClient.getQueryData(patientKeys.detail(cns))

      // Optimistically update the cache
      queryClient.setQueryData(patientKeys.detail(cns), (old: Patient | undefined) =>
        old ? { ...old, ...data } : old
      )

      return { previous, cns }
    },

    onError: (_err, _vars, context) => {
      // Rollback on failure
      if (context?.previous) {
        queryClient.setQueryData(patientKeys.detail(context.cns), context.previous)
      }
      toast.error('Falha ao salvar — alterações revertidas')
    },

    onSettled: (_, __, { cns }) => {
      // Always refetch to ensure consistency with Sheet
      queryClient.invalidateQueries({ queryKey: patientKeys.detail(cns) })
    },
  })
}
```

## Dependent Queries (layered data loading)

Load patient list → then geocode any missing coordinates:

```typescript
function usePatientMapData(tabName: SheetTabId) {
  const patients = useQuery(patientListOptions({ layer: tabName }))

  const missingCoords = patients.data?.filter(p => !p.lat || !p.lng) ?? []

  const geocoding = useQuery({
    queryKey: ['geocode-batch', tabName, missingCoords.length],
    queryFn: () => batchGeocode(missingCoords),
    enabled: missingCoords.length > 0,  // Only runs when there's work
    staleTime: Infinity,  // Geocoded addresses don't change
  })

  return { patients, geocoding }
}
```

## Polling for Fresh Sheet Data

Background refetch at intervals for collaborative editing awareness:

```typescript
const { data } = useQuery({
  ...patientListOptions(filters),
  refetchInterval: 60_000,  // Poll every 60s for sheet changes by other users
  refetchIntervalInBackground: false,  // Don't poll when tab is hidden
})
```

## Provider Setup

```tsx
// app/providers.tsx
"use client"
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,      // 1 min default — sheet data is semi-static
        gcTime: 10 * 60 * 1000,    // 10 min garbage collection
        retry: 2,
        refetchOnWindowFocus: true, // Re-sync when user returns to tab
      },
    },
  }))

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}
```

## staleTime Guidelines for This Project

| Data type | staleTime | Rationale |
|-----------|-----------|-----------|
| Patient list from Sheet | 5 min | Sheets rarely update sub-minute; 300 reads/min rate limit |
| Patient detail | 2 min | Could be editing, need fresher data |
| Geocoded coordinates | Infinity | Address→coords never changes; Nominatim 1 req/s |
| Alert rules (config sheet) | 30 min | Rules rarely change mid-session |
| GeoJSON territories | Infinity | Static /territories/ files, never refetched |

**Provider defaults:** `staleTime: 60_000`, `gcTime: 600_000`, `retry: 2`,
`refetchOnWindowFocus: true`.

## Mutation Retry Behavior

TanStack Query does NOT retry mutations by default (unlike queries which retry 3x).
For Sheet writes this is correct — retrying could duplicate data. Only retry on
network/429 errors with idempotency checks:

```typescript
useMutation({
  mutationFn: updateSheetRow,
  retry: (failureCount, error: any) => {
    if (error.code === 429 && failureCount < 2) return true
    if (error.message?.includes('network') && failureCount < 1) return true
    return false  // Never retry 4xx validation errors
  },
  retryDelay: (attempt) => Math.pow(2, attempt) * 1000,
})
```

## NEVER

- **NEVER use string query keys** (`useQuery({ queryKey: ['patients'] })`) — use the key factory; ad-hoc strings drift and cause stale cache
- **NEVER invalidate with just `['patients']` when you only changed one** — use the hierarchical key to target precisely
- **NEVER forget `onSettled` after optimistic updates** — without it, the cache may permanently diverge from the Sheet
- **NEVER set `staleTime: 0` for sheet data** — Sheets API has rate limits (300 reads/min); aggressive refetching will 429
- **NEVER create QueryClient outside useState** in a Client Component — it would recreate on every render, losing cache
- **NEVER prefetch in a Client Component** — prefetch in Server Components or route loaders; client-side uses `useQuery`
- **NEVER use `useEffect` + `fetch` for data** — TanStack Query handles caching, dedup, races, retries, and background refetch; raw fetch does none of these
