import { SpreadsheetConfig } from "@/components/settings/SpreadsheetConfig";

/**
 * Página de configurações.
 * Permite configurar a URL da planilha do Google Sheets da equipe.
 */
export default function SettingsPage() {
  return (
    <section>
      <h2>Configurações</h2>
      <SpreadsheetConfig onSave={(id) => console.log("Planilha configurada:", id)} />
    </section>
  );
}
