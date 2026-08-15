# Sheet audit — regeneration

The raw workbook and per-tab CSVs are NOT committed. They contain example rows
lifted from the PET reference sheet (`Cópia PET de MODELO 2025 monitoramento
usuários POR EQUIPE`) and — even if fictitious — carry name / CNS / DOB /
address / phone / health-condition shapes that AGENTS.md forbids from git.

To regenerate the workbook locally without committing it:

```
curl -sSL -o plans/sheet-audit/workbook.xlsx \
  "https://docs.google.com/spreadsheets/d/12_mmvJcCiFFyCm2V1q00Qd_wJfQP0i29gPKdtZCeyhU/export?format=xlsx"
```

To dump the first ten rows of every tab as CSV (headers plus any sample rows
the sheet ships with):

```
mkdir -p plans/sheet-audit/csv
bun run --silent bunx xlsx-cli -l plans/sheet-audit/workbook.xlsx
# ...then for each sheet name:
bunx xlsx-cli -N <index> -n 10 plans/sheet-audit/workbook.xlsx \
  > plans/sheet-audit/csv/<index>_<slug>.csv
```

Everything under `plans/sheet-audit/csv/` and `workbook.xlsx` in this directory
is git-ignored (see the `.gitignore` at the same level).

The tab-by-tab column audit that this workbook seeded lives in
`plans/sheet-parity.md`, which carries schema-relevant column names only —
no example rows.
