"use client";

import { useRouter } from "next/navigation";
import { SpreadsheetConfig } from "@/components/settings/SpreadsheetConfig";

/**
 * Página de configurações.
 * Permite configurar a URL da planilha do Google Sheets da equipe.
 */
export default function SettingsPage() {
  const router = useRouter();

  async function handleSave(spreadsheetId: string) {
    const res = await fetch("/api/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ spreadsheetId }),
    });

    if (res.ok) {
      router.push("/map");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Configurações</h2>
        <p className="mt-1 text-sm text-gray-500">
          Configure a conexão com a planilha da sua equipe.
        </p>
      </div>

      <SpreadsheetConfig onSave={handleSave} />
    </div>
  );
}
