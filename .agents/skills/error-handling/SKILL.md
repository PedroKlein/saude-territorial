---
name: error-handling
description: >
  Unified error handling patterns for this Next.js 16 app. Covers the full error chain from
  Google Sheets API failure → route handler → TanStack Query error state → user-facing toast.
  Includes error classification (retryable vs fatal), error.tsx boundaries, Server Action
  errors, and QueryErrorResetBoundary integration. Use when handling errors anywhere in
  the stack, designing error responses, or deciding what to show the user. Triggers on: error,
  catch, try/catch, error boundary, error.tsx, toast, 429, 401, 403, retry, fallback,
  catchError, QueryErrorResetBoundary, onError, error state, "something went wrong".
  Do NOT use for LGPD-specific error sanitization (use lgpd-guard for that).
---

# Error Handling Flow

## Error Classification

Every error in this app falls into one of three categories:

| Category | Examples | Action | User sees |
|----------|----------|--------|-----------|
| **Retryable** | 429 rate limit, network timeout, 503 | Auto-retry with backoff | Nothing (invisible retry) or "Tentando novamente..." |
| **Recoverable** | 401 expired token, stale cache | Refresh token/cache, retry once | Brief loading state |
| **Fatal** | 403 no sheet access, invalid sheet format, unknown tab | Stop, inform user, guide action | Toast with explanation + action |

## Error Chain: Sheets API → User

```
Google Sheets API error
    ↓
Route Handler (catch, classify, sanitize — see lgpd-guard)
    ↓ returns { error: string, code: string, retryable: boolean }
TanStack Query (onError / error state)
    ↓
UI (toast for mutations, error boundary for queries)
```

## Typed Error Responses (Route Handlers)

```typescript
// lib/errors.ts
export class AppError extends Error {
  constructor(
    public userMessage: string,  // Safe for display (PT-BR, no patient data)
    public code: string,
    public status: number = 500,
    public retryable: boolean = false,
    public internal?: Record<string, unknown>,  // Server-side only, never sent to client
  ) {
    super(userMessage)
  }
}

// Classify Sheets API errors
export function classifySheetError(error: any): AppError {
  // googleapis uses error.response?.status (number) for HTTP status
  // error.code is a string like 'ERR_BAD_RESPONSE', NOT the HTTP code
  const status = error.response?.status ?? error.status ?? 500

  switch (status) {
    case 429:
      return new AppError('Limite de requisições atingido. Aguarde um momento.', 'RATE_LIMITED', 429, true)
    case 401:
      return new AppError('Sessão expirada. Faça login novamente.', 'AUTH_EXPIRED', 401, false)
    case 403:
      return new AppError('Sem permissão para acessar a planilha. Verifique o compartilhamento.', 'NO_ACCESS', 403, false)
    case 404:
      return new AppError('Planilha ou aba não encontrada. A equipe pode ter renomeado.', 'NOT_FOUND', 404, false)
    default:
      return new AppError('Erro ao acessar dados. Tente novamente.', 'SHEETS_ERROR', 500, true)
  }
}
```

## Route Handler Error Pattern

```typescript
// app/api/sheets/[tabName]/route.ts
export async function GET(request: NextRequest, { params }: { params: Promise<{ tabName: string }> }) {
  try {
    const session = await getSession(request)
    if (!session) return NextResponse.json({ error: 'Não autenticado', code: 'NO_AUTH' }, { status: 401 })

    const { tabName } = await params
    const token = await getGoogleAccessToken(session.user.id)
    const data = await fetchTabData(token, tabName)

    return NextResponse.json(data)
  } catch (error) {
    const appError = error instanceof AppError ? error : classifySheetError(error)

    // Log server-side (sanitized — no patient data)
    console.error('Sheet fetch failed', { code: appError.code, tab: (await params).tabName })

    return NextResponse.json(
      { error: appError.userMessage, code: appError.code, retryable: appError.retryable },
      { status: appError.status }
    )
  }
}
```

## TanStack Query Error Handling

```typescript
// Queries: use error boundary for page-level data
const { data, error } = useQuery({
  ...patientListOptions(filters),
  throwOnError: true,  // Propagate to nearest error.tsx boundary
})

// Mutations: use onError for toast feedback
const mutation = useUpdatePatient()
mutation.mutate(
  { cns, data: updates },
  {
    onError: (error: any) => {
      const message = error.response?.data?.error ?? 'Erro ao salvar alterações'
      toast.error(message)
    },
  }
)
```

## error.tsx Boundary (Per-Route)

```tsx
// app/(dashboard)/map/error.tsx
"use client"
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

export default function MapError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    // Log to monitoring (sanitized by lgpd-guard patterns)
    console.error('Map page error', { message: error.message })
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center h-full gap-4">
      <h2 className="text-lg font-semibold">Erro ao carregar o mapa</h2>
      <p className="text-muted-foreground">{error.message}</p>
      <Button onClick={reset}>Tentar novamente</Button>
    </div>
  )
}
```

## QueryErrorResetBoundary (TanStack Query + error.tsx)

```tsx
// app/(dashboard)/map/page.tsx
import { QueryErrorResetBoundary } from '@tanstack/react-query'

export default function MapPage() {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary onReset={reset} fallback={<MapErrorFallback />}>
          <MapView />
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  )
}
```

## Token Refresh Retry Flow

When a 401 comes back from Sheets API mid-session:

```typescript
// lib/sheets/client.ts
async function fetchWithTokenRefresh<T>(
  fetchFn: (token: string) => Promise<T>
): Promise<T> {
  let token = await getGoogleAccessToken()
  try {
    return await fetchFn(token)
  } catch (error: any) {
    const status = error.response?.status ?? error.status
    if (status === 401) {
      // Token expired — Better Auth's getAccessToken auto-refreshes
      token = await getGoogleAccessToken()  // Gets fresh token
      return await fetchFn(token)  // Retry once with new token
    }
    throw error
  }
}
```

## User-Facing Error Messages (PT-BR)

All error messages shown to users MUST be in Portuguese and actionable:

| Code | Message | Action hint |
|------|---------|------------|
| RATE_LIMITED | "Limite de requisições atingido. Aguarde um momento." | Auto-retry |
| AUTH_EXPIRED | "Sessão expirada. Faça login novamente." | Redirect to login |
| NO_ACCESS | "Sem permissão para acessar a planilha." | Check sharing settings |
| NOT_FOUND | "Aba não encontrada. A equipe pode ter renomeado." | Refresh tab list |
| CONFLICT | "Outro usuário atualizou este registro." | Reload data |
| GEOCODE_FAILED | "Endereço não encontrado no mapa." | Check address spelling |
| NETWORK | "Sem conexão. Verifique sua internet." | Retry button |

## NEVER

- **NEVER show raw API error messages to users** — they contain English technical details and possibly patient data
- **NEVER retry 403 (no access) or 404 (not found)** — these are permanent; retrying wastes quota
- **NEVER let TanStack Query retry mutations by default** — queries retry 3x automatically; mutations should not (risk of duplicate writes)
- **NEVER throw errors in Server Components without an error.tsx boundary** — unhandled throws crash the entire route
- **NEVER forget to sanitize error objects before logging** — googleapis errors contain `config.data` with patient info (see lgpd-guard)
- **NEVER show English error messages** — all user-facing text must be PT-BR
- **NEVER use generic "Algo deu errado" without guidance** — always tell the user what to DO next
