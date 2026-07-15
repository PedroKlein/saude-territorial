"use client";

import { useState } from "react";
import { extractSpreadsheetId } from "@/lib/sheets/url-parser";

interface SpreadsheetConfigProps {
  onSave: (spreadsheetId: string) => void;
}

/**
 * Formulário para configurar a planilha do Google Sheets.
 * Valida a URL, extrai o ID da planilha e chama onSave com ele.
 */
export function SpreadsheetConfig({ onSave }: SpreadsheetConfigProps) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const id = extractSpreadsheetId(url);

    if (!id) {
      setError(
        "É necessário informar a URL de uma planilha do Google Sheets (ex: https://docs.google.com/spreadsheets/d/...)"
      );
      return;
    }

    setError(null);
    onSave(id);
  }

  return (
    <form onSubmit={handleSubmit}>
      <label htmlFor="spreadsheet-url">Cole a URL da planilha</label>
      <input
        id="spreadsheet-url"
        type="text"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://docs.google.com/spreadsheets/d/"
      />
      {error && <p role="alert">{error}</p>}
      <button type="submit">Salvar</button>
    </form>
  );
}
