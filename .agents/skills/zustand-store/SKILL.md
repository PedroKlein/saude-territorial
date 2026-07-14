---
name: zustand-store
description: >
  Zustand v5 state management patterns for this Next.js 16 map application. Covers store
  design for UI state (layer toggles, selected patient, sidebar), slice pattern for large
  stores, Next.js App Router provider pattern, selectors to prevent re-renders, persist
  middleware for user preferences, and the boundary between Zustand (client UI state) vs
  TanStack Query (server/async state). Triggers on: Zustand, store, create, useStore,
  client state, UI state, layer toggle, selected patient, sidebar state, persist, selector,
  slice, shallow compare, subscribe, global state. Do NOT use for async data fetching
  (use tanstack-query) or component-local state (just use useState).
---

# Zustand v5 Store Patterns

## When to Use Zustand

Zustand is for **UI-only state** that doesn't come from an API and doesn't belong in the URL.
If it comes from a server → TanStack Query. If it should be shareable via URL → `searchParams`.

## Store Design Principle

**Before adding state to a store, ask:** Would this state be the same for all users
viewing the same page? If yes → it's server state (TanStack Query). If it's
user-specific UI preference → Zustand.

For this project: active layers, selected patient, sidebar open/closed, map zoom — all Zustand.
Patient data, sheet contents, geocoded coords — all TanStack Query.

## Basic Store (Zustand v5)

```typescript
// stores/mapStore.ts
import { create } from 'zustand'  // v5: named export only, no default

interface MapState {
  // State
  activeLayers: Set<string>
  selectedPatientCns: string | null
  sidebarOpen: boolean

  // Actions
  toggleLayer: (layerId: string) => void
  selectPatient: (cns: string | null) => void
  setSidebarOpen: (open: boolean) => void
  reset: () => void
}

const initialState = {
  activeLayers: new Set(['gestantes', 'territories']),
  selectedPatientCns: null,
  sidebarOpen: true,
}

export const useMapStore = create<MapState>((set) => ({
  ...initialState,

  toggleLayer: (layerId) => set((state) => {
    const next = new Set(state.activeLayers)
    next.has(layerId) ? next.delete(layerId) : next.add(layerId)
    return { activeLayers: next }
  }),

  selectPatient: (cns) => set({ selectedPatientCns: cns }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  reset: () => set(initialState),
}))
```

## Selectors: Prevent Re-renders

Every component should select ONLY what it needs:

```typescript
// BAD — re-renders on ANY store change
function Sidebar() {
  const store = useMapStore()  // subscribes to everything
}

// GOOD — re-renders only when sidebarOpen changes
function Sidebar() {
  const open = useMapStore((s) => s.sidebarOpen)
}

// GOOD — multiple values with useShallow (Zustand v5)
import { useShallow } from 'zustand/shallow'

function LayerPanel() {
  const { activeLayers, toggleLayer } = useMapStore(
    useShallow((s) => ({ activeLayers: s.activeLayers, toggleLayer: s.toggleLayer }))
  )
}
```

## Slice Pattern for Large Stores

Split store into domain slices that compose into one store:

```typescript
// stores/slices/layerSlice.ts
import type { StateCreator } from 'zustand'

export interface LayerSlice {
  activeLayers: Set<string>
  layerOpacity: Record<string, number>
  toggleLayer: (id: string) => void
  setOpacity: (id: string, opacity: number) => void
}

export const createLayerSlice: StateCreator<LayerSlice & FilterSlice, [], [], LayerSlice> = (set) => ({
  activeLayers: new Set(['gestantes', 'territories']),
  layerOpacity: {},
  toggleLayer: (id) => set((s) => {
    const next = new Set(s.activeLayers)
    next.has(id) ? next.delete(id) : next.add(id)
    return { activeLayers: next }
  }),
  setOpacity: (id, opacity) => set((s) => ({
    layerOpacity: { ...s.layerOpacity, [id]: opacity }
  })),
})

// stores/slices/filterSlice.ts
export interface FilterSlice {
  microareaFilter: string | null
  urgencyFilter: UrgencyCategory | null
  setMicroareaFilter: (ma: string | null) => void
  setUrgencyFilter: (cat: UrgencyCategory | null) => void
}

export const createFilterSlice: StateCreator<LayerSlice & FilterSlice, [], [], FilterSlice> = (set) => ({
  microareaFilter: null,
  urgencyFilter: null,
  setMicroareaFilter: (ma) => set({ microareaFilter: ma }),
  setUrgencyFilter: (cat) => set({ urgencyFilter: cat }),
})

// stores/appStore.ts — compose slices
import { create } from 'zustand'
import { createLayerSlice, type LayerSlice } from './slices/layerSlice'
import { createFilterSlice, type FilterSlice } from './slices/filterSlice'

type AppStore = LayerSlice & FilterSlice

export const useAppStore = create<AppStore>()((...a) => ({
  ...createLayerSlice(...a),
  ...createFilterSlice(...a),
}))
```

## Next.js App Router: Store Isolation

**Decision rule:** For pure client-side UI state (layer toggles, sidebar, selected patient),
simple `create()` is fine — these components are always `"use client"` and never render
on the server. Only use the provider pattern if a store must be initialized from
server-side data (e.g., user preferences loaded in a Server Component).

```tsx
// Simple approach (preferred for UI state):
import { create } from 'zustand'
export const useMapStore = create<MapState>((set) => ({ ... }))

// Provider approach (only when store needs server-side initialization):
// See Next.js Zustand guide for createStore + context pattern
```

## Hydration Mismatch (persist + SSR)

The `persist` middleware reads from `localStorage` only client-side. On first render,
the server has no localStorage → hydration mismatch. Fix:

```typescript
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export const usePrefsStore = create<PrefsState>()(
  persist(
    (set) => ({ /* ... */ }),
    {
      name: 'saude-territorial-prefs',
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,  // Don't hydrate automatically
    }
  )
)

// Then in your layout's client component:
"use client"
import { useEffect } from 'react'
import { usePrefsStore } from '@/stores/prefsStore'

export function HydrateStores() {
  useEffect(() => {
    usePrefsStore.persist.rehydrate()  // Only hydrate client-side
  }, [])
  return null
}
```

**Why:** Without `skipHydration`, the first render uses localStorage values that
the server didn't have → React hydration error. With it, the store starts with
default values (matching server), then rehydrates after mount.

## Persist Middleware (user preferences)

**Critical:** `Set` and `Map` are NOT JSON-serializable. `JSON.stringify(new Set([1,2]))` → `"{}"`.
Always convert to Array in `partialize`:

```typescript
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export const usePrefsStore = create<PrefsState>()(
  persist(
    (set) => ({
      defaultLayers: new Set(['gestantes', 'territories']),
      mapCenter: [-30.03, -51.23] as [number, number],
      mapZoom: 14,
      setDefaultLayers: (layers) => set({ defaultLayers: layers }),
      setMapView: (center, zoom) => set({ mapCenter: center, mapZoom: zoom }),
    }),
    {
      name: 'saude-territorial-prefs',
      storage: createJSONStorage(() => localStorage, {
        // Custom reviver to restore Sets from arrays
        reviver: (key, value) =>
          key === 'defaultLayers' && Array.isArray(value) ? new Set(value) : value,
        replacer: (key, value) =>
          value instanceof Set ? [...value] : value,
      }),
      partialize: (state) => ({
        defaultLayers: state.defaultLayers,
        mapCenter: state.mapCenter,
        mapZoom: state.mapZoom,
      }),
    }
  )
)
```

## Subscribe for Side Effects (outside React)

```typescript
// Sync active layers to URL without re-rendering
useAppStore.subscribe(
  (state) => state.activeLayers,
  (activeLayers) => {
    const url = new URL(window.location.href)
    url.searchParams.set('layers', [...activeLayers].join(','))
    window.history.replaceState(null, '', url)
  }
)
```

## NEVER

- **NEVER put async/server data in Zustand** — use TanStack Query for anything from an API; Zustand is for client UI state only
- **NEVER subscribe to the entire store** (`useMapStore()` with no selector) — every state change re-renders the component
- **NEVER use default imports** — Zustand v5 dropped them; use `import { create } from 'zustand'`
- **NEVER define stores as global `const` if the component tree renders on the server** — use the provider pattern to avoid cross-request state leakage
- **NEVER store derived/computed data** — compute it in the selector: `useMapStore(s => s.patients.filter(...))`
- **NEVER mutate state directly** — always return new objects from `set()`; for deep updates use Immer middleware
- **NEVER persist a `Set` without a custom serializer** — `JSON.stringify(new Set())` produces `{}`, silently losing data; store layers as `string[]` in the persisted slice, convert to Set in selectors
- **NEVER use Zustand for data that belongs in the URL** (filters, pagination, tab selection) — use `searchParams` so users can share/bookmark
