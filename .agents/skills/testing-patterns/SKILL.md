---
name: testing-patterns
description: >
  Testing patterns for this Next.js 16 + Leaflet + Google Sheets health monitoring app.
  Covers Vitest setup, mocking Google Sheets API (googleapis), testing Leaflet components
  (can't use jsdom — mock react-leaflet entirely), testing alert/urgency rule engine with
  synthetic data, Zod schema boundary tests, and testing Server Actions. Use when writing
  tests, setting up test infrastructure, mocking external APIs, or debugging test failures.
  Triggers on: test, Vitest, describe, it, expect, mock, vi.mock, vi.fn, testing, coverage,
  unit test, integration test, mock sheets, test alert, test urgency, test map, Playwright.
  Do NOT use for TDD methodology (use the tdd skill) or general test mechanics (use
  go-testing for Go projects).
---

# Testing Patterns

## Testing Strategy for This Project

| Layer | Tool | What to test |
|-------|------|------|
| Alert/urgency engine | Vitest (unit) | Pure functions, easy — no mocking needed |
| Zod schemas | Vitest (unit) | Boundary parsing — valid/invalid sheet rows |
| Sheets data layer | Vitest (integration) | Mock googleapis, test column mapping logic |
| Route handlers | Vitest (integration) | Mock auth + sheets, test HTTP responses |
| Map components | Vitest (mock react-leaflet) | Behavior only — mock the map entirely |
| Full flows | Playwright (E2E) | Auth → map → edit → save (later milestone) |

## Vitest Config

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    coverage: { provider: 'v8', include: ['src/lib/**', 'src/stores/**'] },
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
})
```

## Testing Google Sheets API

`googleapis` uses a builder pattern that's hard to spy on. Mock the entire module.
Define `mockAuth` for all Sheet tests:

```typescript
// tests/mocks/auth.ts
export const mockAuth = { credentials: { access_token: 'fake-test-token' } }
```

```typescript
// tests/mocks/googleapis.ts
import { vi } from 'vitest'

export const mockSheetValues = {
  get: vi.fn(),
  batchGet: vi.fn(),
  update: vi.fn(),
  batchUpdate: vi.fn(),
}

export const mockSheets = {
  spreadsheets: {
    get: vi.fn(),
    values: mockSheetValues,
  },
}

vi.mock('googleapis', () => ({
  google: {
    sheets: () => mockSheets,
    auth: { OAuth2: vi.fn() },
  },
}))
```

Usage in tests:

```typescript
// tests/lib/sheets/client.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { mockSheetValues } from '../../mocks/googleapis'
import { fetchTabData } from '@/lib/sheets/client'

describe('fetchTabData', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('maps Portuguese headers to typed fields', async () => {
    mockSheetValues.get.mockResolvedValue({
      data: {
        values: [
          ['Nome completo', 'CNS', 'Rua', 'Número', 'DUM'],  // Header row
          ['Maria Silva', '123456789012345', 'Rua Flores', '100', '2024-01-15'],
        ],
      },
    })

    const result = await fetchTabData(mockAuth, 'spreadsheet-id', 'Gestantes')
    expect(result[0].nomeCompleto).toBe('Maria Silva')
    expect(result[0].cns).toBe('123456789012345')
  })

  it('handles missing optional columns gracefully', async () => {
    mockSheetValues.get.mockResolvedValue({
      data: { values: [['Nome', 'CNS'], ['Ana', '111222333444555']] },
    })

    const result = await fetchTabData(mockAuth, 'id', 'Gestantes')
    expect(result[0].telefone).toBe('')  // Default empty
  })
})
```

## Testing the Alert/Urgency Engine (Pure Functions)

No mocking needed — pure functions are the easiest to test:

```typescript
// tests/lib/alerts/urgency.test.ts
import { describe, it, expect } from 'vitest'
import { computeUrgency } from '@/lib/alerts/urgencyEngine'
import { SYNTHETIC_GESTANTE } from '../../fixtures/patients'

describe('computeUrgency', () => {
  it('returns critico for reactive TR', () => {
    const patient = { ...SYNTHETIC_GESTANTE, exames: { resultadoTR: 'Reagente' } }
    const result = computeUrgency(patient)
    expect(result.category).toBe('critico')
    expect(result.score).toBeGreaterThanOrEqual(50)
    expect(result.alerts).toContainEqual(
      expect.objectContaining({ code: 'TR_REAGENTE', type: 'critical' })
    )
  })

  it('returns normal when all checks pass', () => {
    const result = computeUrgency(SYNTHETIC_GESTANTE)  // healthy defaults
    expect(result.category).toBe('normal')
    expect(result.alerts).toHaveLength(0)
  })

  it('accumulates score from multiple factors', () => {
    const patient = {
      ...SYNTHETIC_GESTANTE,
      avaliacaoOdonto: 'Não realizada',
      vacinaDTpa: 'Não realizada',
      consultas: { ...SYNTHETIC_GESTANTE.consultas, visitasDomiciliares: 0 },
    }
    const result = computeUrgency(patient)
    expect(result.category).toBe('atencao')
    expect(result.alerts.length).toBeGreaterThanOrEqual(3)
  })
})
```

## Testing Zod Schemas (Boundary Validation)

```typescript
// tests/lib/sheets/schemas.test.ts
import { describe, it, expect } from 'vitest'
import { PatientRowSchema } from '@/lib/sheets/schemas'

describe('PatientRowSchema', () => {
  it('parses valid row', () => {
    const raw = { nome: 'Maria', cns: '123456789012345', dataNascimento: '1990-05-15' }
    const result = PatientRowSchema.safeParse(raw)
    expect(result.success).toBe(true)
  })

  it('rejects invalid CNS (not 15 digits)', () => {
    const raw = { nome: 'Maria', cns: '12345', dataNascimento: '1990-05-15' }
    const result = PatientRowSchema.safeParse(raw)
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].path).toContain('cns')
  })

  it('coerces date strings to Date objects', () => {
    const raw = { nome: 'Maria', cns: '123456789012345', dataNascimento: '1990-05-15' }
    const result = PatientRowSchema.parse(raw)
    expect(result.dataNascimento).toBeInstanceOf(Date)
  })

  it('handles empty optional fields with defaults', () => {
    const raw = { nome: 'Maria', cns: '123456789012345', dataNascimento: '1990-05-15', telefone: '' }
    const result = PatientRowSchema.parse(raw)
    expect(result.telefone).toBe('')
  })
})
```

## Testing Map Components (Mock react-leaflet)

Leaflet requires a real DOM — it cannot run in jsdom. Mock the entire library:

```typescript
// tests/mocks/react-leaflet.ts
import { vi } from 'vitest'

vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: any) => <div data-testid="map">{children}</div>,
  TileLayer: () => <div data-testid="tile-layer" />,
  Marker: ({ children, position }: any) => (
    <div data-testid="marker" data-position={JSON.stringify(position)}>{children}</div>
  ),
  Popup: ({ children }: any) => <div data-testid="popup">{children}</div>,
  GeoJSON: ({ data }: any) => <div data-testid="geojson" data-features={data?.features?.length} />,
  useMap: () => ({ flyTo: vi.fn(), setView: vi.fn(), getZoom: () => 14 }),
  useMapEvents: vi.fn(),
}))

vi.mock('react-leaflet-cluster', () => ({
  default: ({ children }: any) => <div data-testid="cluster">{children}</div>,
}))
```

Then test behavior, not rendering:

```typescript
// tests/components/map/PatientMarkers.test.tsx
import { render, screen } from '@testing-library/react'
import '../../mocks/react-leaflet'
import { PatientMarkers } from '@/components/map/PatientMarkers'

describe('PatientMarkers', () => {
  it('renders a marker for each patient with coordinates', () => {
    const patients = [
      { cns: '111', nome: 'Ana', lat: -30.03, lng: -51.2 },
      { cns: '222', nome: 'Beto', lat: -30.04, lng: -51.1 },
    ]
    render(<PatientMarkers patients={patients} icon={mockIcon} />)
    expect(screen.getAllByTestId('marker')).toHaveLength(2)
  })

  it('skips patients without coordinates', () => {
    const patients = [
      { cns: '111', nome: 'Ana', lat: -30.03, lng: -51.2 },
      { cns: '333', nome: 'Carlos', lat: null, lng: null },
    ]
    render(<PatientMarkers patients={patients} icon={mockIcon} />)
    expect(screen.getAllByTestId('marker')).toHaveLength(1)
  })
})
```

## Synthetic Test Fixtures

```typescript
// tests/fixtures/patients.ts
// SYNTHETIC DATA — not real patients
export const SYNTHETIC_GESTANTE = {
  id: 'test-1',
  nome: 'PACIENTE_TESTE_01',         // CLEARLY synthetic — not a real name
  cns: '000000000000001' as CNS,    // Invalid check digit — clearly fake
  dataNascimento: '1990-05-15',
  telefone: '(00) 00000-0001',       // 00 prefix = clearly fake
  endereco: { rua: 'Rua Teste Fictícia', numero: '100', lat: -30.03, lng: -51.23 },
  microarea: 'MA1',
  isPuerpera: false,
  isExposta: false,
  consultas: {
    dum: '2024-06-01',
    dpp: '2025-03-08',
    dataUltimaConsulta: new Date(Date.now() - 7 * 86400000).toISOString(), // 7 days ago
    numeroConsultas: 4,
    pressaoArterial: '120/80',
    acompanhamentoPesoAltura: 'Em dia',
    visitasDomiciliares: 2,
  },
  exames: {
    trPrimeiroTrimestre: 'Feito',
    trSegundoTrimestre: 'Feito',
    trTerceiroTrimestre: 'Não Feito',
    resultadoTR: 'Não Reagente',
  },
  avaliacaoOdonto: 'Realizada',
  vacinaDTpa: 'Realizada',
}
```

## QueryClientProvider Test Wrapper

TanStack Query hooks require a provider. Use this utility in all hook tests:

```typescript
// tests/utils/query-wrapper.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

export function createTestWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

// Usage with renderHook:
import { renderHook } from '@testing-library/react'
import { createTestWrapper } from '../utils/query-wrapper'

it('fetches patient data', async () => {
  const { result } = renderHook(() => usePatientData('Gestantes'), {
    wrapper: createTestWrapper(),
  })
  await waitFor(() => expect(result.current.isSuccess).toBe(true))
})
```

## NEVER

- **NEVER import real `leaflet` in unit tests** — it requires a real DOM and will throw `window is not defined`; mock the entire `react-leaflet` module
- **NEVER use real patient data in test fixtures** — always synthetic (see lgpd-guard skill)
- **NEVER test implementation details of the map** (exact pixel positions, tile loading) — test behavior (markers rendered, popup content, layer visibility)
- **NEVER skip testing the column mapping logic** — it's the most bug-prone part; one header rename in the sheet breaks the entire layer
- **NEVER mock Zod schemas in tests** — test them against real-shaped data; they ARE your validation layer
- **NEVER test TanStack Query hooks without wrapping in `QueryClientProvider`** — use a test utility that creates a fresh `QueryClient` per test
- **NEVER assert on exact urgency scores** — assert on category and alert codes; scores may change as weights are tuned

## Browser/E2E Testing (Playwright + agent_browser)

Unit tests don't catch: unstyled pages, hydration errors, broken OAuth flows, or
missing route protection. Use browser testing to verify the assembled app works.

### agent_browser (quick visual checks)

Use for: page renders, elements exist, screenshots, single interactions.
Always use **batch mode** (sessions get lost between individual calls).

```jsonc
// Authenticated check
{ "args": ["--state", ".auth-state.json", "batch"], "sessionMode": "fresh",
  "stdin": "[[\"open\",\"http://localhost:3000/settings\"],[\"wait\",\"2000\"],[\"snapshot\",\"-i\"]]" }
```

Generate auth state: `mise run dev:auth`

### Custom Playwright Scripts (complex flows)

Use for: multi-step forms, assertions with logic, cross-page state verification.

```javascript
// scripts/test-my-flow.mjs
import { chromium } from '@playwright/test';
import { readFileSync } from 'fs';

const storageState = JSON.parse(readFileSync('.auth-state.json', 'utf-8'));
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ storageState });
const page = await context.newPage();

await page.goto('http://localhost:3000/settings');
// ... assertions
await browser.close();
```

Both use the same `.auth-state.json` for authentication.

See `TESTING.md` for full patterns and decision guide.
