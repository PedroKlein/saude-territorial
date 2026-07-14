---
name: ptbr-conventions
description: >
  Brazilian Portuguese (PT-BR) conventions for user-facing content in this health app.
  Covers date/time formatting (dd/MM/yyyy), number formatting (comma decimal, dot thousands),
  address display order, common health UI strings, and Intl API usage. All user-facing text
  MUST be in PT-BR. Code, comments, and type names stay in English. Use when writing UI
  text, formatting dates/numbers for display, creating toast messages, labels, placeholders,
  or any string the user will see. Triggers on: date format, number format, Portuguese,
  PT-BR, locale, Intl, toLocaleDateString, user message, label, placeholder, toast message,
  alert message, button text, "dd/MM", Brazilian format, address display.
  Do NOT use for code naming conventions (those are in AGENTS.md).
---

# PT-BR Conventions

## Critical Domain-Specific Formatting (Expert Knowledge)

These are the patterns the LLM gets WRONG without guidance:

### Sheet Date Parsing (3 formats from Google Sheets)

Google Sheets may return dates as ISO, Brazilian format, or serial numbers:

```typescript
export function parseSheetDate(value: string): Date | null {
  if (!value || value.trim() === '') return null

  // Try ISO format first (yyyy-MM-dd)
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return new Date(value)

  // Try Brazilian format (dd/MM/yyyy)
  const brMatch = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (brMatch) {
    const [, day, month, year] = brMatch
    return new Date(+year, +month - 1, +day)
  }

  // Google Sheets serial number (days since Dec 30, 1899)
  const serial = Number(value)
  if (!isNaN(serial) && serial > 1000 && serial < 100000) {
    return new Date((serial - 25569) * 86400000)
  }

  return null  // Unparseable
}
```

### Gestational Age (Clinical Notation)

```typescript
// Clinical standard: "32s 4d" (semanas + dias) — NOT "32 semanas e 4 dias"
export function formatGestationalAge(dum: string): string {
  const dumDate = parseSheetDate(dum)
  if (!dumDate) return 'IG desconhecida'
  const totalDays = Math.floor((Date.now() - dumDate.getTime()) / 86400000)
  const weeks = Math.floor(totalDays / 7)
  const days = totalDays % 7
  return `${weeks}s ${days}d`
}
```

### Clinical Abbreviation Display Rules

| Context | Use abbreviation | Use full name |
|---------|-----------------|---------------|
| Table headers, map markers | IG, DUM, DPP, PA, VD, ACS | — |
| Section titles, help text | — | Idade Gestacional, Visita Domiciliar |
| First mention in description | Full name + abbreviation in parentheses | — |

### Address Display

```typescript
export function formatAddress(rua: string, numero: string, complemento?: string): string {
  let addr = `${rua}, ${numero || 's/n'}`  // s/n = sem número (standard)
  if (complemento) addr += ` - ${complemento}`
  return addr
}
```

`s/n` (lowercase, with slash) is the ONLY correct abbreviation for "sem número".

### UI Tone: Impersonal Constructions

NEVER use `você` or possessives. Health professional context is neutral/impersonal:

```
✘ "Selecione sua camada"      → ✔ "Selecione uma camada"
✘ "Seus pacientes"            → ✔ "Pacientes da microárea"
✘ "Você salvou com sucesso"   → ✔ "Dados salvos com sucesso"
```

## Standard Formatting (PT-BR Locale)

Brazil uses dd/MM/yyyy and comma-decimal. Always use `'pt-BR'` locale:

```typescript
const LOCALE = 'pt-BR'

export const formatDate = (d: Date | string) =>
  (typeof d === 'string' ? new Date(d) : d).toLocaleDateString(LOCALE)
// "15/01/2025"

export const formatDateLong = (d: Date | string) =>
  (typeof d === 'string' ? new Date(d) : d).toLocaleDateString(LOCALE, {
    day: 'numeric', month: 'long', year: 'numeric'
  })
// "15 de janeiro de 2025"

export const formatNumber = (n: number) => n.toLocaleString(LOCALE)
// 1.234,56
```

## Common UI Strings

### Navigation & Actions
```typescript
const UI = {
  // Buttons
  salvar: 'Salvar',
  cancelar: 'Cancelar',
  editar: 'Editar',
  excluir: 'Excluir',
  voltar: 'Voltar',
  buscar: 'Buscar',
  filtrar: 'Filtrar',
  limparFiltros: 'Limpar filtros',
  carregando: 'Carregando...',
  tentarNovamente: 'Tentar novamente',

  // Map
  camadas: 'Camadas',
  microareas: 'Microáreas',
  rotaDeVisitas: 'Rota de visitas',
  verNoMapa: 'Ver no mapa',

  // Patient
  paciente: 'Paciente',
  ultimaAtualizacao: 'Última atualização',
  ultimaConsulta: 'Última consulta',
  proximaConsulta: 'Próxima consulta',
  visitaDomiciliar: 'Visita domiciliar',
  semRegistro: 'Sem registro',
} as const
```

### Urgency Labels
```typescript
const URGENCY_LABELS = {
  critico: 'Crítico',
  atencao: 'Atenção',
  normal: 'Normal',
} as const
```

### Toast Messages
```typescript
// Success
toast.success('Dados salvos com sucesso')
toast.success('Rota otimizada')

// Error (see error-handling skill for full list)
toast.error('Erro ao salvar alterações')
toast.error('Endereço não encontrado no mapa')

// Info
toast('Dados sendo atualizados da planilha...')
toast('Novo paciente detectado na planilha')
```

### Empty States
```typescript
const EMPTY_STATES = {
  noPatients: 'Nenhum paciente encontrado nesta camada',
  noAlerts: 'Nenhum alerta ativo',
  noRoutes: 'Nenhuma rota planejada para hoje',
  noCoordinates: 'Endereço não geocodificado',
  selectLayer: 'Selecione uma camada para visualizar',
} as const
```

## Date Parsing from Sheets

Google Sheets may return dates in various formats. Always parse to Date first,
then format for display using `parseSheetDate` (defined above in Critical Domain-Specific section).

## NEVER

- **NEVER use MM/dd/yyyy format** — Brazil uses dd/MM/yyyy; mixing them up transposes day and month
- **NEVER use `.` as decimal separator in user-facing numbers** — Brazil uses `,` for decimal; use `toLocaleString('pt-BR')`
- **NEVER write user-facing strings in English** — every label, toast, error message, placeholder must be PT-BR
- **NEVER hardcode date formatting** — always use `Intl.DateTimeFormat` or `toLocaleDateString('pt-BR')` for consistency
- **NEVER assume sheet dates are ISO format** — sheets may return dd/MM/yyyy, serial numbers, or ISO; always parse defensively
- **NEVER abbreviate "sem número" differently** — the standard is `s/n` (lowercase, with slash)
- **NEVER use "você" (formal/informal mixing)** — this app uses impersonal constructions ("Selecione uma camada" not "Selecione sua camada"); health professional context is neutral
