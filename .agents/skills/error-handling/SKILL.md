---
name: error-handling
description: >
  Error handling patterns for this Next.js 16 app. Covers the error chain from
  API route handlers → TanStack Query error states → user-facing UI (toasts, error boundaries).
  Includes error classification (retryable vs fatal), `error.tsx` boundaries, Server Action
  errors, and `QueryErrorResetBoundary` integration. Use when handling errors anywhere in
  the stack, designing error responses, or deciding what to show the user.
  Do NOT use for LGPD-specific sanitization — use the `lgpd-guard` skill for that.
disable-model-invocation: true
---

# Error Handling Flow

## Historical note (post-pivot)

Before the pivot (see `docs/adr/ADR-001-drop-sheets.md`), this skill covered a specific error chain rooted in **Google Sheets API failures** (429 rate limit, 401 expired scope, 403 sheet access). All of that is gone — the app no longer calls Google Sheets. The general classification and UI patterns below still apply, but the concrete "Sheets 429 retry" logic has been removed.

The main sources of errors now are:
1. **Supabase / Drizzle** — DB connection issues, constraint violations, RLS denials (if reintroduced later).
2. **Nominatim geocoding** — 429, network timeouts, unresolvable addresses.
3. **OSRM routing** — network, no route found.
4. **App logic** — validation failures, missing session, invalid CNS format.

## Error Classification

Every error in this app falls into one of three categories:

| Category | Examples | Action | User sees |
|----------|----------|--------|-----------|
| **Retryable** | Nominatim 429, network timeout, 503 from OSRM | Auto-retry with backoff | Nothing (invisible retry) or "Tentando novamente..." |
| **Recoverable** | Expired session, stale query cache | Refresh session/cache, retry once | Brief loading state or redirect to /login |
| **Fatal** | Validation error, CNS uniqueness violation, unresolvable address | Stop, inform user, guide action | Toast with explanation + action |

## Error Chain: Route Handler → User

```
DB / Nominatim / OSRM error
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
    public userMessage: string,   // Safe for display (PT-BR, no patient data)
    public code: string,
    public status: number = 500,
    public retryable: boolean = false,
    public internal?: Record<string, unknown>, // server-side only
  ) {
    super(userMessage);
  }
}

export function isAppError(e: unknown): e is AppError {
  return e instanceof AppError;
}
```

Route handlers convert internal errors into `AppError` before returning JSON:

```typescript
try {
  const patient = await db.query.patients.findFirst({ where: eq(patients.cns, cns) });
  if (!patient) {
    throw new AppError("Paciente não encontrado.", "PATIENT_NOT_FOUND", 404);
  }
  return NextResponse.json(patient);
} catch (e) {
  if (isAppError(e)) {
    return NextResponse.json(
      { error: e.userMessage, code: e.code, retryable: e.retryable },
      { status: e.status }
    );
  }
  // Unknown error — sanitize per lgpd-guard, log server-side
  console.error("unexpected", e);
  return NextResponse.json(
    { error: "Algo deu errado. Tente novamente.", code: "INTERNAL", retryable: true },
    { status: 500 }
  );
}
```

## TanStack Query error handling

For **queries**:
```tsx
const { data, error, isError, refetch } = useQuery({
  queryKey: patientKeys.all,
  queryFn: fetchPatients,
});

if (isError) {
  // Use QueryErrorResetBoundary in the tree above to allow retry
  return <PatientErrorFallback error={error} onRetry={() => refetch()} />;
}
```

For **mutations**:
```tsx
const mutation = useMutation({
  mutationFn: (payload) => fetch("/api/patients", { method: "POST", body: JSON.stringify(payload) }),
  onError: (err) => {
    toast.error(err.message);  // AppError.userMessage
  },
});
```

## `error.tsx` boundaries

Every route segment that fetches data on the server should have a sibling `error.tsx`:

```tsx
"use client";
export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="p-4">
      <p className="text-sm text-red-600">Falha ao carregar. Tente novamente.</p>
      <button onClick={reset} className="mt-2 rounded-md bg-primary px-3 py-1 text-white">
        Recarregar
      </button>
    </div>
  );
}
```

## Anti-patterns

- Returning raw error objects from route handlers — always sanitize.
- Showing DB errors, stack traces, or CNS values in toast text — LGPD violation.
- Auto-retrying **mutations** — retry only reads. A retried patient save can create duplicates.
- Silent `catch` blocks — always log server-side, always surface something to the user.
- Using `alert()` for errors — use the toast component.

## References

- `docs/adr/ADR-001-drop-sheets.md` — historical context (Sheets 429 chain removed)
- `lgpd-guard` skill — how to sanitize error strings that touch patient data
- TanStack Query docs — https://tanstack.com/query
