---
name: sheets-data-layer
description: >
  Google Sheets API v4 integration patterns for this project. Sheets is the source of truth
  for all patient data. Covers column mapping from Portuguese headers, the write-then-cache
  pattern (write Sheet → update Supabase), batch reads, rate limiting (300 reads/min, 60
  writes/min), conflict detection, tab-to-layer auto-discovery, and error handling. Use when
  reading/writing patient data, mapping sheet columns, handling Sheet API errors, or designing
  the data sync layer. Triggers on: Google Sheets, spreadsheet, sheet tab, column mapping,
  batchGet, batchUpdate, rate limit, 429, Sheet API, values.get, values.update, header row,
  write-then-cache, sync, column header, Portuguese field. Do NOT use for geocoding cached
  data (use geospatial) or Supabase schema design (use supabase-patterns).
---

# Google Sheets Data Layer

## Core Architecture Principle

```
Google Sheets = Source of Truth
    ↕ OAuth on-behalf (user's access token from Better Auth)
Next.js Route Handlers (API layer)
    ↕
Supabase (cache: geocoded coords, alert results, sync metadata)
    ↕
Client (TanStack Query → map + panels)
```

**Write Rule:** On edit → write to Google Sheets → if success → update Supabase cache.
NEVER write to cache without Sheet confirmation. Sheet write failure = operation failed.

## Tab-to-Layer Mapping

Each spreadsheet tab is auto-discovered as a map layer. The header row (row 1) defines
the schema. Known tabs:

| Tab Name | Entity | Specific Fields |
|----------|--------|----------------|
| Gestantes | Patient | DUM, DPP, Risco, IG |
| Tuberculose | Patient | Baciloscopia, TRM, Cultura, Forma Clínica |
| DM | Patient | PMDID |
| HAS | Patient | Data última consulta |
| Domiciliados Acamados | Patient | Vacinas, Status Visita |
| PSE | School | Nome escola, INEP, Ações |
| ILPI | Institution | Nome local, Atividades |

**Shared patient columns** (all patient tabs): Data última atualização, Nome, CNS,
Data Nascimento, Idade, Telefone, Rua, Número, Complemento, Microárea.

## Column Mapping (Portuguese Headers → TypeScript)

```typescript
// lib/sheets/columnMap.ts
import type { SheetTabId } from '@/types/branded'

// Base columns shared across all patient tabs
const BASE_COLUMN_MAP = {
  'Data última atualização': 'dataUltimaAtualizacao',
  'Nome completo': 'nomeCompleto',
  'Nome': 'nomeCompleto',  // Alias — some tabs use shorter header
  'CNS': 'cns',
  'Data de Nascimento': 'dataNascimento',
  'Idade': 'idade',
  'Telefone': 'telefone',
  'Rua': 'rua',
  'Número': 'numero',
  'Complemento': 'complemento',
  'Microárea': 'microarea',
} as const satisfies Record<string, string>

// Tab-specific columns
const GESTANTES_COLUMNS = {
  ...BASE_COLUMN_MAP,
  'DUM': 'dum',
  'DPP': 'dpp',
  'IG (semanas)': 'ig',
  'Risco': 'risco',
  'Avaliação Odontológica': 'avaliacaoOdonto',
  'DTpa': 'vacinaDTpa',
} as const

// Resolve column index from header row
function buildColumnIndex(headers: string[], columnMap: Record<string, string>) {
  const index = new Map<string, number>()
  for (let i = 0; i < headers.length; i++) {
    const fieldName = columnMap[headers[i].trim()]
    if (fieldName) index.set(fieldName, i)
  }
  return index
}
```

## Batch Read (Efficient Multi-Tab Loading)

```typescript
// lib/sheets/client.ts
import { google } from 'googleapis'

async function batchGetTabs(
  auth: OAuth2Client,
  spreadsheetId: string,
  tabNames: SheetTabId[]
): Promise<Map<SheetTabId, string[][]>> {
  const sheets = google.sheets({ version: 'v4', auth })

  // Single API call reads ALL tabs — uses 1 quota unit instead of N
  const ranges = tabNames.map(tab => `'${tab}'!A1:ZZ`)

  const response = await sheets.spreadsheets.values.batchGet({
    spreadsheetId,
    ranges,
  })

  const result = new Map<SheetTabId, string[][]>()
  response.data.valueRanges?.forEach((range, i) => {
    result.set(tabNames[i], (range.values ?? []) as string[][])
  })

  return result
}
```

## Rate Limiting

Google Sheets API quotas:
- **300 read requests/minute** per project
- **60 write requests/minute** per project
- **2 MB max payload** per request

```typescript
// lib/sheets/rateLimiter.ts
import pThrottle from 'p-throttle'

// Max 5 reads/sec (300/min = 5/sec), burst OK within second
const throttledRead = pThrottle({ limit: 5, interval: 1000 })
export const rateLimitedGet = throttledRead(async (fn: () => Promise<any>) => fn())

// Max 1 write/sec (60/min = 1/sec)
const throttledWrite = pThrottle({ limit: 1, interval: 1000 })
export const rateLimitedUpdate = throttledWrite(async (fn: () => Promise<any>) => fn())
```

## A1 Notation Helper

Google Sheets uses A1 notation (A, B, ..., Z, AA, AB...). Column indices must be
converted correctly — `String.fromCharCode` only works for columns A-Z:

```typescript
// lib/sheets/a1.ts
function columnToLetter(columnIndex: number): string {
  let letter = ''
  let n = columnIndex
  while (n >= 0) {
    letter = String.fromCharCode((n % 26) + 65) + letter
    n = Math.floor(n / 26) - 1
  }
  return letter
}
// columnToLetter(0) = 'A', columnToLetter(25) = 'Z', columnToLetter(26) = 'AA'
```

## Write-Then-Cache Pattern

```typescript
// lib/sheets/mutations.ts
export async function updatePatientField(
  auth: OAuth2Client,
  spreadsheetId: string,
  tabName: SheetTabId,
  rowIndex: number,  // 0-based data row (add 2 for sheet: +1 header, +1 for 1-indexing)
  columnIndex: number,
  newValue: string
) {
  const sheets = google.sheets({ version: 'v4', auth })
  const sheetRow = rowIndex + 2  // +1 header row, +1 for 1-based indexing

  // Convert column index to A1 notation (handles AA, AB, etc.)
  const colLetter = columnToLetter(columnIndex)
  const range = `'${tabName}'!${colLetter}${sheetRow}`

  // Step 1: Write to Sheet (source of truth)
  await rateLimitedUpdate(() =>
    sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [[newValue]] },
    })
  )

  // Step 2: Only after Sheet success → update Supabase cache
  // If this fails, log server-side and mark row as stale (next load refreshes from Sheet)
  try {
    await updateCachedValue(tabName, rowIndex, columnIndex, newValue)
  } catch (cacheError) {
    // NEVER swallow silently — mark stale so next load re-fetches
    await markSyncStale(tabName)
    console.error('Cache update failed after Sheet write', { tab: tabName, row: rowIndex })
  }
}
```

## Conflict Detection (Sheets v4 has no ETags for values)

Google Sheets API v4 does NOT support ETags/If-Match for `values.update`.
Conflict detection must be application-level via a timestamp column:

```typescript
async function checkConflict(
  currentTimestamp: string,  // Value of "Data última atualização" when we loaded the data
  sheetTimestamp: string     // Fresh value from Sheet
): Promise<boolean> {
  if (!currentTimestamp || !sheetTimestamp) return false
  return new Date(sheetTimestamp) > new Date(currentTimestamp)
}

// Before writing, re-read the timestamp cell
export async function safeUpdate(params: UpdateParams) {
  const freshTimestamp = await readCell(params.auth, params.spreadsheetId, params.tabName, params.row, 0)
  const hasConflict = await checkConflict(params.loadedTimestamp, freshTimestamp)

  if (hasConflict) {
    throw new ConflictError(
      'Outro usuário atualizou este registro. Recarregue os dados antes de salvar.'
    )
  }

  await updatePatientField(params)
}
```

## Tab Auto-Discovery

```typescript
// lib/sheets/discovery.ts
export async function discoverTabs(
  auth: OAuth2Client,
  spreadsheetId: string
): Promise<SheetTabId[]> {
  const sheets = google.sheets({ version: 'v4', auth })
  const meta = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: 'sheets.properties.title',
  })

  const tabs = meta.data.sheets
    ?.map(s => s.properties?.title)
    .filter((title): title is string => !!title)
    .filter(title => !title.startsWith('_'))  // Skip tabs prefixed with _ (config/internal)
    ?? []

  return tabs.map(t => t as SheetTabId)
}
```

## Error Handling

| Error Code | Meaning | Action |
|---|---|---|
| 401 | Token expired | Refresh via Better Auth, retry |
| 403 | No Sheet access | User lacks Editor permission — surface to UI |
| 404 | Sheet/tab not found | Tab was renamed/deleted — refresh tab list |
| 429 | Rate limited | Exponential backoff, max 3 retries |
| 500/503 | Google outage | Retry with backoff, fall back to Supabase cache |

## NEVER

- **NEVER write to Supabase cache without a confirmed Sheet write** — Sheet is source of truth; cache divergence = data loss for the team
- **NEVER read the entire spreadsheet in one call** — use specific ranges (`A1:Z100`); unbounded reads on large sheets timeout
- **NEVER ignore the header row** — always read row 1 to build column mapping; teams reorder columns
- **NEVER hardcode column indices** — use header-based mapping; columns shift when the team adds fields
- **NEVER use `String.fromCharCode(65 + index)` for A1 notation** — breaks past column Z (index 25); use the `columnToLetter` helper that handles AA, AB, etc.
- **NEVER store the OAuth access token in Supabase or localStorage** — keep in server-side session only (Better Auth handles this)
- **NEVER make write calls without rate limiting** — 60 writes/min is easy to hit with batch edits; queue and throttle
- **NEVER assume tab names are static** — use auto-discovery; the health team adds/renames tabs
- **NEVER send real patient data in error messages or logs** — sanitize before logging (see lgpd-guard skill)
