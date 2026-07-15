"use client";

import { SpreadsheetConfig } from "@/components/settings/SpreadsheetConfig";

/**
 * Página de configurações.
 * Permite configurar a URL da planilha do Google Sheets da equipe.
 */
export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Configurações</h2>
        <p className="mt-1 text-sm text-gray-500">
          Configure a conexão com a planilha da sua equipe.
        </p>
      </div>

      <SpreadsheetConfig
        onSave={(id) => {
          // TODO: persist to Supabase user_preferences
          console.log("Planilha configurada:", id);
        }}
      />
    </div>
  );
}
