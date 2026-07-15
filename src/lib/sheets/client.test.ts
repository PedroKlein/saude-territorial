/**
 * TDD Red Phase — Google Sheets API client contract
 *
 * These tests define the expected behaviour of lib/sheets/client.ts.
 * They will FAIL until the implementation is written.
 *
 * Contracts:
 *  - `readSheetRange` reads values from a specified A1-notation range and returns
 *    the raw string[][] from the Sheets API
 *  - `batchReadTabs` reads multiple ranges in a single API call and returns a Map
 *    keyed by tab name
 *  - On HTTP 429 (rate limit), the client retries with exponential backoff (max 3
 *    retries) and eventually resolves
 *  - On HTTP 429 with more than 3 retries exhausted, it throws a RateLimitError
 *  - The OAuth token is taken from the auth parameter passed to each function
 *    (never hardcoded or read from environment)
 *
 * SYNTHETIC DATA ONLY — no real spreadsheet IDs or patient records.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// googleapis mock — must be hoisted (vi.mock is hoisted by Vitest)
// ---------------------------------------------------------------------------

const mockValuesGet = vi.fn();
const mockValuesBatchGet = vi.fn();

vi.mock("googleapis", () => ({
  google: {
    sheets: () => ({
      spreadsheets: {
        values: {
          get: mockValuesGet,
          batchGet: mockValuesBatchGet,
        },
      },
    }),
    auth: {
      OAuth2: vi.fn(),
    },
  },
}));

// ---------------------------------------------------------------------------
// Fake auth client (synthetic — not a real token)
// ---------------------------------------------------------------------------

const fakeAuth = { credentials: { access_token: "fake-test-token-client" } };
const FAKE_SPREADSHEET_ID = "fake-spreadsheet-id-client-000";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Simulate a 429 error response in the googleapis style */
function make429Error() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const err: any = new Error("Quota exceeded for quota metric");
  err.code = 429;
  err.response = { status: 429 };
  return err;
}

// ---------------------------------------------------------------------------
// readSheetRange
// ---------------------------------------------------------------------------

describe("readSheetRange", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the string[][] values from the Sheets API", async () => {
    mockValuesGet.mockResolvedValue({
      data: {
        values: [
          ["Nome", "CNS", "Rua"],
          ["Maria Fictícia (teste)", "000000000000001", "Rua Fictícia de Teste"],
        ],
      },
    });

    const { readSheetRange } = await import("@/lib/sheets/client");
    const result = await readSheetRange(
      fakeAuth,
      FAKE_SPREADSHEET_ID,
      "'Gestantes'!A1:Z100"
    );

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual(["Nome", "CNS", "Rua"]);
    expect(result[1][0]).toBe("Maria Fictícia (teste)");
  });

  it("returns an empty array when the sheet range has no data", async () => {
    mockValuesGet.mockResolvedValue({ data: {} }); // no `values` key

    const { readSheetRange } = await import("@/lib/sheets/client");
    const result = await readSheetRange(
      fakeAuth,
      FAKE_SPREADSHEET_ID,
      "'Gestantes'!A1:Z100"
    );

    expect(result).toEqual([]);
  });

  it("calls spreadsheets.values.get with the correct spreadsheetId and range", async () => {
    mockValuesGet.mockResolvedValue({ data: { values: [] } });

    const { readSheetRange } = await import("@/lib/sheets/client");
    await readSheetRange(fakeAuth, FAKE_SPREADSHEET_ID, "'DM'!A1:Z50");

    expect(mockValuesGet).toHaveBeenCalledTimes(1);
    const callArgs = mockValuesGet.mock.calls[0][0] as {
      spreadsheetId: string;
      range: string;
    };
    expect(callArgs.spreadsheetId).toBe(FAKE_SPREADSHEET_ID);
    expect(callArgs.range).toBe("'DM'!A1:Z50");
  });

  it("retries on a 429 error and eventually resolves", async () => {
    // Fail twice with 429, then succeed on third call
    mockValuesGet
      .mockRejectedValueOnce(make429Error())
      .mockRejectedValueOnce(make429Error())
      .mockResolvedValue({
        data: {
          values: [
            ["Nome", "CNS"],
            ["Carlos Fictício (teste)", "000000000000003"],
          ],
        },
      });

    const { readSheetRange } = await import("@/lib/sheets/client");
    const result = await readSheetRange(
      fakeAuth,
      FAKE_SPREADSHEET_ID,
      "'HAS'!A1:Z100"
    );

    expect(result[1][0]).toBe("Carlos Fictício (teste)");
    expect(mockValuesGet).toHaveBeenCalledTimes(3);
  }, 15_000); // allow time for backoff

  it("throws a RateLimitError after exhausting retries (more than 3 consecutive 429s)", async () => {
    mockValuesGet.mockRejectedValue(make429Error()); // always 429

    const { readSheetRange, RateLimitError } = await import("@/lib/sheets/client");

    await expect(
      readSheetRange(fakeAuth, FAKE_SPREADSHEET_ID, "'Gestantes'!A1:Z100")
    ).rejects.toBeInstanceOf(RateLimitError);
  }, 15_000);

  it("does NOT retry on a non-429 error (e.g. 403 permission denied)", async () => {
    const permissionError = new Error("The caller does not have permission");
    (permissionError as { response?: { status: number } }).response = { status: 403 };
    mockValuesGet.mockRejectedValue(permissionError);

    const { readSheetRange } = await import("@/lib/sheets/client");

    await expect(
      readSheetRange(fakeAuth, FAKE_SPREADSHEET_ID, "'Gestantes'!A1:Z100")
    ).rejects.toThrow();

    // Should NOT have retried — only one call
    expect(mockValuesGet).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// batchReadTabs
// ---------------------------------------------------------------------------

describe("batchReadTabs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("makes a single batchGet API call for multiple tabs", async () => {
    mockValuesBatchGet.mockResolvedValue({
      data: {
        valueRanges: [
          {
            range: "'Gestantes'!A1:ZZ",
            values: [
              ["Nome", "CNS"],
              ["Maria Fictícia (teste)", "000000000000001"],
            ],
          },
          {
            range: "'DM'!A1:ZZ",
            values: [
              ["Nome", "CNS"],
              ["João Fictício (teste)", "000000000000002"],
            ],
          },
        ],
      },
    });

    const { batchReadTabs } = await import("@/lib/sheets/client");
    const result = await batchReadTabs(fakeAuth, FAKE_SPREADSHEET_ID, [
      "Gestantes",
      "DM",
    ]);

    // Must have called batchGet exactly once (not one call per tab)
    expect(mockValuesBatchGet).toHaveBeenCalledTimes(1);

    // Result is a Map keyed by tab name
    expect(result instanceof Map).toBe(true);
    expect(result.has("Gestantes")).toBe(true);
    expect(result.has("DM")).toBe(true);
  });

  it("maps each tab name to its corresponding string[][] rows", async () => {
    mockValuesBatchGet.mockResolvedValue({
      data: {
        valueRanges: [
          {
            range: "'Gestantes'!A1:ZZ",
            values: [
              ["Nome", "CNS"],
              ["Maria Fictícia (teste)", "000000000000001"],
            ],
          },
        ],
      },
    });

    const { batchReadTabs } = await import("@/lib/sheets/client");
    const result = await batchReadTabs(fakeAuth, FAKE_SPREADSHEET_ID, [
      "Gestantes",
    ]);

    const rows = result.get("Gestantes")!;
    expect(rows[0]).toEqual(["Nome", "CNS"]);
    expect(rows[1][0]).toBe("Maria Fictícia (teste)");
  });

  it("maps an empty valueRange to an empty array (no data rows)", async () => {
    mockValuesBatchGet.mockResolvedValue({
      data: {
        valueRanges: [{ range: "'DM'!A1:ZZ" }], // no `values` key
      },
    });

    const { batchReadTabs } = await import("@/lib/sheets/client");
    const result = await batchReadTabs(fakeAuth, FAKE_SPREADSHEET_ID, ["DM"]);

    expect(result.get("DM")).toEqual([]);
  });

  it("returns an empty Map when called with an empty tab list", async () => {
    const { batchReadTabs } = await import("@/lib/sheets/client");
    const result = await batchReadTabs(fakeAuth, FAKE_SPREADSHEET_ID, []);

    expect(result instanceof Map).toBe(true);
    expect(result.size).toBe(0);
    expect(mockValuesBatchGet).not.toHaveBeenCalled();
  });

  it("passes the correct ranges (A1:ZZ per tab) to batchGet", async () => {
    mockValuesBatchGet.mockResolvedValue({ data: { valueRanges: [] } });

    const { batchReadTabs } = await import("@/lib/sheets/client");
    await batchReadTabs(fakeAuth, FAKE_SPREADSHEET_ID, ["Gestantes", "HAS"]);

    const callArgs = mockValuesBatchGet.mock.calls[0][0] as {
      ranges: string[];
    };
    expect(callArgs.ranges).toContain("'Gestantes'!A1:ZZ");
    expect(callArgs.ranges).toContain("'HAS'!A1:ZZ");
  });
});
