# Google APIs — Findings & Gotchas

## OAuth2Client Required

The `googleapis` library requires a **real OAuth2Client instance**, not a plain object:

```typescript
// ❌ WRONG — causes "authClient.request is not a function"
const authClient = { credentials: { access_token: token } };

// ✅ CORRECT
import { google } from "googleapis";
const oauth2Client = new google.auth.OAuth2();
oauth2Client.setCredentials({ access_token: token });
```

Then pass `oauth2Client` as the `auth` parameter to any Google API.

## Sheets API Must Be Enabled

Even with valid credentials, you'll get a 403 error if the Sheets API isn't enabled:

```
Error: Google Sheets API has not been used in project XXXXX before or it is disabled.
Enable it by visiting https://console.developers.google.com/apis/api/sheets.googleapis.com/overview?project=XXXXX
```

**Always enable the Sheets API** in Google Cloud Console before testing.

## OAuth Redirect URI

The exact redirect URI for Better Auth + Google:
```
http://localhost:3000/api/auth/callback/google
```

Must also set Authorized JavaScript origins:
```
http://localhost:3000
```

## Spreadsheet ID Extraction

Google Sheets URL format:
```
https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/edit#gid=0
```

The `url-parser.ts` module extracts the ID between `/d/` and the next `/`.

## Rate Limits

- Sheets API: 300 reads/min, 60 writes/min per project
- Retry on 429 with exponential backoff
- Our client implements token bucket rate limiting

## Tab Discovery

`spreadsheets.get` with `fields: "sheets.properties.title,sheets.properties.gridProperties"`
returns tab metadata without reading any cell data. Lightweight and fast.

Tabs prefixed with `_` are treated as internal/config tabs and filtered out.
