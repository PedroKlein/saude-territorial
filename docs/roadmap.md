# Roadmap: sheet parity, validation, and importer

> Post-MVP roadmap: sheet parity, importer, new-layer work. Phases are executed in order; each is independent enough to ship on its own.

Produced after auditing every tab of the PET reference workbook (`docs/reference/sheet-audit/workbook.xlsx`, per-tab CSVs under `docs/reference/sheet-audit/csv/`). The current MVP models three condition layers loosely; the sheet defines ten tabs with real clinical column sets, cross-tab links, and location-scoped entities not yet in the schema.

## Destination

A repo where:

1. Every clinical column captured on the sheet — the ones a well-run US actually fills — has a schema field with the right type, an enum where applicable, and a canonical PT-BR label.
2. Enums that drift today ("alto" / "Alto" / "ALTO") are Postgres `pg_enum` types with Zod parity.
3. Two new patient-scoped condition layers (Diabetes, Domiciliados/Acamados) plus two sheet-native follow-ons (Gestantes Expostas, Exame pé diabético) are first-class. Puericultura is designed but scoped as a variant of the "child + mother binômio" case (see decisions below).
4. Two location-scoped entities (ILPI institutions, PSE schools) have their own data model — they are NOT patient records.
5. Cross-tab auto-linking rules (Gestante Exposta triggers on `resultadoTesteRapido='EXPOSTA'`; Exame Pé Diabético triggers on `pmdid=true`) are encoded as either persisted derived state or view-level joins with an explicit contract.
6. An XLSX/CSV importer accepts the PET workbook (or a compatible export) and lands patient rows into Postgres with per-row validation reports. This is the single hardest piece.

## What we're not building

- Editing from the app back out to a sheet. Supabase is the source of truth (ADR-001). Import is one-way.
- A generic "map any workbook" tool. The importer targets the PET workbook shape specifically; other formats need a mapper rewrite.
- e-SUS APS integration. Deferred per SPEC.

## Column audit — tab by tab

See `docs/reference/sheet-audit/csv/*.csv` for the raw column heads. Summary of what's in the sheet vs. what the current schema captures:

### Gestantes (existing layer, partial coverage)

**Have:** dum, dpp, risco, ig, dataUltimaConsulta, dataProximaConsulta, numeroConsultas, pressaoArterial, vacinaDtpa, igAbertura, hasPreviaTag, diabetesPreviaTag.

**Gap:**
- Avaliação Odontológica (during) — status enum
- TR/Sorologia Sífilis+HIV: three separate results (1º/2º/3º trimestre), each `Feito | Não Feito | Não realizada`
- Resultado Teste Rápido: `MONITORAR | EXPOSTA | ...` — this is the trigger for the Expostas layer, cannot be dropped
- Acompanhamento Peso/Altura PN — presence flag or count
- Número de Visita Domiciliar — integer
- TR ou Aval. Exame Sífilis+HIV+HepB+HepC (1º Tri), Sífilis+HIV (3º Tri) — status enums
- **Pós-parto trio:** Consulta Puerpério, Visita Domiciliar (pós-parto), Avaliação Odontológica (pós-parto)

### Gestantes Expostas (NEW LAYER — HIV vertical transmission follow-up)

Wholly new. Auto-linked from Gestantes when `resultadoTesteRapido='EXPOSTA'`.

Column set:
- **HIV:** TR HIV realizado (bool), Resultado TR HIV (`REAGENTE | NÃO REAGENTE`), Confirmação lab HIV (`Sim|Não|Pendente`), Carga viral HIV (`< 1.000 | ≥ 1.000 cópias/mL`), CD4 (`< 200 | 200-500 | > 500 células/mm³`), TARV iniciado (bool), Data início TARV
- **Sífilis:** TR Sífilis (bool + resultado + data), VDRL (solicitado + resultado), Tipo (primária/secundária/latente/terciária), Notificação SINAN, Datas 1ª/2ª/3ª dose penicilina benzatina, VDRL controle
- **Hep B:** TR HBsAg (bool + resultado + data), Anti-HBs (solicitado + resultado), Vacinação (iniciada + datas 1ª/2ª/3ª dose)

### Puericultura + Binômio (NEW LAYER — child < 2 anos linked to mother)

Different shape: **the patient is the child**, but a `motherId` FK links back to another `patients` row. Requires either (a) a new "criança" role on patients + FK, or (b) a separate `children_data` extension with a mother FK.

Column set:
- Criança: Nome, DOB, CNS
- Mãe: Nome, Telefone, Data internação/alta, Idade, Raça/Cor
- Binômio: Teste pezinho (data, idade no dia, registro), VD ≤7d, Atendimento ≤7d, Nº consultas
- Puericultura: Consultas por marco (1ª sem, 1º/2º/4º/6º/12º/24º mês), VIP + PENTA 2/4/6 meses

### HAS (existing layer, thin coverage)

**Have:** dataUltimaConsulta, monitoramento.

**Gap:** Data próxima consulta, Data última aferição PA, Registro (Correto/Incorreto), Encaminhamentos.

### DM (NEW LAYER — Diabetes)

Column set:
- Data última consulta, Data próxima consulta
- PMDID (bool — triggers Exame pé diabético row)
- Data último HbA1c, Valor último HbA1c (numeric, unit `%`, range 4–20)
- Solicitação HbA1c E-SUS (bool), Solicitação HbA1c GERCON (bool)
- Registro (Correto/Incorreto)
- Avaliação pé DM (status: Não avaliado | Avaliado — sem alterações | Avaliado — com alterações), Data avaliação
- Encaminhamentos

### Exame pé diabético (SUB-LAYER of DM)

Auto-linked from DM when `pmdid=true`. Column set:
- Estabelecimento que cadastrou vínculo (text, likely enum of local unidades)
- Tipo de diabetes (`DM 1 | DM 2 | Gestacional | Outro`)
- Data validade laudo
- Exame feito 2º quadrimestre (`Não feito | Feito | Não realizado`)
- Exame feito 3º quadrimestre (same enum)

### Tuberculose (existing layer, very partial)

**Have:** baciloscopia, trm, cultura, formaClinica, dataUltimaAtualizacao (used by alert rule).

**Gap:**
- TIPO — need to see actual values
- GAL — text
- Data 1ª amostra, Data 2ª amostra
- Baciloscopia (1ª amostra, 2ª amostra) — enum per sample
- TRM: M. Tuberculosis result
- Cultura: Escarro, Outros
- PPD (mm) — numeric
- Histopatologia, RX Tórax, Outros Exames — text
- **Tratamento block:** Tipo de Entrada (`Caso Novo | Reingresso | Reingresso após abandono | Transferência | Não sabe`), Esquema (RHZE / RH / R / …), Data Início, Forma de tratamento
- **9 consultas de acompanhamento** (1º ao 9º mês, each `Realizada | Faltou | Não aplicável`)
- TDO (Tratamento Diretamente Observado — `Regular | Irregular/faltoso | Não aplicável`)
- Situação de Encerramento (Motivo enum `Cura | Abandono | Óbito por TB | Óbito por outra causa | Transferência | Falência | Mudança de diagnóstico`, Data)
- Contatos: Nº moram junto (int), Nº examinadas (int), Todos examinados (bool), Lista (text — probably JSON-array of names)

### Domiciliados / Acamados (NEW LAYER)

Column set:
- Vacinas: Data PNEUMO, Data última dose COVID, Data BIVALENTE, Data última dose INFLUENZA
- Coletas LAB: Status Visita, Recoleta/1ª Coleta, Solicitação/Status Sorológico, Urina, Fezes, Preparo exame

### ILPI (NEW ENTITY TYPE — institution, not patient)

Different data model entirely. An ILPI is a long-term care facility with N residents. Modeling proposal:
- New `institutions` table (type: ILPI | PSE | outros) with name, address, geocoded coords, notes
- Residents link back to `patients` (their record lives in patients + condition extensions like anyone else); an `institution_id` FK on `patients` marks residency
- Planejamento Atividades Coletivas: separate `institution_activities` table (institution_id, tema, data, público, profissionais)

### PSE (NEW ENTITY TYPE — school, not patient)

Same institution model. Fields: Nome escola, INEP (unique 8-digit), Telefone, Endereço. Actions live in `institution_activities`.

## Cross-tab links

Two rules currently expressed as sheet formulas:

1. **Gestante EXPOSTA → row appears in Gestantes Expostas.** In the app: keep two extension tables. When a gestante's `resultadoTesteRapido` is set to `EXPOSTA`, atomically insert (if absent) a `gestantes_expostas_data` row with the same `patient_id`; when it changes away from EXPOSTA, do NOT auto-delete — the follow-up may still be needed. Deleting is manual.
2. **DM PMDID=true → row appears in Exame Pé Diabético.** Same pattern: `dm_data` toggling PMDID inserts a `pe_diabetico_data` row. Manual delete only.

These are implemented as service-layer side effects on PATCH, not SQL triggers — code is easier to reason about, tests are simpler.

## Enum discipline

Every text column with a bounded value set becomes a Postgres enum + Zod branded string. Non-exhaustive draft list:

- `risco_gestante`: `habitual | alto`
- `resultado_tr`: `REAGENTE | NÃO REAGENTE | INDETERMINADO`
- `resultado_tr_sifilis_hiv`: `Feito | Não Feito | Não realizada`
- `avaliacao_odonto`: `Realizada | Não Realizada | A realizar | Não se aplica`
- `resultado_ts_gestante`: `MONITORAR | EXPOSTA | LIBERADA | ...` (real values TBD)
- `tipo_dm`: `DM 1 | DM 2 | Gestacional | Outro`
- `tipo_tb`: pending
- `tipo_entrada_tb`: `Caso Novo | Reingresso | Reingresso após abandono | Transferência | Não sabe`
- `motivo_encerramento_tb`: `Cura | Abandono | Óbito por TB | Óbito por outra causa | Transferência | Falência | Mudança de diagnóstico`
- `consulta_status`: `Realizada | Faltou | Não aplicável`
- `carga_viral_hiv_faixa`: `< 1.000 cópias/mL | ≥ 1.000 cópias/mL`
- `cd4_faixa`: `< 200 células/mm³ | 200-500 células/mm³ | > 500 células/mm³`
- `tipo_sifilis`: `Primária | Secundária | Latente recente | Latente tardia | Terciária | Não determinada`
- `raca_cor`: `Branca | Preta | Parda | Amarela | Indígena | Não declarada`

For each enum: one canonical value in code (snake_case English or the exact PT-BR string — one convention repo-wide), plus a display map to PT-BR labels for the UI. The existing pattern in `src/config/alert-rules.config.ts` is a reasonable starting point.

## Cross-field validation

Beyond enums, fields need coherence checks:

- **Dates:**
  - `dum ≤ hoje`, `dpp = dum + 40 semanas` (already computed; UI just displays), `dataProximaConsulta > dataUltimaConsulta`.
  - `dataInicioTarv ≥ dataResultadoTrHiv` when both present.
  - Tuberculose: `dataInicioTratamento ≥ data1aAmostra`; consulta N+1 ≥ consulta N when both dates recorded.
- **Numeric ranges:**
  - `pressaoArterial` format `NNN/NN` (systolic 60–260, diastolic 30–160)
  - `numeroConsultas` ≥ 0
  - `hba1c` numeric 4.0–20.0
  - `ppd` mm 0–30
  - `numeroPessoasMoramJunto` ≥ 0; `numeroExaminadas ≤ numeroMoram`
- **CNS:** 15-digit + checksum (already partial in Zod)
- **CEP:** already 8-digit normalized
- **Telefone:** DDD + 8 or 9 digits

## The importer

The single hardest deliverable. Design in three layers.

### Layer 1: Ingestion

- Upload endpoint: `POST /api/import/preflight` accepts an XLSX or a set of CSV files. Body: multipart.
- Runs on a server route; parses via SheetJS (`xlsx` npm package) — the same lib used to extract the audit.
- Detects tab names against a known list; unknown tabs are ignored with a warning.
- Per tab, applies the tab-specific parser (functions in `src/lib/import/parsers/`).
- Produces a **preview report** (never writes yet). Report shape:
  ```
  {
    tabs: [
      {
        name: "Gestantes",
        rows: N,
        parsed: M,
        errors: [{ row: 5, cns: "…", issues: [...] }, ...],
        warnings: [{ row: 12, issue: "CNS already exists — will update" }, ...]
      },
      ...
    ]
  }
  ```
- User previews in the UI; an explicit "Confirmar importação" button hits `POST /api/import/commit` with the same file (or a signed handle from preflight).

### Layer 2: Row parsing

Each tab has a parser that maps sheet cells → Zod-validated `Patient + Extension` payloads.

Two challenges:
1. **Merged header rows.** The sheet has 2–3 header rows (super-group, group, column). The parser needs the column offset for each field. Encode this as a static `TabSchema` per tab — hardcoded, not detected.
2. **CNS as float in xlsx.** Excel/Sheets stores long numeric CNS as scientific-notation floats (`7.92E+14`). Rehydrate: `Math.round(v).toString().padStart(15, '0')` and re-verify checksum. Reject if malformed.

### Layer 3: Commit

- Wraps every insert/upsert in a single transaction.
- Strategy: **upsert by CNS**. If CNS exists, PATCH the patient and its extensions. If not, INSERT patient + extension row for the tab being processed.
- The tab currently being processed determines which extension row gets written; cross-tab side-effects (Expostas auto-row on `resultadoTesteRapido=EXPOSTA`) happen naturally as each tab is processed.
- Preserves `createdBy` / `updatedBy` = the importing user's session id.
- Records import audit: a new `import_batches` table (`id`, `user_id`, `filename`, `started_at`, `finished_at`, `stats jsonb`).

### UI

An `/importar` page:
1. Drop zone for XLSX
2. Preflight runs, shows per-tab summary + expandable error lists
3. If any errors, user downloads a fix-me CSV (rows that failed with reasons) and re-uploads
4. Otherwise "Confirmar" commits and shows a completion summary with links to newly-created patient panels

## Phased execution

Each phase is scoped to be shippable on its own.

### Phase A — Enum discipline and validation hardening — shipped

**Deliverable:** every existing enum-shaped `text` column becomes a Postgres enum with Zod parity; every existing form field gets cross-field validation. NO new columns or layers.

- New migration adds `pg_enum` types + column-type conversions with USING casts.
- Zod branded-string helpers per enum.
- Cross-field rules in `src/lib/patients/validation.ts` (superRefine).
- Existing tests updated; new tests for edge cases.
- Panel + wizard forms get inline error copy per rule.

### Phase B — Existing layer completions — in progress

**Deliverable:** Gestantes gains its missing columns (odonto, TR sorologia trimestres, pós-parto trio, resultado teste rápido); HAS gains próxima consulta + aferição PA + registro + encaminhamentos; Tuberculose gains treatment monitoring, TDO, encerramento, contatos.

- New migrations per layer.
- Wizard step data pages extended.
- Panel condition cards extended.
- Alert rules unchanged (still the locked 4).

### Phase C — New patient-scoped layers

**Deliverable:** Diabetes + Exame pé diabético (as a sub-layer with auto-linking) + Domiciliados/Acamados land as first-class layers with wizard integration, panel cards, filter chips, and default (non-alerting) sidebar entries.

- Three migrations, three extension tables.
- Layer config extended.
- Wizard "escolher condições" step adds three checkboxes.
- Panel condition cards for each.
- Cross-tab linking for PMDID=Sim.

May split into two sessions.

### Phase D — Institutions (ILPI + PSE)

**Deliverable:** new `institutions` + `institution_activities` tables; `patients.institution_id` FK; institution list page + detail page; map layer overlay for institutions.

- Distinct from the patient layer — treat as its own module.
- Map: institutions render as square/hex chips visually distinct from patient chips.
- Nav: new "Instituições" tab in the header alongside Pacientes.

### Phase E — XLSX importer (Layers 1–3 above)

**Deliverable:** `/importar` page with preflight + commit + audit; per-tab parsers for all ten tabs. Depends on A–D so the target schema is complete.

The biggest phase — parsers are ~150–300 LoC each; testing needs synthetic input files that exercise both the happy path and known error patterns.

## Ordering rationale

- A first because every subsequent phase benefits from real enums.
- B before C because completing existing layers is lower-risk and users see immediate value.
- C before D because patient layers are still the primary user story.
- E last: no point building the importer until the target schema is stable.

Alternative: if the team has an urgent need to import existing data, collapse to A → E-lite (importer covers only the current schema) → B → C → D. The lite importer costs ~0.6 sessions extra but unblocks migration earlier.

## Open decisions

Before starting Phase A's successors, the team owes answers on:

1. **Enum naming convention** — canonical values in English (`abandonment`) or verbatim PT-BR (`Abandono`)? Existing pattern leans PT-BR verbatim.
2. **Puericultura mother-child link** — new "criança" role on `patients` with a `mother_id` FK, or a fully separate `criancas` table with its own mini-identity? Recommendation: FK on patients, with a `role` enum defaulting to `paciente`. Simpler joins, one source of truth for CNS.
3. **Institutions as a separate module or a special patient type?** Recommendation: separate. Different fields, different UI, no confusing overlap.
4. **Importer input format** — one XLSX matching the PET workbook exactly, or a set of CSVs (one per tab)? Recommendation: XLSX only. Fewer moving parts, matches how the team exports today.
5. **Import destructiveness** — upsert-by-CNS (proposed), or reject if any CNS collides with an existing app row? Upsert is more useful for real workflows; reject is safer.
6. **Alert rules on new layers** — add rules for DM (HbA1c > 8, no consulta in 180d), Puericultura (missing vacina by marco), Acamados (no visita in 30d)? The current 4 rules are locked for the MVP; a new phase can add rules.
