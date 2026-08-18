/** Settings placeholder — user preferences and saved filters land here later. */
export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Configurações</h2>
        <p className="mt-1 text-sm text-gray-500">
          Configurações em breve.
        </p>
      </div>

      <div className="rounded-md border border-dashed border-gray-300 bg-gray-50 p-6">
        <p className="text-sm text-gray-600">
          Em breve:
        </p>
        <ul className="mt-2 list-disc pl-5 text-sm text-gray-600">
          <li>Preferências de camadas e filtros salvos</li>
          <li>Configurações de exibição do mapa</li>
          <li>Anotações territoriais (nomes alternativos de ruas)</li>
        </ul>
      </div>
    </div>
  );
}
