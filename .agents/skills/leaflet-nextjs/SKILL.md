---
name: leaflet-nextjs
description: >
  Leaflet and react-leaflet v5 integration patterns for Next.js 16. Covers the ONLY correct
  dynamic import pattern, marker icon fixes, React strict mode workarounds, marker clustering
  for hundreds of patients, heatmap layers, GeoJSON territory rendering, and map state
  management with Zustand. Use when building map components, adding markers, layers, clusters,
  heatmaps, popups, or fixing map rendering issues. Triggers on: map, MapContainer, Marker,
  Leaflet, react-leaflet, GeoJSON, cluster, heatmap, "window is not defined", dynamic import,
  ssr false, marker icon, territory, microárea polygon, flyTo, layer toggle, map performance.
  Do NOT use for general Next.js patterns (use nextjs-patterns) or general styling (use
  tailwind-shadcn).
---

# Leaflet + react-leaflet v5 in Next.js 16

## The Only Correct Pattern

Leaflet requires `window`. react-leaflet v5 requires React 19. There is exactly ONE way
to make this work in Next.js 16:

### Step 1: Client Component (the map itself)

```tsx
// components/map/MapView.tsx
"use client"

import "leaflet/dist/leaflet.css"
import { MapContainer, TileLayer } from "react-leaflet"
import type { Map as LeafletMap } from "leaflet"
import { useRef } from "react"

export default function MapView() {
  const mapRef = useRef<LeafletMap>(null)

  return (
    <MapContainer
      ref={mapRef}
      center={[-30.03, -51.23]}  // Porto Alegre
      zoom={14}
      className="h-full w-full"  // MUST have explicit dimensions
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {/* Markers, layers, etc. go here as children */}
    </MapContainer>
  )
}
```

### Step 2: Dynamic Import in the Page (SSR disabled)

```tsx
// app/(dashboard)/map/page.tsx — Server Component
import dynamic from "next/dynamic"
import { MapSkeleton } from "@/components/map/MapSkeleton"

const MapView = dynamic(() => import("@/components/map/MapView"), {
  ssr: false,
  loading: () => <MapSkeleton />,
})

export default function MapPage() {
  return (
    <div className="h-[calc(100vh-64px)] w-full">
      <MapView />
    </div>
  )
}
```

**Critical:** The parent container MUST have explicit height. Leaflet renders nothing
inside a `height: auto` container.

### Step 3: CSS Import Location

Import `leaflet/dist/leaflet.css` inside the `"use client"` map component, NOT in
`globals.css` or a layout. Importing in a Server Component or global CSS breaks SSR.

## Marker Icons Fix

Default Leaflet marker icons break in Next.js because webpack mangles the image paths.

```tsx
// components/map/icons.ts
"use client"
import L from "leaflet"

// Custom icons per layer — loaded from /public/icons/
export const LAYER_ICONS = {
  gestantes: new L.Icon({
    iconUrl: "/icons/pregnant.svg",
    iconSize: [28, 36],
    iconAnchor: [14, 36],
    popupAnchor: [0, -36],
  }),
  tuberculose: new L.Icon({
    iconUrl: "/icons/tb.svg",
    iconSize: [28, 36],
    iconAnchor: [14, 36],
    popupAnchor: [0, -36],
  }),
  // ... one per layer
} as const

// Default fallback icon
export const DEFAULT_ICON = new L.Icon({
  iconUrl: "/icons/marker-default.svg",
  shadowUrl: "/icons/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})
```

## React Strict Mode: "Map container already initialized"

In development, React 19 strict mode double-renders components. Leaflet throws because
the container already has a map. Fix with a key or cleanup:

```tsx
// Option A: key forces fresh instance on remount
<MapContainer key="main-map" center={center} zoom={zoom}>

// Option B: useEffect cleanup (for complex cases)
"use client"
import { useEffect, useRef } from "react"
import L from "leaflet"

function RawMap() {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    mapRef.current = L.map(containerRef.current).setView([-30.03, -51.23], 14)
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(mapRef.current)

    return () => {
      mapRef.current?.remove()
      mapRef.current = null
    }
  }, [])

  return <div ref={containerRef} className="h-full w-full" />
}
```

## Marker Clustering (hundreds of patients)

```tsx
// components/map/PatientMarkers.tsx
"use client"
import MarkerClusterGroup from "react-leaflet-cluster"
import { Marker, Popup } from "react-leaflet"
import { useMemo } from "react"

interface Props {
  patients: PatientWithCoords[]
  icon: L.Icon
}

export function PatientMarkers({ patients, icon }: Props) {
  // useMemo prevents re-creating markers on every parent render
  const markers = useMemo(() =>
    patients.map(p => (
      <Marker key={p.cns} position={[p.lat, p.lng]} icon={icon}>
        <Popup>
          <strong>{p.nome}</strong>
          <br />CNS: {p.cns}
        </Popup>
      </Marker>
    )),
    [patients, icon]
  )

  return (
    <MarkerClusterGroup
      chunkedLoading
      maxClusterRadius={60}
      disableClusteringAtZoom={17}
      removeOutsideVisibleBounds
    >
      {markers}
    </MarkerClusterGroup>
  )
}
```

**Performance thresholds:**
- < 500 markers: react-leaflet Markers with clustering → fine
- 500-5000: MarkerClusterGroup with `chunkedLoading` → fine
- 5000+: Switch to Leaflet's Canvas renderer or raw `L.geoJSON` with `pointToLayer`

## Heatmap Layer

```tsx
// components/map/HeatmapLayer.tsx
"use client"
import { useMap } from "react-leaflet"
import { useEffect } from "react"
import L from "leaflet"
import type { HeatLayer } from "leaflet"  // See typescript-strict for module augmentation

interface Props {
  points: [number, number, number][]  // [lat, lng, intensity]
  options?: { radius?: number; blur?: number; maxZoom?: number }
}

export function HeatmapLayer({ points, options }: Props) {
  const map = useMap()

  useEffect(() => {
    let heatLayer: HeatLayer | undefined

    // Dynamic import — leaflet.heat also requires window
    import("leaflet.heat").then(() => {
      heatLayer = L.heatLayer(points, {
        radius: options?.radius ?? 25,
        blur: options?.blur ?? 15,
        maxZoom: options?.maxZoom ?? 17,
      }).addTo(map)
    })

    return () => { heatLayer?.remove() }
  }, [map, points, options])

  return null  // This component only produces side effects
}
```

**Note:** Requires module augmentation in `types/leaflet-extensions.d.ts` (see
typescript-strict skill) to avoid `any` casts.

## GeoJSON Territories (Microáreas)

```tsx
// components/map/TerritoryLayer.tsx
"use client"
import { GeoJSON } from "react-leaflet"
import type { Feature, FeatureCollection } from "geojson"
import { useMemo } from "react"

const MICROAREA_COLORS: Record<string, string> = {
  MA1: "#E91E63", MA2: "#2196F3", MA3: "#4CAF50",
  MA4: "#FF9800", MA5: "#9C27B0",
}

interface Props {
  geojson: FeatureCollection
  onMicroareaClick?: (id: string) => void
}

export function TerritoryLayer({ geojson, onMicroareaClick }: Props) {
  const style = useMemo(() => (feature?: Feature) => ({
    fillColor: MICROAREA_COLORS[feature?.properties?.id] ?? "#666",
    weight: 2,
    opacity: 0.8,
    fillOpacity: 0.2,
  }), [])

  const onEachFeature = useMemo(() => (feature: Feature, layer: L.Layer) => {
    layer.bindTooltip(feature.properties?.nome ?? "")
    layer.on("click", () => onMicroareaClick?.(feature.properties?.id))
  }, [onMicroareaClick])

  return <GeoJSON data={geojson} style={style} onEachFeature={onEachFeature} />
}
```

**For 10k+ features:** Don't use react-leaflet's `<GeoJSON>`. Use raw Leaflet:
```tsx
useEffect(() => {
  const layer = L.geoJSON(hugeGeojson, { style, onEachFeature }).addTo(map)
  return () => { layer.remove() }
}, [map, hugeGeojson])
```

## Map State Management

**Why Zustand over useState for map state:** Layer toggles in the sidebar should NOT
re-render the 500-marker map. Zustand selectors (`useMapStore(s => s.activeLayers)`)
prevent cascading re-renders. See `zustand-store` skill for full store implementation.

## Programmatic Map Control

```tsx
// components/map/MapController.tsx — child of MapContainer
"use client"
import { useMap } from "react-leaflet"
import { useEffect } from "react"
import { useMapStore } from "@/stores/mapStore"

export function MapController() {
  const map = useMap()
  const selectedCns = useMapStore(s => s.selectedPatientCns)

  useEffect(() => {
    if (selectedCns) {
      // Get patient coords and fly to them
      const coords = getPatientCoords(selectedCns)
      if (coords) map.flyTo(coords, 17, { duration: 0.5 })
    }
  }, [map, selectedCns])

  return null
}
```

`useMap()` only works inside `<MapContainer>` children. For external control, use
the Zustand store as a message bus.

## Map Troubleshooting Decision Tree

**Map renders nothing (blank area):**
1. Container has no explicit height → add `h-[calc(100vh-64px)]` or similar
2. `ssr: false` missing on dynamic import → map code ran on server, failed silently
3. Leaflet CSS not imported → import `"leaflet/dist/leaflet.css"` in the `"use client"` component

**"window is not defined" / "ReferenceError":**
1. Leaflet imported in a Server Component → move to `"use client"` file
2. `import L from 'leaflet'` at top of a page file → use dynamic import
3. A dependency of your map component imports leaflet at module level

**"Map container is already initialized":**
1. React strict mode double-render → add `key="main-map"` to `MapContainer`
2. HMR in dev mode (Next.js 16 + Turbopack) → known issue, add key or
   wrap in useEffect with cleanup: `return () => { mapRef.current?.remove() }`

**Markers have no icon (broken image):**
1. Default Leaflet icons use webpack-resolved paths that break in Next.js
2. Fix: use custom `L.Icon` with explicit `/public/icons/` URLs (see icons section)

**"Cannot read properties of undefined (reading 'appendChild')" on HMR:**
1. Leaflet's internal DOM reference is stale after hot reload
2. Fix: add `key={Date.now()}` to MapContainer during development only

## NEVER

- **NEVER import `leaflet` or `react-leaflet` in a file without `"use client"`** — they access `window` at import time
- **NEVER import `leaflet/dist/leaflet.css` in globals.css or a layout** — import inside the `"use client"` map component only
- **NEVER forget explicit width + height on the map container** — Leaflet renders nothing inside `height: auto`
- **NEVER store a Leaflet Map instance in React state** — causes infinite re-renders; use `useRef`
- **NEVER use react-leaflet `<GeoJSON>` for 10k+ features** — use raw `L.geoJSON` on the map instance
- **NEVER try to use `useMap()` outside `<MapContainer>` children** — it reads from react-leaflet's context
- **NEVER import `L` (leaflet) at module top-level in a page file** — even with dynamic import of the component, the top-level `import L` kills SSR
- **NEVER skip `useMemo` for marker arrays** — without it, every parent state change recreates all markers
- **NEVER omit `removeOutsideVisibleBounds` on MarkerClusterGroup** — without it, off-screen clusters consume memory
