---
name: typescript-strict
description: >
  TypeScript strict-mode patterns for this health monitoring project. Covers branded types
  for domain IDs (CNS, TabId), discriminated unions for state/alerts, exhaustive switches,
  Zod runtime validation for sheet data, const assertions, satisfies operator, and module
  augmentation for Leaflet. Use when writing types, interfaces, models, or any TypeScript
  code in this project. Triggers on: type definition, interface, branded type, discriminated
  union, type guard, type narrowing, Zod schema, enum question, as cast, any type, unknown,
  satisfies, const assertion, template literal type. Do NOT use for React component patterns
  (use nextjs-patterns) or state management types (use tanstack-query or zustand-store).
---

# TypeScript Strict Patterns

## Branded Types for Domain IDs

Prevent accidentally passing a raw string where a CNS, tab name, or microárea ID is expected:

```typescript
// types/branded.ts
declare const __brand: unique symbol
type Brand<T, B extends string> = T & { readonly [__brand]: B }

export type CNS = Brand<string, 'CNS'>              // 15-digit patient ID
export type SheetTabId = Brand<string, 'SheetTab'>  // Google Sheet tab name
export type MicroareaId = Brand<string, 'Microarea'> // e.g. "MA1", "MA2"
export type LatLng = Brand<[number, number], 'LatLng'>

// Constructor with validation
export function toCNS(value: string): CNS {
  if (!/^\d{15}$/.test(value)) throw new Error(`Invalid CNS: ${value}`)
  return value as CNS
}

export function toSheetTabId(value: string): SheetTabId {
  return value as SheetTabId
}
```

**Why:** A function expecting `CNS` won't accept a plain `string` — the compiler catches
mix-ups between patient ID, phone number, and other string-shaped data.

## Discriminated Unions for State

Model every async state and domain categorization as a discriminated union:

```typescript
// Async data state — NOT optional fields on one interface
type AsyncState<T> =
  | { status: 'idle' }
  | { status: 'loading'; retryCount: number }
  | { status: 'success'; data: T; fetchedAt: number }
  | { status: 'error'; error: Error; retryCount: number }

// Alert categories — the compiler knows which fields exist per state
type AlertResult =
  | { category: 'critico'; score: number; alerts: CriticalAlert[] }
  | { category: 'atencao'; score: number; alerts: AttentionAlert[] }
  | { category: 'normal'; score: 0; alerts: [] }

// Layer data — each tab has different specific fields
type LayerData =
  | { type: 'gestantes'; patients: Gestante[] }
  | { type: 'tuberculose'; patients: TBPatient[] }
  | { type: 'diabetes'; patients: DMPatient[] }
  | { type: 'hipertensao'; patients: HASPatient[] }
```

## Exhaustive Switch with `never`

Ensure all cases are handled. Adding a new alert operator or layer type triggers compile errors:

```typescript
type AlertOperator = '>' | '<' | '>=' | '<=' | '=' | '!=' | 'older_than_days' | 'is_empty'

function evaluateRule(operator: AlertOperator, value: unknown, threshold: unknown): boolean {
  switch (operator) {
    case '>': return Number(value) > Number(threshold)
    case '<': return Number(value) < Number(threshold)
    case '>=': return Number(value) >= Number(threshold)
    case '<=': return Number(value) <= Number(threshold)
    case '=': return value === threshold
    case '!=': return value !== threshold
    case 'older_than_days': return daysSince(value as string) > Number(threshold)
    case 'is_empty': return value == null || value === ''
    default: {
      const _exhaustive: never = operator  // Compile error if case missed
      throw new Error(`Unknown operator: ${_exhaustive}`)
    }
  }
}
```

## Const Objects over Enums

Enums generate runtime code and aren't tree-shakeable. Use const objects:

```typescript
// BAD — enum generates runtime JavaScript object
enum UrgencyLevel { CRITICO = 'critico', ATENCAO = 'atencao', NORMAL = 'normal' }

// GOOD — zero runtime cost, fully type-safe
const URGENCY = {
  CRITICO: 'critico',
  ATENCAO: 'atencao',
  NORMAL: 'normal',
} as const

type UrgencyCategory = typeof URGENCY[keyof typeof URGENCY]
// = 'critico' | 'atencao' | 'normal'
```

## `satisfies` for Configuration

Validates a config object against a type WITHOUT widening it (preserves literal types):

```typescript
type LayerConfig = {
  icon: string
  color: string
  visibleColumns: string[]
}

// BAD — as const loses type checking; explicit type annotation loses literals
const config: Record<string, LayerConfig> = { /* loses autocomplete on keys */ }

// GOOD — validates shape AND preserves literal types for autocomplete
const LAYER_CONFIG = {
  gestantes: { icon: '/icons/pregnant.svg', color: '#E91E63', visibleColumns: ['nome', 'dum', 'dpp'] },
  tuberculose: { icon: '/icons/tb.svg', color: '#FF9800', visibleColumns: ['nome', 'baciloscopia'] },
} as const satisfies Record<string, LayerConfig>

// Now LAYER_CONFIG.gestantes.color is '#E91E63' (literal), not string
```

## Zod for Sheet Data Validation (Parse, Don't Validate)

Google Sheets returns `string[][]`. Parse into typed objects with Zod:

```typescript
import { z } from 'zod'

const PatientRowSchema = z.object({
  nome: z.string().min(1),
  cns: z.string().regex(/^\d{15}$/).transform(toCNS),
  dataNascimento: z.string().pipe(z.coerce.date()),
  telefone: z.string().optional().default(''),
  rua: z.string(),
  numero: z.string(),
  microarea: z.string().transform(v => v as MicroareaId),
})

type PatientRow = z.infer<typeof PatientRowSchema>

// Usage: parse raw sheet row into typed object
function parseSheetRow(headers: string[], row: string[]): PatientRow {
  const raw = Object.fromEntries(headers.map((h, i) => [h, row[i] ?? '']))
  return PatientRowSchema.parse(raw)  // Throws ZodError on invalid data
}
```

## Type Guards

```typescript
// Custom type guard — narrows inside if blocks
function isCriticalAlert(alert: AlertResult): alert is Extract<AlertResult, { category: 'critico' }> {
  return alert.category === 'critico'
}

// In operator narrowing
function hasCoordinates(patient: PatientBase): patient is PatientBase & { lat: number; lng: number } {
  return 'lat' in patient && 'lng' in patient && patient.lat !== null
}
```

## Module Augmentation for Leaflet

Extend Leaflet types for plugins (heatmap, markercluster):

```typescript
// types/leaflet-extensions.d.ts
import 'leaflet'

declare module 'leaflet' {
  function heatLayer(
    latlngs: Array<[number, number, number?]>,
    options?: HeatLayerOptions
  ): HeatLayer

  interface HeatLayerOptions {
    minOpacity?: number
    maxZoom?: number
    radius?: number
    blur?: number
    gradient?: Record<number, string>
  }

  interface HeatLayer extends Layer {
    setLatLngs(latlngs: Array<[number, number, number?]>): this
    addLatLng(latlng: [number, number, number?]): this
  }
}
```

## Which Pattern to Use (Decision Framework)

**Before defining a type, ask yourself:**

1. Is this an identifier that could be confused with other strings?
   → **Branded type** (CNS, SheetTabId, MicroareaId)

2. Does this have mutually exclusive states or shapes?
   → **Discriminated union** (loading/success/error, alert categories, layer types)

3. Does this data arrive from an untrusted boundary (Sheets API, URL params, user input)?
   → **Zod schema at the entry point** — parse, don't validate

4. Is this a configuration object with known literal values?
   → **`as const satisfies Type`** — validates shape without widening literals

5. Do I need to add methods/properties to a third-party library's types?
   → **Module augmentation** (Leaflet plugins, custom hooks)

## NEVER

- **NEVER use `any`** — use `unknown` + type guard; `any` disables the compiler entirely and propagates unsafety to callers
- **NEVER use `as` without a preceding runtime check** — it's a lie to the compiler; if you need to cast, the type model is wrong
- **NEVER use `enum`** — use `as const` object + derived union type; enums aren't tree-shakeable and have quirky reverse mappings
- **NEVER use `string` for domain identifiers** — use branded types (CNS, SheetTabId, MicroareaId); prevents cross-contamination bugs
- **NEVER use optional fields to model state machines** — use discriminated unions; optional fields allow impossible states
- **NEVER forget `satisfies` for config objects** — plain `as const` doesn't validate shape; explicit type annotation loses literals
- **NEVER suppress `@ts-ignore` without a comment explaining WHY** — prefer `@ts-expect-error` with explanation (fails if the error disappears)
- **NEVER use `object` or `Function` types** — use `Record<string, unknown>` or specific function signatures
- **NEVER trust data from Google Sheets without Zod validation** — sheets return `unknown[][]`; parse into typed objects at the boundary
