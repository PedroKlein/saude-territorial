/**
 * TDD Red Phase — Google Sheets column mapping + data parsing contract
 *
 * These tests define the expected behaviour of lib/sheets/parser.ts.
 * They will FAIL until the implementation is written.
 *
 * Contracts:
 *  - `parseSheetRows` accepts a raw string[][] (header row + data rows) and
 *    returns an array of typed patient objects
 *  - Portuguese column headers are mapped to English field names
 *  - Dates in dd/MM/yyyy format are coerced to Date objects
 *  - Empty cells produce null (not empty string) for optional fields
 *  - Numeric fields (Idade, IG) are parsed to numbers (null when empty)
 *  - Tab-specific fields (DUM, DPP, Risco) are mapped for the Gestantes layer
 *
 * SYNTHETIC DATA ONLY — no real patient records.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

// ---------------------------------------------------------------------------
// Shared test data
// ---------------------------------------------------------------------------

const BASE_HEADERS = [
  "Nome",
  "CNS",
  "Data de Nascimento",
  "Idade",
  "Telefone",
  "Rua",
  "Número",
  "Complemento",
  "Microárea",
  "Data última atualização",
];

/** A fully-populated synthetic base row aligned with BASE_HEADERS */
const FULL_BASE_ROW: string[] = [
  "Maria Fictícia (teste)",       // Nome
  "000000000000001",              // CNS  — invalid check digit = clearly fake
  "15/05/1990",                   // Data de Nascimento  dd/MM/yyyy
  "34",                           // Idade
  "(00) 00000-0001",              // Telefone  — 00 prefix = clearly fake
  "Rua Fictícia de Teste",        // Rua
  "100",                          // Número
  "Apto 01",                      // Complemento
  "MA1",                          // Microárea
  "20/01/2025",                   // Data última atualização
];

const GESTANTES_HEADERS = [
  ...BASE_HEADERS,
  "DUM",
  "DPP",
  "IG (semanas)",
  "Risco",
  "Avaliação Odontológica",
  "DTpa",
];

const FULL_GESTANTES_ROW: string[] = [
  ...FULL_BASE_ROW,
  "10/06/2024",   // DUM
  "17/03/2025",   // DPP
  "30",           // IG (semanas)
  "Alto",         // Risco
  "Realizada",    // Avaliação Odontológica
  "Realizada",    // DTpa
];

// ---------------------------------------------------------------------------
// Base column mapping
// ---------------------------------------------------------------------------

describe("parseSheetRows — base column mapping", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("maps Nome to nomeCompleto", async () => {
    const { parseSheetRows } = await import("@/lib/sheets/parser");
    const rows = parseSheetRows(BASE_HEADERS, [FULL_BASE_ROW]);
    expect(rows[0].nomeCompleto).toBe("Maria Fictícia (teste)");
  });

  it("maps CNS to cns", async () => {
    const { parseSheetRows } = await import("@/lib/sheets/parser");
    const rows = parseSheetRows(BASE_HEADERS, [FULL_BASE_ROW]);
    expect(rows[0].cns).toBe("000000000000001");
  });

  it("maps Rua to rua", async () => {
    const { parseSheetRows } = await import("@/lib/sheets/parser");
    const rows = parseSheetRows(BASE_HEADERS, [FULL_BASE_ROW]);
    expect(rows[0].rua).toBe("Rua Fictícia de Teste");
  });

  it("maps Número to numero", async () => {
    const { parseSheetRows } = await import("@/lib/sheets/parser");
    const rows = parseSheetRows(BASE_HEADERS, [FULL_BASE_ROW]);
    expect(rows[0].numero).toBe("100");
  });

  it("maps Complemento to complemento", async () => {
    const { parseSheetRows } = await import("@/lib/sheets/parser");
    const rows = parseSheetRows(BASE_HEADERS, [FULL_BASE_ROW]);
    expect(rows[0].complemento).toBe("Apto 01");
  });

  it("maps Microárea to microarea", async () => {
    const { parseSheetRows } = await import("@/lib/sheets/parser");
    const rows = parseSheetRows(BASE_HEADERS, [FULL_BASE_ROW]);
    expect(rows[0].microarea).toBe("MA1");
  });

  it("maps Telefone to telefone", async () => {
    const { parseSheetRows } = await import("@/lib/sheets/parser");
    const rows = parseSheetRows(BASE_HEADERS, [FULL_BASE_ROW]);
    expect(rows[0].telefone).toBe("(00) 00000-0001");
  });

  it("maps 'Data última atualização' to dataUltimaAtualizacao", async () => {
    const { parseSheetRows } = await import("@/lib/sheets/parser");
    const rows = parseSheetRows(BASE_HEADERS, [FULL_BASE_ROW]);
    expect(rows[0].dataUltimaAtualizacao).toBeDefined();
  });

  it("maps 'Nome completo' (long-form header) to nomeCompleto as well", async () => {
    const { parseSheetRows } = await import("@/lib/sheets/parser");
    const headersWithLongForm = BASE_HEADERS.map((h) =>
      h === "Nome" ? "Nome completo" : h
    );
    const rows = parseSheetRows(headersWithLongForm, [FULL_BASE_ROW]);
    expect(rows[0].nomeCompleto).toBe("Maria Fictícia (teste)");
  });
});

// ---------------------------------------------------------------------------
// Date parsing — dd/MM/yyyy → Date
// ---------------------------------------------------------------------------

describe("parseSheetRows — date parsing", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("parses Data de Nascimento in dd/MM/yyyy format to a Date", async () => {
    const { parseSheetRows } = await import("@/lib/sheets/parser");
    const rows = parseSheetRows(BASE_HEADERS, [FULL_BASE_ROW]);
    const dob = rows[0].dataNascimento;
    expect(dob).toBeInstanceOf(Date);
    expect((dob as Date).getFullYear()).toBe(1990);
    expect((dob as Date).getMonth()).toBe(4); // 0-indexed: May = 4
    expect((dob as Date).getDate()).toBe(15);
  });

  it("parses Data última atualização in dd/MM/yyyy format to a Date", async () => {
    const { parseSheetRows } = await import("@/lib/sheets/parser");
    const rows = parseSheetRows(BASE_HEADERS, [FULL_BASE_ROW]);
    const updated = rows[0].dataUltimaAtualizacao;
    expect(updated).toBeInstanceOf(Date);
    expect((updated as Date).getFullYear()).toBe(2025);
    expect((updated as Date).getMonth()).toBe(0); // January = 0
    expect((updated as Date).getDate()).toBe(20);
  });

  it("returns null for dataNascimento when the cell is empty", async () => {
    const { parseSheetRows } = await import("@/lib/sheets/parser");
    const emptyRow = [...FULL_BASE_ROW];
    emptyRow[BASE_HEADERS.indexOf("Data de Nascimento")] = "";
    const rows = parseSheetRows(BASE_HEADERS, [emptyRow]);
    expect(rows[0].dataNascimento).toBeNull();
  });

  it("returns null for dataUltimaAtualizacao when the cell is empty", async () => {
    const { parseSheetRows } = await import("@/lib/sheets/parser");
    const emptyRow = [...FULL_BASE_ROW];
    emptyRow[BASE_HEADERS.indexOf("Data última atualização")] = "";
    const rows = parseSheetRows(BASE_HEADERS, [emptyRow]);
    expect(rows[0].dataUltimaAtualizacao).toBeNull();
  });

  it("returns null for a date cell containing only whitespace", async () => {
    const { parseSheetRows } = await import("@/lib/sheets/parser");
    const emptyRow = [...FULL_BASE_ROW];
    emptyRow[BASE_HEADERS.indexOf("Data de Nascimento")] = "   ";
    const rows = parseSheetRows(BASE_HEADERS, [emptyRow]);
    expect(rows[0].dataNascimento).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Empty cells — optional fields
// ---------------------------------------------------------------------------

describe("parseSheetRows — empty cell handling", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("returns null (not empty string) for complemento when cell is empty", async () => {
    const { parseSheetRows } = await import("@/lib/sheets/parser");
    const emptyRow = [...FULL_BASE_ROW];
    emptyRow[BASE_HEADERS.indexOf("Complemento")] = "";
    const rows = parseSheetRows(BASE_HEADERS, [emptyRow]);
    expect(rows[0].complemento).toBeNull();
  });

  it("returns null for telefone when cell is empty", async () => {
    const { parseSheetRows } = await import("@/lib/sheets/parser");
    const emptyRow = [...FULL_BASE_ROW];
    emptyRow[BASE_HEADERS.indexOf("Telefone")] = "";
    const rows = parseSheetRows(BASE_HEADERS, [emptyRow]);
    expect(rows[0].telefone).toBeNull();
  });

  it("handles a short row (fewer cells than headers) without throwing", async () => {
    const { parseSheetRows } = await import("@/lib/sheets/parser");
    // Row with only 2 cells — all other fields should default to null
    const shortRow = ["Ana Fictícia (teste)", "000000000000002"];
    const rows = parseSheetRows(BASE_HEADERS, [shortRow]);
    expect(rows[0].nomeCompleto).toBe("Ana Fictícia (teste)");
    expect(rows[0].rua).toBeNull();
  });

  it("skips completely empty rows (all cells empty or row is [])", async () => {
    const { parseSheetRows } = await import("@/lib/sheets/parser");
    const rows = parseSheetRows(BASE_HEADERS, [FULL_BASE_ROW, [], ["", "", ""]]);
    expect(rows).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// Numeric fields — Idade and IG
// ---------------------------------------------------------------------------

describe("parseSheetRows — numeric fields", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("parses Idade as a number", async () => {
    const { parseSheetRows } = await import("@/lib/sheets/parser");
    const rows = parseSheetRows(BASE_HEADERS, [FULL_BASE_ROW]);
    expect(rows[0].idade).toBe(34);
    expect(typeof rows[0].idade).toBe("number");
  });

  it("returns null for Idade when the cell is empty", async () => {
    const { parseSheetRows } = await import("@/lib/sheets/parser");
    const emptyRow = [...FULL_BASE_ROW];
    emptyRow[BASE_HEADERS.indexOf("Idade")] = "";
    const rows = parseSheetRows(BASE_HEADERS, [emptyRow]);
    expect(rows[0].idade).toBeNull();
  });

  it("parses 'IG (semanas)' as a number in Gestantes rows", async () => {
    const { parseSheetRows } = await import("@/lib/sheets/parser");
    const rows = parseSheetRows(GESTANTES_HEADERS, [FULL_GESTANTES_ROW]);
    expect(rows[0].ig).toBe(30);
    expect(typeof rows[0].ig).toBe("number");
  });

  it("returns null for IG when the cell is empty", async () => {
    const { parseSheetRows } = await import("@/lib/sheets/parser");
    const emptyRow = [...FULL_GESTANTES_ROW];
    emptyRow[GESTANTES_HEADERS.indexOf("IG (semanas)")] = "";
    const rows = parseSheetRows(GESTANTES_HEADERS, [emptyRow]);
    expect(rows[0].ig).toBeNull();
  });

  it("returns null for Idade when the cell contains non-numeric text", async () => {
    const { parseSheetRows } = await import("@/lib/sheets/parser");
    const badRow = [...FULL_BASE_ROW];
    badRow[BASE_HEADERS.indexOf("Idade")] = "N/A";
    const rows = parseSheetRows(BASE_HEADERS, [badRow]);
    expect(rows[0].idade).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Gestantes tab-specific fields: DUM, DPP, Risco
// ---------------------------------------------------------------------------

describe("parseSheetRows — Gestantes-specific fields", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("maps DUM to dum and parses it as a Date", async () => {
    const { parseSheetRows } = await import("@/lib/sheets/parser");
    const rows = parseSheetRows(GESTANTES_HEADERS, [FULL_GESTANTES_ROW]);
    const dum = rows[0].dum;
    expect(dum).toBeInstanceOf(Date);
    expect((dum as Date).getFullYear()).toBe(2024);
    expect((dum as Date).getMonth()).toBe(5); // June = 5
    expect((dum as Date).getDate()).toBe(10);
  });

  it("maps DPP to dpp and parses it as a Date", async () => {
    const { parseSheetRows } = await import("@/lib/sheets/parser");
    const rows = parseSheetRows(GESTANTES_HEADERS, [FULL_GESTANTES_ROW]);
    const dpp = rows[0].dpp;
    expect(dpp).toBeInstanceOf(Date);
    expect((dpp as Date).getFullYear()).toBe(2025);
    expect((dpp as Date).getMonth()).toBe(2); // March = 2
    expect((dpp as Date).getDate()).toBe(17);
  });

  it("maps Risco to risco as a string", async () => {
    const { parseSheetRows } = await import("@/lib/sheets/parser");
    const rows = parseSheetRows(GESTANTES_HEADERS, [FULL_GESTANTES_ROW]);
    expect(rows[0].risco).toBe("Alto");
  });

  it("maps 'Avaliação Odontológica' to avaliacaoOdonto", async () => {
    const { parseSheetRows } = await import("@/lib/sheets/parser");
    const rows = parseSheetRows(GESTANTES_HEADERS, [FULL_GESTANTES_ROW]);
    expect(rows[0].avaliacaoOdonto).toBe("Realizada");
  });

  it("maps DTpa to vacinaDTpa", async () => {
    const { parseSheetRows } = await import("@/lib/sheets/parser");
    const rows = parseSheetRows(GESTANTES_HEADERS, [FULL_GESTANTES_ROW]);
    expect(rows[0].vacinaDTpa).toBe("Realizada");
  });

  it("returns null for DUM when the cell is empty", async () => {
    const { parseSheetRows } = await import("@/lib/sheets/parser");
    const emptyRow = [...FULL_GESTANTES_ROW];
    emptyRow[GESTANTES_HEADERS.indexOf("DUM")] = "";
    const rows = parseSheetRows(GESTANTES_HEADERS, [emptyRow]);
    expect(rows[0].dum).toBeNull();
  });

  it("returns null for DPP when the cell is empty", async () => {
    const { parseSheetRows } = await import("@/lib/sheets/parser");
    const emptyRow = [...FULL_GESTANTES_ROW];
    emptyRow[GESTANTES_HEADERS.indexOf("DPP")] = "";
    const rows = parseSheetRows(GESTANTES_HEADERS, [emptyRow]);
    expect(rows[0].dpp).toBeNull();
  });

  it("returns null for risco when the cell is empty", async () => {
    const { parseSheetRows } = await import("@/lib/sheets/parser");
    const emptyRow = [...FULL_GESTANTES_ROW];
    emptyRow[GESTANTES_HEADERS.indexOf("Risco")] = "";
    const rows = parseSheetRows(GESTANTES_HEADERS, [emptyRow]);
    expect(rows[0].risco).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Multiple rows
// ---------------------------------------------------------------------------

describe("parseSheetRows — multiple rows", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("parses multiple data rows and returns one object per row", async () => {
    const { parseSheetRows } = await import("@/lib/sheets/parser");
    const secondRow: string[] = [
      "João Fictício (teste)",   // Nome
      "000000000000002",         // CNS
      "20/08/1985",              // Data de Nascimento
      "39",                      // Idade
      "(00) 00000-0002",         // Telefone
      "Rua Fictícia Dois",       // Rua
      "200",                     // Número
      "",                        // Complemento  (empty)
      "MA2",                     // Microárea
      "15/01/2025",              // Data última atualização
    ];

    const rows = parseSheetRows(BASE_HEADERS, [FULL_BASE_ROW, secondRow]);
    expect(rows).toHaveLength(2);
    expect(rows[1].nomeCompleto).toBe("João Fictício (teste)");
    expect(rows[1].cns).toBe("000000000000002");
    expect(rows[1].microarea).toBe("MA2");
    expect(rows[1].complemento).toBeNull();
  });

  it("returns an empty array when given zero data rows", async () => {
    const { parseSheetRows } = await import("@/lib/sheets/parser");
    const rows = parseSheetRows(BASE_HEADERS, []);
    expect(rows).toEqual([]);
  });
});
