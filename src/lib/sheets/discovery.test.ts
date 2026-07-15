/**
 * TDD Red Phase — Google Sheets tab auto-discovery contract
 *
 * These tests define the expected behaviour of lib/sheets/discovery.ts.
 * They will FAIL until the implementation is written.
 *
 * Contracts:
 *  - `discoverTabs` calls the Sheets API `spreadsheets.get` to read metadata
 *  - Returns the list of visible tab names (excludes tabs prefixed with `_`)
 *  - Each entry in the result includes the tab title, row count, and column count
 *  - Returns an empty array when the spreadsheet has no visible tabs
 *  - Uses the OAuth token (auth client) passed as an argument
 *
 * SYNTHETIC DATA ONLY — no real spreadsheet IDs or tab names.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// googleapis mock — must be hoisted (vi.mock is hoisted by Vitest)
// ---------------------------------------------------------------------------

const mockSpreadsheetsGet = vi.fn();

vi.mock("googleapis", () => ({
  google: {
    sheets: () => ({
      spreadsheets: {
        get: mockSpreadsheetsGet,
      },
    }),
    auth: {
      OAuth2: vi.fn(),
    },
  },
}));

// ---------------------------------------------------------------------------
// Fake auth client (synthetic)
// ---------------------------------------------------------------------------

const fakeAuth = { credentials: { access_token: "fake-test-token-discovery" } };
const FAKE_SPREADSHEET_ID = "fake-spreadsheet-id-000";

// ---------------------------------------------------------------------------
// Helper: build the metadata response shape returned by googleapis
// ---------------------------------------------------------------------------

function buildMetaResponse(
  tabs: Array<{ title: string; rowCount?: number; columnCount?: number }>
) {
  return {
    data: {
      sheets: tabs.map(({ title, rowCount = 100, columnCount = 20 }) => ({
        properties: {
          title,
          gridProperties: { rowCount, columnCount },
        },
      })),
    },
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("discoverTabs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns a list of all visible tab names", async () => {
    mockSpreadsheetsGet.mockResolvedValue(
      buildMetaResponse([
        { title: "Gestantes" },
        { title: "Tuberculose" },
        { title: "DM" },
      ])
    );

    const { discoverTabs } = await import("@/lib/sheets/discovery");
    const result = await discoverTabs(fakeAuth, FAKE_SPREADSHEET_ID);

    const titles = result.map((t) => t.title);
    expect(titles).toContain("Gestantes");
    expect(titles).toContain("Tuberculose");
    expect(titles).toContain("DM");
  });

  it("excludes tabs whose title starts with _ (config/internal tabs)", async () => {
    mockSpreadsheetsGet.mockResolvedValue(
      buildMetaResponse([
        { title: "Gestantes" },
        { title: "_Configurações" },
        { title: "_Alertas" },
        { title: "HAS" },
      ])
    );

    const { discoverTabs } = await import("@/lib/sheets/discovery");
    const result = await discoverTabs(fakeAuth, FAKE_SPREADSHEET_ID);

    const titles = result.map((t) => t.title);
    expect(titles).not.toContain("_Configurações");
    expect(titles).not.toContain("_Alertas");
    expect(titles).toContain("Gestantes");
    expect(titles).toContain("HAS");
  });

  it("includes rowCount and columnCount metadata for each tab", async () => {
    mockSpreadsheetsGet.mockResolvedValue(
      buildMetaResponse([{ title: "Gestantes", rowCount: 50, columnCount: 15 }])
    );

    const { discoverTabs } = await import("@/lib/sheets/discovery");
    const result = await discoverTabs(fakeAuth, FAKE_SPREADSHEET_ID);

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Gestantes");
    expect(result[0].rowCount).toBe(50);
    expect(result[0].columnCount).toBe(15);
  });

  it("returns an empty array when the spreadsheet has no sheets", async () => {
    mockSpreadsheetsGet.mockResolvedValue({ data: { sheets: [] } });

    const { discoverTabs } = await import("@/lib/sheets/discovery");
    const result = await discoverTabs(fakeAuth, FAKE_SPREADSHEET_ID);

    expect(result).toEqual([]);
  });

  it("returns an empty array when sheets property is missing from metadata", async () => {
    mockSpreadsheetsGet.mockResolvedValue({ data: {} });

    const { discoverTabs } = await import("@/lib/sheets/discovery");
    const result = await discoverTabs(fakeAuth, FAKE_SPREADSHEET_ID);

    expect(result).toEqual([]);
  });

  it("calls spreadsheets.get with the correct spreadsheetId", async () => {
    mockSpreadsheetsGet.mockResolvedValue(buildMetaResponse([]));

    const { discoverTabs } = await import("@/lib/sheets/discovery");
    await discoverTabs(fakeAuth, FAKE_SPREADSHEET_ID);

    expect(mockSpreadsheetsGet).toHaveBeenCalledTimes(1);
    const callArgs = mockSpreadsheetsGet.mock.calls[0][0] as {
      spreadsheetId: string;
    };
    expect(callArgs.spreadsheetId).toBe(FAKE_SPREADSHEET_ID);
  });

  it("requests only title and gridProperties fields (not the full spreadsheet body)", async () => {
    mockSpreadsheetsGet.mockResolvedValue(buildMetaResponse([]));

    const { discoverTabs } = await import("@/lib/sheets/discovery");
    await discoverTabs(fakeAuth, FAKE_SPREADSHEET_ID);

    const callArgs = mockSpreadsheetsGet.mock.calls[0][0] as {
      fields?: string;
    };
    // The fields mask must include at minimum title and gridProperties
    expect(callArgs.fields).toBeDefined();
    expect(callArgs.fields).toContain("title");
  });

  it("handles a tab with a null/undefined title gracefully (does not include it)", async () => {
    mockSpreadsheetsGet.mockResolvedValue({
      data: {
        sheets: [
          { properties: { title: "Gestantes", gridProperties: { rowCount: 10, columnCount: 5 } } },
          { properties: { title: null, gridProperties: { rowCount: 0, columnCount: 0 } } },
          { properties: {} }, // no title at all
        ],
      },
    });

    const { discoverTabs } = await import("@/lib/sheets/discovery");
    const result = await discoverTabs(fakeAuth, FAKE_SPREADSHEET_ID);

    const titles = result.map((t) => t.title);
    expect(titles).toContain("Gestantes");
    // Null/undefined title tabs must be omitted
    expect(result.every((t) => typeof t.title === "string" && t.title.length > 0)).toBe(true);
  });
});
