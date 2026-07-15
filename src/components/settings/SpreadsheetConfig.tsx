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
  const [saved, setSaved] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaved(false);

    const id = extractSpreadsheetId(url);

    if (!id) {
      setError(
        "É necessário informar a URL de uma planilha do Google Sheets (ex: https://docs.google.com/spreadsheets/d/...)"
      );
      return;
    }

    setError(null);
    onSave(id);
    setSaved(true);
  }

  return (
    <div className="rounded-lg border bg-white p-6 shadow-sm">
      <h3 className="mb-1 text-lg font-semibold text-gray-900">
        Planilha do Google Sheets
      </h3>
      <p className="mb-4 text-sm text-gray-500">
        Conecte a planilha de monitoramento da sua equipe de saúde.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="spreadsheet-url"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            Cole a URL da planilha
          </label>
          <input
            id="spreadsheet-url"
            type="text"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              setError(null);
              setSaved(false);
            }}
            placeholder="https://docs.google.com/spreadsheets/d/..."
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {error && (
          <p role="alert" className="text-sm text-urgent-red">
            {error}
          </p>
        )}

        {saved && (
          <p className="text-sm text-safe-green">
            ✓ Planilha configurada com sucesso!
          </p>
        )}

        <button
          type="submit"
          className="cursor-pointer rounded-md bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-light hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 active:scale-[0.98] transition-all"
        >
          Salvar
        </button>
      </form>
    </div>
  );
}
