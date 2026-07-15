/**
 * Google Sheets row parser.
 *
 * Maps Portuguese column headers to English field names and coerces
 * cell values to their expected TypeScript types.
 *
 * LGPD: never log patient fields (nome, CNS, endereço, health data).
 */

// ---------------------------------------------------------------------------
// Column mapping — Portuguese header → TypeScript field name
// ---------------------------------------------------------------------------

/** Fields that are parsed as Date (dd/MM/yyyy) */
const DATE_FIELDS = new Set([
  "dataNascimento",
  "dataUltimaAtualizacao",
  "dum",
  "dpp",
]);

/** Fields that are parsed as numbers */
const NUMBER_FIELDS = new Set(["idade", "ig"]);

const COLUMN_MAP: Record<string, string> = {
  // Shared patient columns
  Nome: "nomeCompleto",
  "Nome completo": "nomeCompleto",
  CNS: "cns",
  "Data de Nascimento": "dataNascimento",
  Idade: "idade",
  Telefone: "telefone",
  Rua: "rua",
  Número: "numero",
  Complemento: "complemento",
  "Microárea": "microarea",
  "Data última atualização": "dataUltimaAtualizacao",

  // Gestantes-specific
  DUM: "dum",
  DPP: "dpp",
  "IG (semanas)": "ig",
  Risco: "risco",
  "Avaliação Odontológica": "avaliacaoOdonto",
  DTpa: "vacinaDTpa",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Parses a dd/MM/yyyy date string into a Date object.
 * Returns null for empty / whitespace-only values.
 */
function parseBrDate(raw: string): Date | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const parts = trimmed.split("/");
  if (parts.length !== 3) return null;

  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; // 0-indexed
  const year = parseInt(parts[2], 10);

  if (isNaN(day) || isNaN(month) || isNaN(year)) return null;

  return new Date(year, month, day);
}

/** Returns true when every cell in the row is empty/whitespace. */
function isEmptyRow(row: string[]): boolean {
  return row.length === 0 || row.every((cell) => !cell.trim());
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Parses raw Google Sheets data into an array of typed patient objects.
 *
 * @param headers  - The header row (row 0 from the sheet, not included in `rows`).
 * @param rows     - Data rows (everything after the header row).
 * @returns        An array of parsed objects; one per non-empty data row.
 */
export function parseSheetRows(
  headers: string[],
  rows: string[][]
): Record<string, unknown>[] {
  // Build index: fieldName → column index
  const fieldIndex = new Map<string, number>();
  for (let i = 0; i < headers.length; i++) {
    const field = COLUMN_MAP[headers[i].trim()];
    if (field !== undefined) {
      fieldIndex.set(field, i);
    }
  }

  const result: Record<string, unknown>[] = [];

  for (const row of rows) {
    if (isEmptyRow(row)) continue;

    const obj: Record<string, unknown> = {};

    for (const [fieldName, colIndex] of fieldIndex) {
      const raw = row[colIndex] ?? "";
      const trimmed = raw.trim();

      if (DATE_FIELDS.has(fieldName)) {
        obj[fieldName] = trimmed ? parseBrDate(raw) : null;
      } else if (NUMBER_FIELDS.has(fieldName)) {
        if (!trimmed) {
          obj[fieldName] = null;
        } else {
          const n = Number(trimmed);
          obj[fieldName] = isNaN(n) ? null : n;
        }
      } else {
        // String field — empty string → null for optional fields
        obj[fieldName] = trimmed || null;
      }
    }

    result.push(obj);
  }

  return result;
}
