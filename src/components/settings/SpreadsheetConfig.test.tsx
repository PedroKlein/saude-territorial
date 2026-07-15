/**
 * TDD Red Phase — SpreadsheetConfig component contract
 *
 * These tests define the expected behaviour of
 * src/components/settings/SpreadsheetConfig.tsx.
 * They will FAIL until the implementation is written.
 *
 * Contract:
 *  - Renders a form with a URL text input
 *  - Displays PT-BR labels and placeholder text
 *  - Validates the URL on submit: extracts the spreadsheet ID from a valid
 *    Google Sheets URL and calls onSave with that ID
 *  - Shows a PT-BR error message for an invalid URL without calling onSave
 *
 * Supabase is mocked at the module level to prevent real DB calls.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// ---------------------------------------------------------------------------
// Module-level mocks — hoisted by Vitest before imports
// ---------------------------------------------------------------------------

vi.mock("@supabase/ssr", () => ({
  createBrowserClient: vi.fn(() => ({
    from: vi.fn(() => ({
      upsert: vi.fn().mockResolvedValue({ error: null }),
      select: vi.fn().mockResolvedValue({ data: [], error: null }),
    })),
  })),
}));

// Mock the url-parser so the component test stays unit-level.
// The parser's own correctness is covered by url-parser.test.ts.
vi.mock("@/lib/sheets/url-parser", () => ({
  extractSpreadsheetId: vi.fn((url: string) => {
    // Simulate the real parser: return an ID for valid-looking URLs, null otherwise
    const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
    return match ? match[1] : null;
  }),
}));

import { SpreadsheetConfig } from "@/components/settings/SpreadsheetConfig";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const VALID_URL =
  "https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms/edit";
const VALID_ID = "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms";
const INVALID_URL = "https://example.com/not-a-spreadsheet";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("SpreadsheetConfig", () => {
  let onSave: (spreadsheetId: string) => void;

  beforeEach(() => {
    onSave = vi.fn();
    vi.clearAllMocks();
  });

  // -----------------------------------------------------------------------
  // Rendering
  // -----------------------------------------------------------------------

  it("renders a text input for the spreadsheet URL", () => {
    render(<SpreadsheetConfig onSave={onSave} />);
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("shows the PT-BR label 'Cole a URL da planilha'", () => {
    render(<SpreadsheetConfig onSave={onSave} />);
    expect(
      screen.getByText(/Cole a URL da planilha/i)
    ).toBeInTheDocument();
  });

  it("shows a PT-BR placeholder inside the URL input", () => {
    render(<SpreadsheetConfig onSave={onSave} />);
    const input = screen.getByRole("textbox");
    expect(input).toHaveAttribute(
      "placeholder",
      expect.stringContaining("https://docs.google.com/spreadsheets/d/")
    );
  });

  it("renders a submit button with a PT-BR label", () => {
    render(<SpreadsheetConfig onSave={onSave} />);
    // Accepts "Salvar" or "Conectar planilha" — both are valid PT-BR labels
    const button = screen.getByRole("button");
    expect(button).toBeInTheDocument();
    // Must be Portuguese — not English
    expect(button.textContent).not.toMatch(/^(save|submit|connect)$/i);
  });

  // -----------------------------------------------------------------------
  // Valid URL — happy path
  // -----------------------------------------------------------------------

  it("calls onSave with the extracted spreadsheet ID when the URL is valid", async () => {
    render(<SpreadsheetConfig onSave={onSave} />);

    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: VALID_URL },
    });
    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledTimes(1);
      expect(onSave).toHaveBeenCalledWith(VALID_ID);
    });
  });

  it("does not show a validation error when the URL is valid", async () => {
    render(<SpreadsheetConfig onSave={onSave} />);

    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: VALID_URL },
    });
    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => {
      expect(
        screen.queryByRole("alert")
      ).not.toBeInTheDocument();
    });
  });

  // -----------------------------------------------------------------------
  // Invalid URL — error path
  // -----------------------------------------------------------------------

  it("shows a PT-BR error message when the URL is not a valid Google Sheets URL", async () => {
    render(<SpreadsheetConfig onSave={onSave} />);

    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: INVALID_URL },
    });
    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => {
      // The error element must be present and contain Portuguese text
      const errorEl = screen.getByRole("alert");
      expect(errorEl).toBeInTheDocument();
      expect(errorEl.textContent).not.toMatch(/^[a-zA-Z]/); // not English-only
    });
  });

  it("does not call onSave when the URL is invalid", async () => {
    render(<SpreadsheetConfig onSave={onSave} />);

    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: INVALID_URL },
    });
    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => {
      expect(onSave).not.toHaveBeenCalled();
    });
  });

  it("shows a PT-BR error message when the input is submitted empty", async () => {
    render(<SpreadsheetConfig onSave={onSave} />);

    // Submit without typing anything
    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
      expect(onSave).not.toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // Error is cleared after a valid re-submission
  // -----------------------------------------------------------------------

  it("clears the error message after the user submits a valid URL", async () => {
    render(<SpreadsheetConfig onSave={onSave} />);

    // First: submit an invalid URL to trigger the error
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: INVALID_URL },
    });
    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });

    // Then: submit a valid URL — the error should disappear
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: VALID_URL },
    });
    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => {
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(onSave).toHaveBeenCalledWith(VALID_ID);
    });
  });
});
