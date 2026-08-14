import Link from "next/link";

/**
 * Proto index — links to all throwaway sketches.
 * Deleted once we lift the winning variations into the real UI.
 */
export default function ProtoIndex() {
  const sketches = [
    {
      href: "/proto/panel",
      title: "Painel do paciente",
      subtitle: "3 variações — accordion (vencedora), editorial, abas",
    },
    {
      href: "/proto/map",
      title: "Mapa + sidebar + painel",
      subtitle: "Cena canônica: chrome, camadas, lista de prioridade, marcadores",
    },
    {
      href: "/proto/wizard",
      title: "Wizard — novo paciente / adicionar condição",
      subtitle: "Passo-a-passo, DPP calculada, escolha de condição, tela de sucesso",
    },
    {
      href: "/proto/planner",
      title: "Planejador de rota",
      subtitle: "Drawer com sugestão automática, filtros, drag-to-reorder, OSRM",
    },
  ];
  return (
    <div className="min-h-screen bg-[oklch(98.5%_0.005_90)] px-6 py-10">
      <div className="mx-auto max-w-2xl">
        <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
          Sketches
        </div>
        <h1 className="mt-1 text-xl font-semibold text-neutral-900">
          Protótipos descartáveis
        </h1>
        <p className="mt-2 text-sm text-neutral-600">
          Páginas estáticas para validar direção visual antes de tocar componentes reais.
        </p>
        <ul className="mt-6 divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white">
          {sketches.map((s) => (
            <li key={s.href}>
              <Link
                href={s.href}
                className="block px-4 py-3 hover:bg-neutral-50"
              >
                <div className="text-sm font-medium text-neutral-900">
                  {s.title}
                </div>
                <div className="text-xs text-neutral-500">{s.subtitle}</div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
