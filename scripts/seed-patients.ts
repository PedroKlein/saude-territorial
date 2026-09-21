#!/usr/bin/env tsx
/**
 * seed-patients — synthetic data loader for the saude-territorial dev DB.
 *
 * Reads `gestantes.json` and `pacientes.csv` from the sister repo
 * (`extensao-gat4`) and maps them into rows for `patients`,
 * `gestantes_data`, `tuberculose_data`, and `has_data`.
 *
 * Two output modes, both LGPD-gated and non-prod-DB-gated:
 *   - default (`db:seed`)      → load the selected local PGlite or Postgres
 *                                database inside a transaction.
 *   - `--emit-sql` (`db:seed:emit`) → print BEGIN + TRUNCATE + INSERTs + COMMIT
 *                                     to stdout without opening a connection.
 *                                     Consumed by MCP `apply_migration` for the
 *                                     initial pivot-execution seed.
 *
 * NEVER logs individual patient fields. Only aggregate counts and skip
 * summaries reach stdout/stderr. See `.agents/skills/lgpd-guard/SKILL.md`.
 */

import { PGlite } from "@electric-sql/pglite";
import { createHash, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { getDatabaseDriver, PGLITE_DATA_DIR } from "../src/db/config";
import { computeCnsChecksum } from "../src/lib/patients/cns";

import postgres from "postgres";

import { enforceNonProdGate } from "./lib/non-prod-gate";

// ─────────────────────────────────────────────────────────────────────────────
// Gates — LGPD (in this file) + non-prod DB (imported). Both fire on every
// invocation, whether run via package.json chain or `tsx scripts/seed-patients.ts`.
// ─────────────────────────────────────────────────────────────────────────────

if (process.env.SEED_SYNTHETIC !== "1") {
  console.error("Refusing to seed: SEED_SYNTHETIC=1 required (LGPD gate).");
  console.error("See docs/adr/ADR-001-drop-sheets.md and .agents/skills/lgpd-guard/SKILL.md.");
  process.exit(1);
}
enforceNonProdGate();

// ─────────────────────────────────────────────────────────────────────────────
// Args
// ─────────────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const emitSqlMode = args.includes("--emit-sql");
const gestantesPathIdx = args.indexOf("--gestantes-path");
const pacientesPathIdx = args.indexOf("--pacientes-path");

const repoRoot = resolve(__dirname, "..");
// Vendored synthetic seed data (committed under seed/). Self-contained so a
// fresh clone seeds without the extensao-gat4 sister repo. Override with
// --gestantes-path / --pacientes-path to point at other synthetic sources.
const defaultGestantesPath = resolve(repoRoot, "seed/gestantes.json");
const defaultPacientesPath = resolve(repoRoot, "seed/pacientes.csv");
const gestantesPathOverride = args[gestantesPathIdx + 1];
const pacientesPathOverride = args[pacientesPathIdx + 1];
const gestantesPath =
  gestantesPathIdx >= 0 && gestantesPathOverride
    ? resolve(gestantesPathOverride)
    : defaultGestantesPath;
const pacientesPath =
  pacientesPathIdx >= 0 && pacientesPathOverride
    ? resolve(pacientesPathOverride)
    : defaultPacientesPath;

// ─────────────────────────────────────────────────────────────────────────────
// Row shapes — subset of the schema columns we actually populate from seed
// sources. Everything not listed here defaults to NULL / column default.
// ─────────────────────────────────────────────────────────────────────────────

interface PatientRow {
  id: string;
  cns: string;
  nome_completo: string;
  data_nascimento: string | null;
  idade: number | null;
  telefone: string | null;
  rua: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  microarea: string | null;
  lat: number | null;
  lng: number | null;
  geocode_status: "geocoded" | "manual" | "unresolved";
}

interface GestanteRow {
  patient_id: string;
  dum: string | null;
  dpp: string | null;
  risco: string | null;
  ig_abertura: string | null;
  data_ultima_consulta: string | null;
  numero_consultas: number;
  pressao_arterial: string | null;
  acompanhamento_peso_altura: string | null;
  numero_visitas_domiciliares: number;
  avaliacao_odonto_status: string | null;
  vacina_dtpa: string | null;
  tr_primeiro_tri: string | null;
  tr_segundo_tri: string | null;
  tr_terceiro_tri: string | null;
  resultado_tr: string | null;
  is_puerpera: boolean;
  is_exposta: boolean;
}

interface TuberculoseRow {
  patient_id: string;
  data_inicio: string | null;
  outros_exames: string | null;
  tdo_status: string | null;
}

interface HasRow {
  patient_id: string;
  data_ultima_consulta: string | null;
  data_proxima_consulta: string | null;
  registro_notas: string | null;
}

interface Rows {
  patients: PatientRow[];
  gestantes: GestanteRow[];
  tuberculose: TuberculoseRow[];
  has: HasRow[];
  skipped: { acamado: number; transmissivel: number; dmOnly: number; csvGestante: number };
}

// ─────────────────────────────────────────────────────────────────────────────
// Mapping — gestantes.json → patients + gestantes_data
// ─────────────────────────────────────────────────────────────────────────────

interface GestanteSourceRow {
  id: string;
  nome: string;
  cns: string;
  dataNascimento: string;
  telefone?: string;
  endereco: { rua: string; numero: string; lat: number; lng: number };
  microarea: string;
  consultas?: {
    igAbertura?: string;
    dum?: string;
    dpp?: string;
    dataUltimaConsulta?: string;
    numeroConsultas?: number;
    pressaoArterial?: string;
    acompanhamentoPesoAltura?: string;
    visitasDomiciliares?: number;
  };
  exames?: {
    trPrimeiroTrimestre?: string;
    trSegundoTrimestre?: string;
    trTerceiroTrimestre?: string;
    resultadoTR?: string;
  };
  avaliacaoOdonto?: string;
  vacinaDTpa?: string;
  isPuerpera?: boolean;
  isExposta?: boolean;
}

function idadeFromDob(iso: string | null): number | null {
  if (!iso) return null;
  const dob = new Date(iso);
  if (isNaN(dob.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age -= 1;
  return age;
}

function mapGestantesJson(source: GestanteSourceRow[]): Pick<Rows, "patients" | "gestantes"> {
  const patients: PatientRow[] = [];
  const gestantes: GestanteRow[] = [];

  for (const g of source) {
    const patientId = randomUUID();
    patients.push({
      id: patientId,
      cns: g.cns,
      nome_completo: g.nome,
      data_nascimento: g.dataNascimento ?? null,
      idade: idadeFromDob(g.dataNascimento ?? null),
      telefone: g.telefone ?? null,
      rua: g.endereco?.rua ?? null,
      numero: g.endereco?.numero ?? null,
      complemento: null,
      bairro: null,
      microarea: g.microarea ?? null,
      lat: g.endereco?.lat ?? null,
      lng: g.endereco?.lng ?? null,
      geocode_status: g.endereco?.lat != null && g.endereco?.lng != null ? "geocoded" : "unresolved",
    });

    const consultas = g.consultas ?? {};
    const exames = g.exames ?? {};
    // JSON source does not carry `risco` — leave null; the seed's LOCKED
    // "risco = alto" alert rule will only fire once the team enters values
    // in-app. Alternative: infer from other flags. For MVP we leave null.
    gestantes.push({
      patient_id: patientId,
      dum: consultas.dum ?? null,
      dpp: consultas.dpp ?? null,
      risco: null,
      ig_abertura: consultas.igAbertura ?? null,
      data_ultima_consulta: consultas.dataUltimaConsulta ?? null,
      numero_consultas: consultas.numeroConsultas ?? 0,
      pressao_arterial: consultas.pressaoArterial ?? null,
      acompanhamento_peso_altura: consultas.acompanhamentoPesoAltura ?? null,
      numero_visitas_domiciliares: consultas.visitasDomiciliares ?? 0,
      avaliacao_odonto_status: g.avaliacaoOdonto ?? null,
      vacina_dtpa: g.vacinaDTpa ?? null,
      tr_primeiro_tri: exames.trPrimeiroTrimestre ?? null,
      tr_segundo_tri: exames.trSegundoTrimestre ?? null,
      tr_terceiro_tri: exames.trTerceiroTrimestre ?? null,
      resultado_tr: exames.resultadoTR ?? null,
      is_puerpera: g.isPuerpera === true,
      is_exposta: g.isExposta === true,
    });
  }

  return { patients, gestantes };
}

// ─────────────────────────────────────────────────────────────────────────────
// Mapping — pacientes.csv → patients + (tuberculose|has)_data (rows filtered
// by `condicao`; skipped rows counted for the summary log).
// ─────────────────────────────────────────────────────────────────────────────

interface PacienteCsvRow {
  id: string;
  lat: string;
  lng: string;
  condicao: string;
  microarea: string;
  ultimo_acompanhamento: string;
  proximo_acompanhamento: string;
  endereco: string;
  observacao: string;
}

/**
 * Deterministic 15-digit CNS from a source id, valid under the DATASUS
 * checksum. Leading `1` places these in the definitive-CNS family; the
 * 11-digit prefix comes from hashing the source id, and the 4-digit tail
 * is the checksum produced by `computeCnsChecksum`.
 */
function synthesiseCns(sourceId: string): string {
  const hex = createHash("sha256").update(sourceId).digest("hex");
  let digits = "";
  for (let i = 0; i < 10; i++) {
    digits += (parseInt(hex.charAt(i), 16) % 10).toString();
  }
  const prefix = `1${digits}`;
  return prefix + computeCnsChecksum(prefix);
}

function parseCsv(source: string): PacienteCsvRow[] {
  const lines = source.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const header = lines[0]?.split(",").map((h) => h.trim()) ?? [];
  const rows: PacienteCsvRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    const cols = line.split(",");
    const row: Record<string, string> = {};
    for (let j = 0; j < header.length; j++) {
      const key = header[j];
      if (key) row[key] = (cols[j] ?? "").trim();
    }
    rows.push(row as unknown as PacienteCsvRow);
  }
  return rows;
}

const ENDERECO_RE = /^(.+?)\s+(\d+\S*)$/;

function parseEndereco(raw: string): { rua: string | null; numero: string | null } {
  const match = ENDERECO_RE.exec(raw.trim());
  if (!match) return { rua: raw.trim() || null, numero: null };
  return { rua: match[1]?.trim() ?? null, numero: match[2]?.trim() ?? null };
}

function mapPacientesCsv(
  source: PacienteCsvRow[],
): Pick<Rows, "patients" | "tuberculose" | "has" | "skipped"> {
  const patients: PatientRow[] = [];
  const tuberculose: TuberculoseRow[] = [];
  const has: HasRow[] = [];
  const skipped = { acamado: 0, transmissivel: 0, dmOnly: 0, csvGestante: 0 };

  for (const row of source) {
    const cond = row.condicao.toLowerCase();

    if (cond === "acamado") {
      skipped.acamado += 1;
      continue;
    }
    if (cond === "transmissivel") {
      skipped.transmissivel += 1;
      continue;
    }
    if (cond === "gestante") {
      // gestantes.json is the richer source; skip CSV gestantes to avoid dupes.
      skipped.csvGestante += 1;
      continue;
    }
    if (cond === "cronico" && !/HAS/i.test(row.observacao)) {
      skipped.dmOnly += 1;
      continue;
    }
    if (cond !== "tuberculose" && cond !== "cronico") {
      // Future condicao values — skip conservatively.
      continue;
    }

    const patientId = randomUUID();
    const { rua, numero } = parseEndereco(row.endereco);
    const microNum = parseInt(row.microarea, 10);
    const microarea = Number.isFinite(microNum) ? `MA${microNum}` : row.microarea || null;
    const lat = parseFloat(row.lat);
    const lng = parseFloat(row.lng);

    patients.push({
      id: patientId,
      cns: synthesiseCns(row.id),
      nome_completo: `Paciente ${row.id}`,
      data_nascimento: null,
      idade: null,
      telefone: null,
      rua,
      numero,
      complemento: null,
      bairro: null,
      microarea,
      lat: Number.isFinite(lat) ? lat : null,
      lng: Number.isFinite(lng) ? lng : null,
      geocode_status: Number.isFinite(lat) && Number.isFinite(lng) ? "geocoded" : "unresolved",
    });

    if (cond === "tuberculose") {
      const tdo = /abandonou|irregular/i.test(row.observacao)
        ? "TDO irregular/faltoso"
        : null;
      tuberculose.push({
        patient_id: patientId,
        data_inicio: row.ultimo_acompanhamento || null,
        outros_exames: row.observacao || null,
        tdo_status: tdo,
      });
    } else {
      // cronico + HAS match
      has.push({
        patient_id: patientId,
        data_ultima_consulta: row.ultimo_acompanhamento || null,
        data_proxima_consulta: row.proximo_acompanhamento || null,
        registro_notas: row.observacao || null,
      });
    }
  }

  return { patients, tuberculose, has, skipped };
}

// ─────────────────────────────────────────────────────────────────────────────
// SQL emit — deterministic INSERT strings. String values escape single
// quotes by doubling. Nulls emit as literal NULL. No parameterization
// needed since values come exclusively from vetted synthetic sources.
// ─────────────────────────────────────────────────────────────────────────────

type Literal = string | number | boolean | null;

function encodeSql(value: Literal): string {
  if (value === null) return "NULL";
  if (typeof value === "number") return Number.isFinite(value) ? value.toString() : "NULL";
  if (typeof value === "boolean") return value ? "true" : "false";
  return `'${value.replace(/'/g, "''")}'`;
}

function insertRow(table: string, row: Record<string, Literal>): string {
  const cols = Object.keys(row);
  const vals = cols.map((column) => encodeSql(row[column] ?? null)).join(", ");
  return `INSERT INTO ${table} (${cols.join(", ")}) VALUES (${vals});`;
}

function generateSql(rows: Rows): string {
  const parts: string[] = [
    "BEGIN;",
    "TRUNCATE TABLE patients RESTART IDENTITY CASCADE;",
  ];
  for (const p of rows.patients) parts.push(insertRow("patients", p as unknown as Record<string, Literal>));
  for (const g of rows.gestantes) parts.push(insertRow("gestantes_data", g as unknown as Record<string, Literal>));
  for (const t of rows.tuberculose) parts.push(insertRow("tuberculose_data", t as unknown as Record<string, Literal>));
  for (const h of rows.has) parts.push(insertRow("has_data", h as unknown as Record<string, Literal>));
  parts.push("COMMIT;");
  return parts.join("\n") + "\n";
}

// ─────────────────────────────────────────────────────────────────────────────
// Database apply — used by default mode
// ─────────────────────────────────────────────────────────────────────────────

async function applyToDb(rows: Rows): Promise<void> {
  const seedSql = generateSql(rows);
  const driver = getDatabaseDriver();

  if (driver === "postgres") {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is required when DATABASE_DRIVER=postgres.");

    const sql = postgres(url, { prepare: false, max: 1 });
    try {
      await sql.unsafe(seedSql);
    } finally {
      await sql.end({ timeout: 5 });
    }
    return;
  }

  const client = new PGlite(resolve(PGLITE_DATA_DIR));
  try {
    await client.exec(seedSql);
  } finally {
    await client.close();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const gestantesRaw = JSON.parse(readFileSync(gestantesPath, "utf-8")) as GestanteSourceRow[];
  const pacientesRaw = readFileSync(pacientesPath, "utf-8");
  const csvRows = parseCsv(pacientesRaw);

  const fromJson = mapGestantesJson(gestantesRaw);
  const fromCsv = mapPacientesCsv(csvRows);

  const rows: Rows = {
    patients: [...fromJson.patients, ...fromCsv.patients],
    gestantes: fromJson.gestantes,
    tuberculose: fromCsv.tuberculose,
    has: fromCsv.has,
    skipped: fromCsv.skipped,
  };

  const driver = getDatabaseDriver();
  const target = driver === "postgres"
    ? (() => {
        try {
          const url = new URL(process.env.DATABASE_URL ?? "");
          return `${url.hostname}${url.port ? `:${url.port}` : ""}`;
        } catch {
          return "<no DATABASE_URL>";
        }
      })()
    : PGLITE_DATA_DIR;

  if (emitSqlMode) {
    process.stderr.write(
      `⚠️  Emitting seed SQL for patients / gestantes_data / tuberculose_data / has_data (target: ${target}).\n`,
    );
    process.stdout.write(generateSql(rows));
  } else {
    process.stderr.write(
      `⚠️  Truncating patients / gestantes_data / tuberculose_data / has_data on ${target}.\n`,
    );
    await applyToDb(rows);
  }

  const counts = {
    patients: rows.patients.length,
    gestantes: rows.gestantes.length,
    tuberculose: rows.tuberculose.length,
    has: rows.has.length,
    skipped: rows.skipped,
  };
  process.stderr.write(
    `Seed complete. patients=${counts.patients} gestantes=${counts.gestantes} tuberculose=${counts.tuberculose} has=${counts.has} skipped=${JSON.stringify(
      counts.skipped,
    )}\n`,
  );
}

void main().catch((err) => {
  console.error("Seed failed:", err instanceof Error ? err.message : String(err));
  process.exit(1);
});
