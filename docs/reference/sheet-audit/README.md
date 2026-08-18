# Sheet audit — PET reference workbook

Raw workbook + per-tab CSV extracts of the PET reference sheet
(`Cópia PET de MODELO 2025 monitoramento usuários POR EQUIPE`). Committed
because this project is synthetic-only (see AGENTS.md § Data Handling) and
the exports are load-bearing reference material for [`../../roadmap.md`](../../roadmap.md).

## Files

- `workbook.xlsx` — full workbook as downloaded from Google Sheets.
- `csv/<index>_<slug>.csv` — one file per tab, extracted via SheetJS.
  Tab index matches the order the sheet ships (`xlsx-cli -l` output).

## Regenerate

If the source sheet drifts and you want a fresh snapshot:

```
curl -sSL -o docs/reference/sheet-audit/workbook.xlsx \
  "https://docs.google.com/spreadsheets/d/12_mmvJcCiFFyCm2V1q00Qd_wJfQP0i29gPKdtZCeyhU/export?format=xlsx"

# List sheet names + indices
bunx xlsx-cli -l docs/reference/sheet-audit/workbook.xlsx

# Extract one tab
bunx xlsx-cli -N <index> docs/reference/sheet-audit/workbook.xlsx \
  > docs/reference/sheet-audit/csv/<index>_<slug>.csv
```

## Reading the CSVs

Every tab uses a 2–4 row header hierarchy (super-group / group / column /
sometimes an italic hint row). Data rows start after the last non-empty
header. Column offsets don't line up between tabs — parsers have to know
their own schema. See [`../../roadmap.md`](../../roadmap.md) § Column audit for
the per-tab breakdown.
