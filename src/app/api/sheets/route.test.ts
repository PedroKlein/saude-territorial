/**
 * TDD Red Phase — GET /api/sheets route handler contract
 *
 * These tests define the expected behaviour of app/api/sheets/route.ts.
 * They will FAIL until the implementation is written.
 *
 * Contracts:
 *  - GET /api/sheets returns a JSON list of discovered tab metadata when the
 *    caller has a valid session
 *  - GET /api/sheets returns 401 when there is no active session
 *  - GET /api/sheets returns 400 when the session exists but no spreadsheetId
 *    has been configured for the user
 *  - The route uses `getGoogleAccessToken()` from lib/auth and
 *    `discoverTabs()` from lib/sheets/discovery
 *  - Response body for 200 is JSON: `{ tabs: TabMetadata[] }`
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Mocks — must be hoisted before any import of the module under test
// ---------------------------------------------------------------------------

// Mock Better Auth so lib/auth can be imported in the test environment
vi.mock("better-auth", () => ({
  betterAuth: vi.fn(() => ({
    api: {
      getSession: vi.fn(),
      getAccessToken: vi.fn(),
    },
  })),
}));

vi.mock("better-auth/next-js", () => ({
  nextCookies: vi.fn(() => ({})),
  toNextJsHandler: vi.fn(() => ({ GET: vi.fn(), POST: vi.fn() })),
}));

vi.mock("pg", () => ({
  Pool: vi.fn().mockImplementation(() => ({})),
}));

vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));

// Mock lib/auth so we can control session + token behaviour per test
const mockGetGoogleAccessToken = vi.fn();
const mockGetSession = vi.fn();

vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: mockGetSession,
    },
  },
  getGoogleAccessToken: mockGetGoogleAccessToken,
}));

// Mock googleapis (used by discoverTabs inside lib/sheets/discovery)
const mockSpreadsheetsGet = vi.fn();

vi.mock("googleapis", () => ({
  google: {
    sheets: () => ({
      spreadsheets: {
        get: mockSpreadsheetsGet,
      },
    }),
    auth: {
      OAuth2: class MockOAuth2 {
        setCredentials = vi.fn();
      },
    },
  },
}));

// Mock lib/sheets/discovery so route tests stay isolated
const mockDiscoverTabs = vi.fn();

vi.mock("@/lib/sheets/discovery", () => ({
  discoverTabs: mockDiscoverTabs,
}));

// ---------------------------------------------------------------------------
// Fake session / user (synthetic — not a real user)
// ---------------------------------------------------------------------------

const FAKE_SESSION = {
  user: {
    id: "fake-user-id-000",
    email: "test.user.ficticio@example.com",
    name: "Usuário Fictício de Teste",
  },
  session: { id: "fake-session-id-000" },
};

const FAKE_SPREADSHEET_ID = "fake-spreadsheet-id-route-000";

const FAKE_TAB_METADATA = [
  { title: "Gestantes", rowCount: 42, columnCount: 16 },
  { title: "DM", rowCount: 20, columnCount: 12 },
];

// ---------------------------------------------------------------------------
// Helper: build a synthetic NextRequest
// ---------------------------------------------------------------------------

function makeRequest(url = "http://localhost/api/sheets"): NextRequest {
  return new NextRequest(url, { method: "GET" });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("GET /api/sheets", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // 200 — authenticated, spreadsheet configured
  // -------------------------------------------------------------------------

  it("returns 200 with a list of tabs when session is valid and spreadsheetId is set", async () => {
    mockGetSession.mockResolvedValue(FAKE_SESSION);
    mockGetGoogleAccessToken.mockResolvedValue("fake-access-token");
    mockDiscoverTabs.mockResolvedValue(FAKE_TAB_METADATA);

    // Pass spreadsheetId as a query param (implementation detail, part of contract)
    const req = makeRequest(
      `http://localhost/api/sheets?spreadsheetId=${FAKE_SPREADSHEET_ID}`
    );

    const { GET } = await import("@/app/api/sheets/route");
    const response = await GET(req);

    expect(response.status).toBe(200);

    const body = (await response.json()) as { tabs: unknown[] };
    expect(body).toHaveProperty("tabs");
    expect(Array.isArray(body.tabs)).toBe(true);
    expect(body.tabs).toHaveLength(2);
  });

  it("response body contains title, rowCount, and columnCount per tab", async () => {
    mockGetSession.mockResolvedValue(FAKE_SESSION);
    mockGetGoogleAccessToken.mockResolvedValue("fake-access-token");
    mockDiscoverTabs.mockResolvedValue(FAKE_TAB_METADATA);

    const req = makeRequest(
      `http://localhost/api/sheets?spreadsheetId=${FAKE_SPREADSHEET_ID}`
    );

    const { GET } = await import("@/app/api/sheets/route");
    const response = await GET(req);
    const body = (await response.json()) as {
      tabs: Array<{ title: string; rowCount: number; columnCount: number }>;
    };

    expect(body.tabs[0].title).toBe("Gestantes");
    expect(body.tabs[0].rowCount).toBe(42);
    expect(body.tabs[0].columnCount).toBe(16);
  });

  it("calls discoverTabs with the access token and spreadsheetId from the request", async () => {
    mockGetSession.mockResolvedValue(FAKE_SESSION);
    mockGetGoogleAccessToken.mockResolvedValue("fake-access-token");
    mockDiscoverTabs.mockResolvedValue([]);

    const req = makeRequest(
      `http://localhost/api/sheets?spreadsheetId=${FAKE_SPREADSHEET_ID}`
    );

    const { GET } = await import("@/app/api/sheets/route");
    await GET(req);

    expect(mockDiscoverTabs).toHaveBeenCalledTimes(1);
    const [, spreadsheetIdArg] = mockDiscoverTabs.mock.calls[0] as [
      unknown,
      string,
    ];
    expect(spreadsheetIdArg).toBe(FAKE_SPREADSHEET_ID);
  });

  // -------------------------------------------------------------------------
  // 401 — no session
  // -------------------------------------------------------------------------

  it("returns 401 when there is no active session", async () => {
    mockGetSession.mockResolvedValue(null); // no session

    const req = makeRequest(
      `http://localhost/api/sheets?spreadsheetId=${FAKE_SPREADSHEET_ID}`
    );

    const { GET } = await import("@/app/api/sheets/route");
    const response = await GET(req);

    expect(response.status).toBe(401);
  });

  it("does not call discoverTabs when there is no session", async () => {
    mockGetSession.mockResolvedValue(null);

    const req = makeRequest(
      `http://localhost/api/sheets?spreadsheetId=${FAKE_SPREADSHEET_ID}`
    );

    const { GET } = await import("@/app/api/sheets/route");
    await GET(req);

    expect(mockDiscoverTabs).not.toHaveBeenCalled();
  });

  it("returns JSON body with an error message on 401", async () => {
    mockGetSession.mockResolvedValue(null);

    const req = makeRequest(
      `http://localhost/api/sheets?spreadsheetId=${FAKE_SPREADSHEET_ID}`
    );

    const { GET } = await import("@/app/api/sheets/route");
    const response = await GET(req);

    const body = (await response.json()) as { error: string };
    expect(body).toHaveProperty("error");
    expect(typeof body.error).toBe("string");
    expect(body.error.length).toBeGreaterThan(0);
  });

  // -------------------------------------------------------------------------
  // 400 — no spreadsheetId
  // -------------------------------------------------------------------------

  it("returns 400 when the spreadsheetId query param is missing", async () => {
    mockGetSession.mockResolvedValue(FAKE_SESSION);
    mockGetGoogleAccessToken.mockResolvedValue("fake-access-token");

    const req = makeRequest("http://localhost/api/sheets"); // no spreadsheetId

    const { GET } = await import("@/app/api/sheets/route");
    const response = await GET(req);

    expect(response.status).toBe(400);
  });

  it("returns JSON body with an error message on 400", async () => {
    mockGetSession.mockResolvedValue(FAKE_SESSION);
    mockGetGoogleAccessToken.mockResolvedValue("fake-access-token");

    const req = makeRequest("http://localhost/api/sheets");

    const { GET } = await import("@/app/api/sheets/route");
    const response = await GET(req);

    const body = (await response.json()) as { error: string };
    expect(body).toHaveProperty("error");
    expect(typeof body.error).toBe("string");
  });

  // -------------------------------------------------------------------------
  // 200 with zero tabs (valid but empty spreadsheet)
  // -------------------------------------------------------------------------

  it("returns 200 with an empty tabs array when the spreadsheet has no visible tabs", async () => {
    mockGetSession.mockResolvedValue(FAKE_SESSION);
    mockGetGoogleAccessToken.mockResolvedValue("fake-access-token");
    mockDiscoverTabs.mockResolvedValue([]); // no visible tabs

    const req = makeRequest(
      `http://localhost/api/sheets?spreadsheetId=${FAKE_SPREADSHEET_ID}`
    );

    const { GET } = await import("@/app/api/sheets/route");
    const response = await GET(req);

    expect(response.status).toBe(200);
    const body = (await response.json()) as { tabs: unknown[] };
    expect(body.tabs).toEqual([]);
  });
});
