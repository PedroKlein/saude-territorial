---
name: domain-model
description: >
  Healthcare domain model for the GAT 4 saude-territorial project. Encodes entity
  relationships, field semantics (CNS, DUM, DPP, IG), deduplication rules, layer-to-tab
  mapping, SUS/APS terminology, the urgency scoring engine, and clinical workflows relevant
  to primary healthcare in Porto Alegre. Use when writing business logic, designing data
  models, building alert rules, or making decisions that require understanding the health
  domain. Triggers on: patient, gestante, CNS, microárea, ACS, urgency, alert, DUM, DPP,
  IG, trimester, puérpera, tuberculose, diabetes, hipertensão, layer, tab, health condition,
  visit, consulta, score, risco, critical, attention, normal. Do NOT use for API/technical
  patterns (use sheets-data-layer, tanstack-query, etc.).
---

# Healthcare Domain Model (SUS/APS)

## System Context

This app serves **ACS** (Agentes Comunitários de Saúde) and **ESF** (Estratégia Saúde
da Família) teams at **US Moab Caldas** in Porto Alegre. Each ACS is responsible for
a **microárea** — a geographic subdivision with ~150-750 families.

The team's existing workflow: a Google Sheets spreadsheet with one **tab per health
condition** (gestantes, TB, diabetes, etc.). This app renders those tabs as map layers.

## Entity Hierarchy

```
Unidade de Saúde (US Moab Caldas)
  └── Equipe ESF
       └── ACS (agent)
            └── Microárea (MA1-MA5, geographic territory)
                 └── Patients (identified by CNS)
                      └── Conditions (one patient can appear in multiple tabs)
```

## CNS: The Unique Identifier

**Cartão Nacional de Saúde** — 15-digit national health card number.
- Uniquely identifies a patient across ALL tabs (layers)
- A patient with CNS "123456789012345" in the "Gestantes" tab is the SAME person
  as "123456789012345" in "DM" if they're a pregnant diabetic
- Deduplication across tabs uses CNS as the join key
- If two tabs have conflicting data for the same CNS → surface conflict to user

## Sheet Tabs → Map Layers

| Tab | What it tracks | Key condition-specific fields |
|-----|---------------|-----|
| **Gestantes** | Pregnant women | DUM, DPP, IG, Risco, DTpa, Odonto |
| **Gestantes expostas** | Pregnant + reactive test (HIV/Sífilis/HepB) | Contatos expostos |
| **Tuberculose** | TB patients | Baciloscopia, TRM, Cultura, Forma Clínica |
| **DM** | Diabetes Mellitus | PMDID, last consult |
| **HAS** | Hypertension (arterial) | Last consult date, PA readings |
| **Domiciliados Acamados** | Bedridden patients | Vaccines, Visit Status |
| **Puericultura/Binômio** | Children < 2 years | Growth milestones |
| **PSE** | School health (not a patient) | School name, INEP code, Actions |
| **ILPI** | Long-term care institutions (not a patient) | Institution name, Activities |

**PSE and ILPI are not patient-centric** — they map institutions/schools, not individuals.
They share address fields but NOT CNS.

## Clinical Fields Glossary

| Field | Full name | Type | Semantics |
|-------|-----------|------|-----------|
| **DUM** | Data da Última Menstruação | Date | Start of pregnancy calculation |
| **DPP** | Data Provável do Parto | Date | DUM + 280 days |
| **IG** | Idade Gestacional | Number (weeks) | `floor((today - DUM) / 7)` |
| **Trimester** | — | 1/2/3 | 1: ≤13w, 2: 14-27w, 3: ≥28w |
| **PA** | Pressão Arterial | String "120/80" | Elevated: ≥140/90 |
| **TR** | Teste Rápido | Reagente/Não Reagente | HIV + Sífilis + HepB rapid test |
| **CNS** | Cartão Nacional de Saúde | 15-digit string | National unique health ID |
| **VD** | Visita Domiciliar | Count/date | Home visit by ACS |
| **DTpa** | Vacina Tríplice Bacteriana | Status | Required after 20th week |

## Two Alert Systems (Don't Conflate)

### 1. Built-in Urgency Engine (`lib/alerts/urgencyEngine.ts`)
Hardcoded defaults from the PoC prototype. Pure function, deterministic:

```typescript
type UrgencyResult = { category: 'critico' | 'atencao' | 'normal'; score: number; alerts: Alert[] }
function computeUrgency(patient: GestantePatient): UrgencyResult
```

**Default weights (from extensao-gat4 prototype):**

| Factor | Points | Category |
|--------|--------|----------|
| TR Reagente (HIV/Sífilis/HepB) | +50 | critical |
| PA ≥ 140/90 | +40 | critical |
| Days without consultation (after 14d threshold) | +2/day | critical if >45d |
| Pending exam for current trimester | +15 | attention (critical if 3rd tri) |
| No home visit registered | +10 | attention |
| Too few consultations for gestational age | +10 | attention |
| No dental evaluation | +5 | attention |
| DTpa not given (>20 weeks) | +5 | attention |

### Determination Logic
```
If any alert is type "critical" → category = "critico"
Else if any alert is type "attention" → category = "atencao"
Else → category = "normal"
```

Score is used for sorting within categories (higher score = more urgent).

### 2. Configurable Alert Rules (`lib/alerts/ruleEngine.ts`)
Dynamic rules from a special sheet tab. These CAN be changed by the health team.
Rule format: `[Layer, Column, Operator, Value, Alert Level]`

Operators: `>`, `<`, `>=`, `<=`, `=`, `!=`, `older_than_days`, `is_empty`

Example rules:
- `["Gestantes", "IG", ">", "40", "critico"]` — Overdue pregnancy
- `["Tuberculose", "Data última consulta", "older_than_days", "30", "atencao"]`
- `["HAS", "PA", ">=", "140/90", "critico"]`
- `["DM", "PMDID", "is_empty", "", "atencao"]`

### Puérpera Detection

A gestante becomes puérpera when birth is confirmed (typically DPP passes + team
updates the sheet). Detection: `isPuerpera` flag in sheet OR `today > DPP + 14 days`
with no birth denial. The patient stays in the Gestantes tab (column marks puérpera
status). The urgency engine switches to puérpera-specific alerts automatically.

## Clinical Workflows

### Gestantes Flow
1. Patient registered (opening of prenatal care)
2. IG < 12 weeks = early, ideal. IG > 20 weeks = late start, higher attention
3. Each trimester requires: TR/Sorologia, consultation, weight tracking
4. 3rd trimester: DTpa vaccine required
5. After birth (DPP passes): becomes **puérpera**
6. Puérpera needs: puerperal consultation, postnatal VD, postnatal dental

### ACS Visit (VD) Cycle
1. ACS assigned to microárea
2. Monthly: visit all patients in their area
3. Record: date, observations, measurements
4. Priority: patients with `critico` urgency first
5. Route optimization: plan daily visits geographically

## Deduplication Logic

Same patient appears in multiple tabs (e.g., pregnant AND diabetic):

### Detection
1. After loading all tabs, group rows by CNS
2. CNS appearing in 2+ tabs → potential conflict check
3. Compare shared fields (address, phone) across instances

### Conflict Resolution Algorithm
```typescript
interface ConflictResolution {
  cns: CNS
  field: string              // e.g. 'telefone'
  values: { tab: SheetTabId; value: string }[]  // differing values per tab
  resolvedValue?: string     // user picks canonical value
}

async function resolveConflict(resolution: ConflictResolution) {
  // 1. User picks the canonical value (via UI)
  const canonical = resolution.resolvedValue!

  // 2. Write canonical to ALL tabs containing this CNS (batch update)
  const updates = resolution.values.map(({ tab }) => ({
    range: buildRange(tab, resolution.cns, resolution.field),
    values: [[canonical]],
  }))

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: { data: updates, valueInputOption: 'USER_ENTERED' },
  })

  // 3. Update Supabase cache atomically
  await updateCacheForCns(resolution.cns)
}
```

**Critical rule:** NEVER write to one tab without writing to all tabs containing
that CNS. Partial deduplication creates NEW inconsistencies.

## Porto Alegre Geography

- US Moab Caldas location: approximately -30.05, -51.17
- Microáreas: MA1-MA5 (GeoJSON boundaries in `/territories/`)
- Bounding box for validation: lat [-30.27, -29.93], lng [-51.27, -51.01]
- If geocoded coords fall outside this box → likely error

## NEVER

- **NEVER treat CNS as just a string** — it's the dedup key across ALL tabs; use branded type
- **NEVER assume one patient = one tab** — a patient with CNS X can appear in Gestantes AND DM simultaneously
- **NEVER calculate IG without DUM** — IG is derived (weeks since DUM); if DUM is missing, IG is unknown
- **NEVER show urgency score to the user without the alert list** — the score alone is meaningless; alerts explain WHY
- **NEVER hardcode configurable alert thresholds** — the rule engine thresholds come from the config sheet; only the built-in urgency engine has hardcoded defaults (and those should be `as const` in a config file, not inline)
- **NEVER confuse DPP with delivery date** — DPP is *expected* date; actual delivery may differ
- **NEVER mix up PSE/ILPI with patient layers** — schools and institutions don't have CNS; different entity type entirely
- **NEVER apply patient urgency logic to PSE/ILPI tabs** — they track institutional actions, not clinical risk
