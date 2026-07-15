# Next.js 16 — Findings & Gotchas

## proxy.ts Location

`proxy.ts` MUST be at one of these paths:
- `src/proxy.ts` ✅
- `proxy.ts` (project root) ✅
- `src/app/proxy.ts` ❌ WRONG — will be silently ignored

The Next.js internals check for `/proxy` or `/src/proxy` page paths specifically.

## Server Components Cannot Pass Functions to Client Components

```tsx
// ❌ This crashes with: "Event handlers cannot be passed to Client Component props"
// src/app/(dashboard)/settings/page.tsx (Server Component by default)
export default function SettingsPage() {
  return <SpreadsheetConfig onSave={(id) => console.log(id)} />;
}

// ✅ Fix: add "use client" to the page
"use client";
export default function SettingsPage() {
  return <SpreadsheetConfig onSave={(id) => console.log(id)} />;
}
```

**Rule:** If a page passes callback props to a Client Component, the page itself
must also be `"use client"`.

## Turbopack and tsconfig Changes

When you first run `next dev --turbopack`, it may auto-modify `tsconfig.json`:
- Adds `.next/dev/types/**/*.ts` to `include`
- Changes `jsx` to `react-jsx`

This is expected and should be committed.

## Route Groups and Layouts

- `(auth)` group: login page, no layout protection needed
- `(dashboard)` group: all protected pages, shares dashboard layout

The proxy.ts checks `pathname.startsWith("/settings")` etc. — it matches the
URL path, NOT the route group name.

## Dynamic Import for Leaflet (Future)

Leaflet requires `window`. Always use:
```tsx
const MapView = dynamic(() => import('@/components/map/MapView'), { ssr: false });
```
