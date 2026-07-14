---
name: lgpd-guard
description: >
  LGPD (Lei Geral de Proteção de Dados) compliance guardrails for this health monitoring
  project. Patient health data is "dados sensíveis" (sensitive data) under LGPD Art. 11 —
  the strictest category. Covers: what constitutes patient data, safe logging practices,
  error message sanitization, synthetic data patterns for development, safe analytics,
  and git hygiene. This skill is a MODIFIER — it constrains how all other code is written.
  Use on EVERY code review and when writing any code that touches patient data. Triggers on:
  patient data, CNS, nome, endereço, health condition, log, console.log, error message,
  Sentry, analytics, test data, mock data, seed, fixture, .env. Do NOT use for general
  security (OWASP) or infrastructure hardening.
---

# LGPD Data Safety Guard

## Classification: What Is Patient Data?

Under LGPD Art. 11, health data is **dados pessoais sensíveis** (sensitive personal data).
In this project, the following fields are sensitive:

### Directly Identifying (PII)
- Nome completo
- CNS (Cartão Nacional de Saúde — unique 15-digit national health ID)
- Data de Nascimento
- Telefone
- Endereço (Rua, Número, Complemento) + coordinates (lat/lng)

### Health-Sensitive (Art. 11)
- Any health condition (gestante, TB, diabetes, HAS)
- Exame results (TR Reagente, Baciloscopia)
- Medications, treatments
- Urgency/risk classification
- Visit history, consultation dates

### The Combination Rule
Even if individual fields seem harmless, **any combination that identifies a person +
reveals a health condition** is an LGPD violation. Example: "MA3 + pregnant + 25 years"
in a small microárea might identify the patient.

## Safe Logging

```typescript
// BAD — logs patient identity + health data
console.log(`Updating patient ${patient.nome} (${patient.cns}): TB status = ${patient.status}`)
logger.error(`Failed to save: ${JSON.stringify(patient)}`)

// GOOD — reference by opaque ID, no health details
console.log(`Updating patient [row=${rowIndex}, tab=${tabName}]`)
logger.error(`Sheet write failed`, { tab: tabName, row: rowIndex, errorCode: err.code })
```

### Allowed in logs:
- Tab names (layer identifiers, not patient data)
- Row indices
- Error codes and HTTP status
- Operation names
- Timestamps
- Aggregate counts ("42 patients loaded")

### NEVER in logs:
- Nome, CNS, telefone, endereço
- Health conditions or exam results
- Coordinates that identify a residence
- Full error objects that may contain Sheet row data

## Error Messages to Users

```typescript
// BAD — exposes patient data in error boundary
throw new Error(`Patient ${nome} at ${rua} ${numero} has invalid CNS: ${cns}`)

// GOOD — generic message with action, technical details only in server log
throw new AppError('Erro ao validar dados do paciente. Verifique o CNS na planilha.', {
  // Internal metadata — never shown to user, only in server logs
  internal: { row: rowIndex, tab: tabName, field: 'cns' }
})
```

## Synthetic Data for Development

ALL test/mock/seed data MUST be synthetic. Never copy real patient records:

```typescript
// lib/test/fixtures/patients.ts
// CLEARLY MARKED AS SYNTHETIC
export const SYNTHETIC_PATIENTS = [
  {
    nome: 'Maria da Silva Santos',  // Common Brazilian name — fictional
    cns: '123456789012345',         // Invalid CNS (doesn't pass check digit)
    dataNascimento: '1990-05-15',
    telefone: '(51) 99999-0001',    // 99999 prefix = clearly fake
    rua: 'Rua das Flores',          // Generic street name
    numero: '100',
    microarea: 'MA1',
    // ...
  },
]
```

Rules for synthetic data:
- Use common Brazilian names that don't match real patients
- CNS numbers should be structurally valid (15 digits) but fail check digit validation
- Phone numbers use 99999-XXXX pattern (clearly fake)
- Addresses use generic/fictional street names
- Add a comment: `// SYNTHETIC DATA — not real patients`

## Git Hygiene

```gitignore
# .gitignore — patient data must never enter version control
*.csv
*.xlsx
.env.local
.env.production
```

Pre-commit check (if using Husky):
```bash
# Reject commits containing CNS-like patterns (15 consecutive digits that aren't synthetic)
if git diff --cached | grep -E '\b[0-9]{15}\b' | grep -v 'SYNTHETIC\|fixture\|mock\|test'; then
  echo "ERROR: Possible real CNS number detected in commit"
  exit 1
fi
```

## API Route Protection

```typescript
// app/api/sheets/[tabName]/route.ts
export async function GET(request: NextRequest, { params }: { params: Promise<{ tabName: string }> }) {
  // 1. Verify authentication
  const session = await getSession(request)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // 2. Fetch data (user's own OAuth token — no impersonation)
  const data = await fetchSheetTab(session.accessToken, await params)

  // 3. Response — data goes directly to client, no intermediate logging
  return NextResponse.json(data)
  // ❌ NEVER: logger.info('Returning patients:', data)
}
```

## Analytics/Monitoring Safety

If using Sentry, Vercel Analytics, or any monitoring:

```typescript
// Sentry config — structural scrubbing by route, not keyword matching
Sentry.init({
  beforeSend(event) {
    // Scrub request body from ALL Sheet API routes (structural, not pattern-based)
    if (event.request?.url?.includes('/api/sheets/')) {
      event.request.data = '[REDACTED — patient data]'
    }
    // Strip event.extra wholesale for sheet routes
    if (event.tags?.route?.includes('sheets')) {
      event.extra = undefined
    }
    return event
  },
})

// When catching googleapis errors, strip the request body:
try {
  await sheets.spreadsheets.values.update(params)
} catch (error: any) {
  // googleapis includes request body in error.config.data — NEVER log it
  const { config, ...safeError } = error
  logger.error('Sheet write failed', { code: safeError.code, status: safeError.status })
  throw error
}
```

## Data Minimization

Only load/cache/transmit what's needed:

```typescript
// BAD — fetching all columns when sidebar only needs name + urgency
const allData = await fetchSheetTab(token, 'Gestantes')

// GOOD — fetch only display columns, full data on detail click
const listData = await fetchColumns(token, 'Gestantes', ['Nome', 'CNS', 'Microárea'])
const detailData = await fetchRow(token, 'Gestantes', rowIndex)  // Only on demand
```

## Consent & Legal Basis

This app operates under LGPD Art. 11, II, "b" — processing necessary for healthcare
delivery by health professionals. The legal basis is **tutela da saúde** (healthcare
protection), not consent. However:
- Users (ACS/health professionals) authenticate with their own Google account
- They access only their team's spreadsheet (which they already have permission for)
- No data is shared with third parties
- No data is stored beyond what's needed for geocoding cache

## NEVER

- **NEVER log patient names, CNS, addresses, or health conditions** — use row indices and tab names only
- **NEVER include patient data in error messages shown to users** — generic messages with action guidance only
- **NEVER commit real patient data to git** (not even in .env.local.example)
- **NEVER send patient data to analytics, error tracking, or monitoring services** — scrub before sending
- **NEVER filter Sentry breadcrumbs by keyword regex** — patterns miss variants and create false confidence; scrub structurally by route pattern (`/api/sheets/`)
- **NEVER log raw `googleapis` error objects** — they include `error.config.data` containing the Sheet row payload; destructure: `const { config, ...safeError } = error`
- **NEVER expose geocoded coordinates without authentication** — lat/lng of a patient's home is PII
- **NEVER use real patient data for development or testing** — synthetic only, clearly marked
- **NEVER send entire Sheet rows in HTTP responses when only 2-3 fields are needed** — data minimization
- **NEVER store the Google OAuth access token in a client-accessible location** — server-side session only
