/**
 * TDD Red Phase — Google Sheets URL parser contract
 *
 * These tests define the expected behaviour of lib/sheets/url-parser.ts.
 * They will FAIL until the implementation is written.
 *
 * Contract:
 *  - `extractSpreadsheetId` accepts a URL string and returns the spreadsheet ID
 *    when the URL is a valid Google Sheets URL, or null otherwise.
 *  - The ID is the segment that appears between /d/ and the next / (or end of path).
 */

import { describe, it, expect } from "vitest";
import { extractSpreadsheetId } from "@/lib/sheets/url-parser";

describe("extractSpreadsheetId", () => {
  // -----------------------------------------------------------------------
  // Valid URL formats
  // -----------------------------------------------------------------------

  it("extracts ID from a standard /edit URL", () => {
    const url =
      "https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms/edit";
    expect(extractSpreadsheetId(url)).toBe(
      "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms"
    );
  });

  it("extracts ID from a URL without a trailing path segment (no /edit)", () => {
    const url =
      "https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms";
    expect(extractSpreadsheetId(url)).toBe(
      "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms"
    );
  });

  it("extracts ID from a URL that has a gid query param (sheet tab)", () => {
    const url =
      "https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms/edit#gid=0";
    expect(extractSpreadsheetId(url)).toBe(
      "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms"
    );
  });

  it("extracts ID from a URL with multiple query params", () => {
    const url =
      "https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms/edit?usp=sharing&ouid=12345#gid=1";
    expect(extractSpreadsheetId(url)).toBe(
      "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms"
    );
  });

  it("extracts ID from a /pub URL (published spreadsheet)", () => {
    const url =
      "https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms/pub";
    expect(extractSpreadsheetId(url)).toBe(
      "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms"
    );
  });

  it("extracts ID from a URL with a trailing slash after the ID", () => {
    const url =
      "https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms/";
    expect(extractSpreadsheetId(url)).toBe(
      "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms"
    );
  });

  // -----------------------------------------------------------------------
  // Invalid or malformed inputs — must return null
  // -----------------------------------------------------------------------

  it("returns null for an empty string", () => {
    expect(extractSpreadsheetId("")).toBeNull();
  });

  it("returns null for a completely unrelated URL", () => {
    expect(extractSpreadsheetId("https://example.com/some/path")).toBeNull();
  });

  it("returns null for a Google Docs (not Sheets) URL", () => {
    const url =
      "https://docs.google.com/document/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms/edit";
    expect(extractSpreadsheetId(url)).toBeNull();
  });

  it("returns null for a URL that is missing the /d/ segment", () => {
    const url = "https://docs.google.com/spreadsheets/edit";
    expect(extractSpreadsheetId(url)).toBeNull();
  });

  it("returns null for a short malformed URL", () => {
    expect(extractSpreadsheetId("https://docs.google.com/spreadsheets/d/")).toBeNull();
  });

  it("returns null for plain text (not a URL at all)", () => {
    expect(extractSpreadsheetId("não é uma url")).toBeNull();
  });

  it("returns null for a URL with only whitespace as the ID segment", () => {
    // Edge case: /d/  /edit — the segment between /d/ and /edit is empty after trim
    expect(extractSpreadsheetId("https://docs.google.com/spreadsheets/d/ /edit")).toBeNull();
  });
});
