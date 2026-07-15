import { google } from "googleapis";
import Database from "better-sqlite3";
import { readFileSync } from "fs";

async function main() {
  const envContent = readFileSync(".env.local", "utf-8");
  for (const line of envContent.split("\n")) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) { process.env[match[1].trim()] = match[2].trim(); }
  }

  const db = new Database("auth.db");
  const acct = db.prepare("SELECT refreshToken FROM account WHERE providerId='google' LIMIT 1").get() as any;
  db.close();

  const oauth2 = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
  oauth2.setCredentials({ refresh_token: acct.refreshToken });

  const sheets = google.sheets({ version: "v4", auth: oauth2 });
  const spreadsheetId = "1Ub7kagnXCfE62oVNWSz0-0VStzVHV1lsil6Wn-2jqrU";

  // Find and delete our seeded tabs (they duplicate existing ones)
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const seededTabs = ["Gestantes", "Tuberculose", "DM", "HAS", "Domiciliados Acamados"];
  
  // Only delete tabs that are EXACT matches to our seeded names 
  // and are duplicates of existing differently-named tabs
  const sheetsToDelete = meta.data.sheets?.filter(s => {
    const title = s.properties?.title ?? "";
    // "Domiciliados Acamados" is our duplicate of "Domiciliados/Acamados"
    return title === "Domiciliados Acamados";
  }) ?? [];

  if (sheetsToDelete.length === 0) {
    console.log("No duplicate tabs to clean up.");
    return;
  }

  const requests = sheetsToDelete.map(s => ({
    deleteSheet: { sheetId: s.properties?.sheetId }
  }));

  await sheets.spreadsheets.batchUpdate({ spreadsheetId, requestBody: { requests } });
  console.log("Cleaned up:", sheetsToDelete.map(s => s.properties?.title).join(", "));
}

main().catch(e => { console.error(e.message); process.exit(1); });
