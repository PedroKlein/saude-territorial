/**
 * Seed a Google Sheet with synthetic patient data for development testing.
 *
 * Usage:
 *   pnpm tsx scripts/seed-sheet.ts <SPREADSHEET_ID>
 *
 * Prerequisites:
 *   - A Google Sheet already created (just an empty one)
 *   - You must have logged in to the app at least once (so auth.db has your refresh token)
 *   - The sheet must be shared with your Google account (Editor access)
 *
 * What it does:
 *   - Creates tabs: Gestantes, Tuberculose, DM, HAS, Domiciliados Acamados
 *   - Populates each with synthetic patient data matching the column headers
 *     the app expects (from src/lib/sheets/parser.ts column mapping)
 *   - Includes scenarios to test alerts, dedup, and urgency
 *
 * LGPD: All data is 100% synthetic. Names are fictional.
 */

import { google } from "googleapis";
import Database from "better-sqlite3";
import path from "path";
import { readFileSync } from "fs";

// Load .env.local
const envPath = path.join(process.cwd(), ".env.local");
try {
  const envContent = readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim();
      if (!process.env[key]) process.env[key] = value;
    }
  }
} catch {
  console.warn("⚠️  Could not load .env.local");
}

// ─────────────────────────────────────────────────────────────────
// Auth: get access token from auth.db (same as dev-session endpoint)
// ─────────────────────────────────────────────────────────────────

function getAccessToken(): string {
  const dbPath = path.join(process.cwd(), "auth.db");
  const db = new Database(dbPath, { readonly: false });

  try {
    const account = db
      .prepare(
        `SELECT refreshToken FROM account WHERE providerId = 'google' LIMIT 1`
      )
      .get() as { refreshToken: string } | undefined;

    if (!account) {
      throw new Error(
        "No Google account in auth.db. Log in via the app first."
      );
    }

    // We'll use the refresh token to get a fresh access token
    return account.refreshToken;
  } finally {
    db.close();
  }
}

async function getAuthedSheets() {
  const refreshToken = getAccessToken();

  const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  oauth2.setCredentials({ refresh_token: refreshToken });

  // Refresh the token
  const { credentials } = await oauth2.refreshAccessToken();
  oauth2.setCredentials(credentials);

  return google.sheets({ version: "v4", auth: oauth2 });
}

// ─────────────────────────────────────────────────────────────────
// Synthetic data — real streets near US Moab Caldas
// ─────────────────────────────────────────────────────────────────

function daysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

const STREETS = [
  { rua: "Avenida Moab Caldas", num: "220", ma: "MA1" },
  { rua: "Rua Gabriel Fialho Camargo", num: "88", ma: "MA1" },
  { rua: "Rua Abelardo Marquês", num: "167", ma: "MA1" },
  { rua: "Rua Januário Scalzilli", num: "45", ma: "MA2" },
  { rua: "Rua Felipe Weimann", num: "150", ma: "MA2" },
  { rua: "Rua Professor Manoel Lobato", num: "92", ma: "MA2" },
  { rua: "Avenida Deputado Aramy Silva", num: "310", ma: "MA2" },
  { rua: "Rua Nossa Senhora do Brasil", num: "55", ma: "MA3" },
  { rua: "Rua Mutualidade", num: "200", ma: "MA3" },
  { rua: "Rua Corrêa Lima", num: "78", ma: "MA3" },
  { rua: "Rua Cruzeiro do Sul", num: "400", ma: "MA4" },
  { rua: "Rua Aracy de Azevedo José", num: "112", ma: "MA4" },
  { rua: "Avenida Joracy Camargo", num: "340", ma: "MA4" },
  { rua: "Rua Flores", num: "55", ma: "MA5" },
  { rua: "Rua Caixa Econômica", num: "33", ma: "MA5" },
];

function pickStreet(index: number) {
  return STREETS[index % STREETS.length];
}

// ─────────────────────────────────────────────────────────────────
// Tab data generators
// ─────────────────────────────────────────────────────────────────

type Row = string[];

function gestantesTab(): { headers: Row; rows: Row[] } {
  const headers = [
    "Data última atualização",
    "Nome",
    "CNS",
    "Data de Nascimento",
    "Idade",
    "Telefone",
    "Rua",
    "Número",
    "Complemento",
    "Microárea",
    "DUM",
    "DPP",
    "Risco",
    "IG",
  ];

  const rows: Row[] = [
    // Critical: overdue >30 days, high risk
    [daysAgo(45), "Ana Beatriz Oliveira", "100000000000001", "15/03/1998", "28", "51 998001001", "Avenida Moab Caldas", "220", "", "MA1", "10/01/2026", "17/10/2026", "Alto", "24"],
    // Critical: IG > 40
    [daysAgo(5), "Carla Souza Mendes", "100000000000002", "22/07/1995", "31", "51 998001002", "Rua Gabriel Fialho Camargo", "88", "", "MA1", "01/09/2025", "08/06/2026", "Alto", "42"],
    // Attention: 18 days since update
    [daysAgo(18), "Daniela Ferreira Lima", "100000000000003", "03/11/2001", "24", "51 998001003", "Rua Januário Scalzilli", "45", "", "MA2", "15/03/2026", "20/12/2026", "Habitual", "16"],
    // Normal
    [daysAgo(3), "Eduarda Santos Rocha", "100000000000004", "19/05/1999", "27", "51 998001004", "Rua Felipe Weimann", "150", "", "MA2", "20/04/2026", "25/01/2027", "Habitual", "12"],
    // Normal
    [daysAgo(7), "Fernanda Costa Alves", "100000000000005", "28/01/1993", "33", "51 998001005", "Rua Nossa Senhora do Brasil", "310", "Apt 201", "MA3", "01/05/2026", "05/02/2027", "Habitual", "10"],
    // Critical: empty DUM
    [daysAgo(2), "Gabriela Martins Dias", "100000000000006", "12/09/2003", "22", "51 998001006", "Rua Cruzeiro do Sul", "78", "", "MA4", "", "", "Alto", ""],
    // Normal
    [daysAgo(10), "Helena Ribeiro Pereira", "100000000000007", "05/06/1997", "29", "51 998001007", "Rua Flores", "55", "", "MA5", "25/02/2026", "02/12/2026", "Habitual", "19"],
    // Normal
    [daysAgo(1), "Isabela Moreira Nunes", "100000000000008", "17/12/2000", "25", "51 998001008", "Rua Mutualidade", "200", "", "MA3", "10/04/2026", "15/01/2027", "Habitual", "13"],
    // Critical: overdue >30 days + high risk
    [daysAgo(35), "Juliana Vieira Campos", "100000000000009", "30/08/1996", "29", "51 998001009", "Avenida Joracy Camargo", "400", "", "MA4", "05/12/2025", "11/09/2026", "Alto", "30"],
    // Normal
    [daysAgo(6), "Larissa Gomes Barros", "100000000000010", "08/04/2002", "24", "51 998001010", "Rua Professor Manoel Lobato", "92", "", "MA2", "18/03/2026", "23/12/2026", "Habitual", "16"],
    // Attention: 22 days since update
    [daysAgo(22), "Mariana Teixeira Lopes", "100000000000011", "14/02/1994", "32", "51 998001011", "Rua Abelardo Marquês", "167", "", "MA1", "28/01/2026", "04/11/2026", "Habitual", "23"],
    // Normal
    [daysAgo(4), "Natália Cardoso Azevedo", "100000000000012", "25/10/2000", "25", "51 998001012", "Rua Caixa Econômica", "33", "", "MA5", "12/05/2026", "16/02/2027", "Habitual", "9"],
  ];

  return { headers, rows };
}

function tuberculoseTab(): { headers: Row; rows: Row[] } {
  const headers = [
    "Data última atualização",
    "Nome",
    "CNS",
    "Data de Nascimento",
    "Idade",
    "Telefone",
    "Rua",
    "Número",
    "Complemento",
    "Microárea",
    "Baciloscopia",
    "TRM",
    "Cultura",
    "Forma Clínica",
  ];

  const rows: Row[] = [
    [daysAgo(10), "Roberto Silva Gonçalves", "200000000000001", "10/03/1985", "41", "51 998002001", "Rua Corrêa Lima", "44", "", "MA3", "Positiva", "Detectável", "Pendente", "Pulmonar"],
    [daysAgo(3), "Marcos Andrade Pinto", "200000000000002", "22/08/1978", "47", "51 998002002", "Rua Mutualidade", "112", "", "MA3", "Negativa", "Não detectável", "Negativa", "Extrapulmonar"],
    // Critical: overdue >30 days + positive
    [daysAgo(40), "Paulo Henrique Costa", "200000000000003", "05/11/1990", "35", "51 998002003", "Avenida Deputado Aramy Silva", "280", "", "MA2", "Positiva", "Detectável", "Positiva", "Pulmonar"],
    [daysAgo(7), "Lucas Oliveira Ramos", "200000000000004", "18/06/1982", "43", "51 998002004", "Rua Felipe Weimann", "67", "", "MA2", "Negativa", "Não detectável", "Negativa", "Pulmonar"],
    // Critical: overdue >50 days + positive
    [daysAgo(60), "André Nascimento Braga", "200000000000005", "30/01/1975", "51", "51 998002005", "Rua Cruzeiro do Sul", "195", "", "MA4", "Positiva", "Detectável", "Pendente", "Pulmonar"],
  ];

  return { headers, rows };
}

function diabetesTab(): { headers: Row; rows: Row[] } {
  const headers = [
    "Data última atualização",
    "Nome",
    "CNS",
    "Data de Nascimento",
    "Idade",
    "Telefone",
    "Rua",
    "Número",
    "Complemento",
    "Microárea",
    "PMDID",
  ];

  const rows: Row[] = [
    [daysAgo(5), "Maria Aparecida Duarte", "300000000000001", "02/04/1960", "66", "51 998003001", "Rua Januário Scalzilli", "89", "", "MA2", "Sim"],
    // Overdue
    [daysAgo(35), "José Carlos Medeiros", "300000000000002", "15/09/1955", "70", "51 998003002", "Avenida Moab Caldas", "234", "", "MA1", "Não"],
    [daysAgo(12), "Antônia Pereira Machado", "300000000000003", "28/12/1968", "57", "51 998003003", "Rua Flores", "156", "", "MA5", "Sim"],
    // Very overdue
    [daysAgo(50), "Francisco Almeida Reis", "300000000000004", "07/07/1958", "67", "51 998003004", "Rua Nossa Senhora do Brasil", "401", "", "MA3", "Não"],
    [daysAgo(8), "Tereza Cristina Borges", "300000000000005", "20/02/1972", "54", "51 998003005", "Rua Aracy de Azevedo José", "78", "", "MA4", "Sim"],
    [daysAgo(25), "Sebastião Correia Neto", "300000000000006", "11/06/1963", "63", "51 998003006", "Rua Caixa Econômica", "320", "", "MA5", "Não"],
    // Cross-layer: same CNS as gestante Ana Beatriz (dedup test)
    [daysAgo(10), "Ana Beatriz Oliveira", "100000000000001", "15/03/1998", "28", "51 998001001", "Avenida Moab Caldas", "220", "", "MA1", "Sim"],
  ];

  return { headers, rows };
}

function hipertensaoTab(): { headers: Row; rows: Row[] } {
  const headers = [
    "Data última atualização",
    "Nome",
    "CNS",
    "Data de Nascimento",
    "Idade",
    "Telefone",
    "Rua",
    "Número",
    "Complemento",
    "Microárea",
    "Data última consulta",
  ];

  const rows: Row[] = [
    [daysAgo(4), "Cláudia Regina Fontes", "400000000000001", "03/05/1965", "61", "51 998004001", "Rua Gabriel Fialho Camargo", "55", "", "MA1", daysAgo(15)],
    // Critical: consulta >60 days
    [daysAgo(45), "Wilson Ferreira Santana", "400000000000002", "19/11/1958", "67", "51 998004002", "Avenida Joracy Camargo", "188", "", "MA4", daysAgo(90)],
    [daysAgo(8), "Neide Santos Vasconcelos", "400000000000003", "25/03/1970", "56", "51 998004003", "Rua Professor Manoel Lobato", "267", "", "MA2", daysAgo(20)],
    // Critical: consulta >90 days
    [daysAgo(60), "Geraldo Moura Pinheiro", "400000000000004", "14/08/1952", "73", "51 998004004", "Rua Abelardo Marquês", "99", "", "MA1", daysAgo(120)],
    [daysAgo(2), "Rita Barbosa Xavier", "400000000000005", "01/01/1975", "51", "51 998004005", "Rua Cruzeiro do Sul", "340", "", "MA4", daysAgo(7)],
    [daysAgo(30), "Osvaldo Lima Figueiredo", "400000000000006", "09/04/1948", "78", "51 998004006", "Rua Corrêa Lima", "12", "", "MA3", daysAgo(65)],
  ];

  return { headers, rows };
}

function acamadosTab(): { headers: Row; rows: Row[] } {
  const headers = [
    "Data última atualização",
    "Nome",
    "CNS",
    "Data de Nascimento",
    "Idade",
    "Telefone",
    "Rua",
    "Número",
    "Complemento",
    "Microárea",
    "Vacinas",
    "Status Visita",
  ];

  const rows: Row[] = [
    [daysAgo(3), "Dorival Cunha Tavares", "500000000000001", "06/02/1940", "86", "51 998005001", "Rua Felipe Weimann", "23", "", "MA2", "Em dia", "Visitado"],
    // Overdue + vaccine late
    [daysAgo(40), "Elvira Machado Brito", "500000000000002", "12/10/1945", "80", "51 998005002", "Rua Mutualidade", "145", "", "MA3", "Atrasada", "Pendente"],
    [daysAgo(15), "Benedito Souza Freitas", "500000000000003", "30/07/1938", "87", "51 998005003", "Avenida Moab Caldas", "78", "", "MA1", "Em dia", "Visitado"],
    // Critical: very overdue + not found
    [daysAgo(55), "Iracema Leite Nogueira", "500000000000004", "24/12/1942", "83", "51 998005004", "Rua Aracy de Azevedo José", "201", "", "MA4", "Atrasada", "Não localizado"],
  ];

  return { headers, rows };
}

// ─────────────────────────────────────────────────────────────────
// Main: write to Google Sheet
// ─────────────────────────────────────────────────────────────────

async function main() {
  const spreadsheetId = process.argv[2];

  if (!spreadsheetId) {
    console.error("Usage: pnpm tsx scripts/seed-sheet.ts <SPREADSHEET_ID>");
    console.error("");
    console.error("Steps:");
    console.error("  1. Create a new Google Sheet at https://sheets.new");
    console.error("  2. Copy the ID from the URL (between /d/ and /edit)");
    console.error("  3. Run this script with that ID");
    console.error("  4. Paste the sheet URL in the app's /settings page");
    process.exit(1);
  }

  console.log("🔐 Getting auth token from auth.db...");
  const sheets = await getAuthedSheets();

  const tabs = [
    { name: "Gestantes", data: gestantesTab() },
    { name: "Tuberculose", data: tuberculoseTab() },
    { name: "DM", data: diabetesTab() },
    { name: "HAS", data: hipertensaoTab() },
    { name: "Domiciliados Acamados", data: acamadosTab() },
  ];

  // Step 1: Create tabs (sheets)
  console.log("📋 Creating tabs...");
  const existingSheets = await sheets.spreadsheets.get({ spreadsheetId });
  const existingTitles = existingSheets.data.sheets?.map(
    (s) => s.properties?.title
  ) ?? [];

  const requests: any[] = [];
  for (const tab of tabs) {
    if (!existingTitles.includes(tab.name)) {
      requests.push({
        addSheet: { properties: { title: tab.name } },
      });
    }
  }

  // Delete default "Sheet1" if other tabs exist
  if (existingTitles.includes("Sheet1") || existingTitles.includes("Página1")) {
    const defaultSheet = existingSheets.data.sheets?.find(
      (s) =>
        s.properties?.title === "Sheet1" ||
        s.properties?.title === "Página1"
    );
    if (defaultSheet && tabs.length > 0) {
      // Only delete after we've added other sheets
      requests.push({
        deleteSheet: { sheetId: defaultSheet.properties?.sheetId },
      });
    }
  }

  if (requests.length > 0) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests },
    });
  }

  // Step 2: Write data to each tab
  for (const tab of tabs) {
    const { headers, rows } = tab.data;
    const values = [headers, ...rows];

    console.log(
      `  ✏️  ${tab.name}: ${rows.length} patients, ${headers.length} columns`
    );

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `'${tab.name}'!A1`,
      valueInputOption: "RAW",
      requestBody: { values },
    });
  }

  console.log("");
  console.log("✅ Done! Sheet populated with synthetic data.");
  console.log("");
  console.log(`📊 Summary:`);
  console.log(`   Gestantes:            12 patients (3 critical, 2 attention, 7 normal)`);
  console.log(`   Tuberculose:           5 patients (2 critical, 3 normal)`);
  console.log(`   DM (Diabetes):         7 patients (1 cross-layer dedup test)`);
  console.log(`   HAS (Hipertensão):     6 patients (2 critical overdue)`);
  console.log(`   Domiciliados Acamados: 4 patients (1 not found, 1 vaccine late)`);
  console.log("");
  console.log(`🔗 Sheet URL: https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`);
  console.log("");
  console.log(`Next steps:`);
  console.log(`  1. Open the app at http://localhost:3000/settings`);
  console.log(`  2. Paste the sheet URL`);
  console.log(`  3. Go to /map to see the markers (after geocoding)`);
}

main().catch((err) => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
