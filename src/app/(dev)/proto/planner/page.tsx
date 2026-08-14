"use client";

/**
 * Throwaway sketch — route planner (Q3 flow A+B+C).
 * Route: /proto/planner (dev-only)
 *
 * Right drawer replaces the patient panel when "planning mode" is active.
 * Manual pick / filter-add / "Sugerir plano" all share the same drawer.
 */

import Link from "next/link";
import { useState } from "react";

const GESTANTE = "oklch(72% 0.11 15)";
const TB = "oklch(60% 0.09 40)";
const HAS = "oklch(60% 0.13 275)";
const TEAL = "oklch(58% 0.10 195)";
const RED = "oklch(58% 0.19 25)";
const AMBER = "oklch(75% 0.14 75)";
const ROUTE = "oklch(50% 0.18 275)";

const svgProps = {
  xmlns: "http://www.w3.org/2000/svg",
  width: 16, height: 16, viewBox: "0 0 24 24",
  fill: "none", stroke: "currentColor", strokeWidth: 2,
  strokeLinecap: "round" as const, strokeLinejoin: "round" as const,
};
const I = {
  Baby: (p: { className?: string }) => <svg {...svgProps} className={p.className}><path d="M9 12h.01"/><path d="M15 12h.01"/><path d="M10 16c.5.3 1.2.5 2 .5s1.5-.2 2-.5"/><path d="M19 6.3a9 9 0 0 1 1.8 3.9 2 2 0 0 1 0 3.6 9 9 0 0 1-17.6 0 2 2 0 0 1 0-3.6A9 9 0 0 1 12 3c2 0 3.5 1.1 3.5 2.5s-.9 2.5-2 2.5c-.8 0-1.5-.4-1.5-1"/></svg>,
  Lungs: (p: { className?: string }) => <svg {...svgProps} className={p.className}><path d="M6 20c1.6 0 3-1.3 3-3v-6a3 3 0 0 0-.8-2L4.9 5.1A2 2 0 0 0 3 4C2 4 1 5 1 6v11c0 1.7 1.3 3 2.8 3Zm12 0c-1.6 0-3-1.3-3-3v-6a3 3 0 0 1 .8-2L19.1 5.1A2 2 0 0 1 21 4c1 0 2 1 2 2v11c0 1.7-1.3 3-2.8 3Z"/><path d="M12 3v11"/><path d="M6 20h12"/></svg>,
  HeartPulse: (p: { className?: string }) => <svg {...svgProps} className={p.className}><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7Z"/><path d="M3.22 12H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27"/></svg>,
  MapPin: (p: { className?: string }) => <svg {...svgProps} className={p.className}><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>,
  Sparkles: (p: { className?: string }) => <svg {...svgProps} className={p.className}><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/></svg>,
  Filter: (p: { className?: string }) => <svg {...svgProps} className={p.className}><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>,
  Plus: (p: { className?: string }) => <svg {...svgProps} className={p.className}><path d="M5 12h14M12 5v14"/></svg>,
  X: (p: { className?: string }) => <svg {...svgProps} className={p.className}><path d="M18 6 6 18M6 6l12 12"/></svg>,
  GripVertical: (p: { className?: string }) => <svg {...svgProps} className={p.className}><circle cx="9" cy="6" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="18" r="1"/><circle cx="15" cy="6" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="18" r="1"/></svg>,
  Foot: (p: { className?: string }) => <svg {...svgProps} className={p.className}><path d="M4 16.5a4.5 4.5 0 1 1 9 0v3a.5.5 0 0 1-.5.5h-8a.5.5 0 0 1-.5-.5Z"/><path d="M9 5a2 2 0 0 1 4 0v3.5"/><path d="M14 8a2 2 0 1 1 4 0"/><path d="M18 8a2 2 0 1 1 4 0v3a4 4 0 0 1-4 4"/></svg>,
  Car: (p: { className?: string }) => <svg {...svgProps} className={p.className}><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9l-.7-.1-1.4-4.5c-.2-.5-.7-.8-1.2-.8H6.9c-.5 0-1 .3-1.2.8L4.2 11l-.7.1C2.7 11.3 2 12.1 2 13v3c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>,
  Save: (p: { className?: string }) => <svg {...svgProps} className={p.className}><path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7"/><path d="M7 3v4a1 1 0 0 0 1 1h7"/></svg>,
  Route: (p: { className?: string }) => <svg {...svgProps} className={p.className}><circle cx="6" cy="19" r="3"/><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"/><circle cx="18" cy="5" r="3"/></svg>,
  ChevronDown: (p: { className?: string }) => <svg {...svgProps} className={p.className}><path d="m6 9 6 6 6-6"/></svg>,
};

/* -------- Fake basemap + route line -------- */
function Basemap() {
  return (
    <svg viewBox="0 0 800 600" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden>
      <rect width="800" height="600" fill="oklch(97% 0.006 90)" />
      {Array.from({ length: 6 }).flatMap((_, r) =>
        Array.from({ length: 8 }).map((__, c) => {
          const x = c * 100 + 20 + (r % 2) * 8;
          const y = r * 100 + 15;
          return <rect key={`${r}-${c}`} x={x} y={y} width={70 + ((r + c) % 3) * 8} height={65 + ((r * c) % 3) * 6} rx="2" fill="oklch(94% 0.008 90)" stroke="oklch(88% 0.008 90)" strokeWidth="0.5" />;
        }),
      )}
      <path d="M -20 420 Q 200 380 400 410 T 820 400" stroke="oklch(88% 0.02 220)" strokeWidth="16" fill="none" opacity="0.7" />
      <path d="M -20 -20 L 820 620" stroke="oklch(92% 0.005 90)" strokeWidth="6" />
      {/* OSRM route (dashed, follows roads) */}
      <path
        d="M 130 420 Q 200 340 260 300 T 380 220 T 480 180 T 610 240 T 700 340"
        stroke={ROUTE}
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray="8 6"
        fill="none"
        opacity="0.85"
      />
    </svg>
  );
}

/* -------- Numbered route marker -------- */
function RouteStop({ n, x, y, color }: { n: number; x: number; y: number; color: string }) {
  return (
    <div className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${x}%`, top: `${y}%` }}>
      <div className="relative">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-full font-semibold text-white shadow-[0_2px_6px_rgba(0,0,0,0.2)]"
          style={{ backgroundColor: color, boxShadow: `0 0 0 3px white, 0 2px 6px rgba(0,0,0,0.2)` }}
        >
          {n}
        </div>
      </div>
    </div>
  );
}

/* -------- Non-planned patient marker (dim) -------- */
function DimMarker({ color, x, y }: { color: string; x: number; y: number }) {
  return (
    <div className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${x}%`, top: `${y}%` }}>
      <div
        className="h-3 w-3 rounded-full opacity-40 ring-2 ring-white"
        style={{ backgroundColor: color }}
      />
    </div>
  );
}

/* -------- Planner drawer -------- */
type Stop = {
  order: number;
  name: string;
  cond: "g" | "t" | "h";
  alert: "red" | "amber" | null;
  meta: string;
  ma: string;
};

const PLAN: Stop[] = [
  { order: 1, name: "João Batista Ferreira", cond: "t", alert: "red", meta: "TB · sem consulta há 42d", ma: "MA 03" },
  { order: 2, name: "Maria Aparecida Silva", cond: "g", alert: "red", meta: "IG 41 sem · vencida", ma: "MA 07" },
  { order: 3, name: "Cléa Dos Santos", cond: "h", alert: "red", meta: "HAS · sem consulta há 6 meses", ma: "MA 07" },
  { order: 4, name: "Rosângela Peixoto", cond: "g", alert: "amber", meta: "Risco alto · pré-natal", ma: "MA 04" },
  { order: 5, name: "Edna Ribeiro", cond: "h", alert: "amber", meta: "HAS · próxima consulta 25/08", ma: "MA 11" },
];

function CondBadge({ cond }: { cond: "g" | "t" | "h" }) {
  const map = { g: { c: GESTANTE, I: I.Baby, label: "G" }, t: { c: TB, I: I.Lungs, label: "T" }, h: { c: HAS, I: I.HeartPulse, label: "H" } } as const;
  const M = map[cond];
  return (
    <span className="flex h-5 w-5 items-center justify-center rounded text-white" style={{ backgroundColor: M.c }} title={M.label}>
      <M.I className="!h-3 !w-3" />
    </span>
  );
}

function StopRow({ stop, onRemove }: { stop: Stop; onRemove: () => void }) {
  const color = stop.cond === "g" ? GESTANTE : stop.cond === "t" ? TB : HAS;
  return (
    <div className="group flex items-start gap-2 rounded-md border border-transparent px-2 py-2 hover:border-neutral-200 hover:bg-neutral-50">
      <button className="mt-1 cursor-grab text-neutral-300 hover:text-neutral-600" title="Arrastar para reordenar">
        <I.GripVertical className="!h-4 !w-4" />
      </button>
      <div
        className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
        style={{ backgroundColor: color, boxShadow: `0 0 0 2px white, 0 0 0 3px ${color}40` }}
      >
        {stop.order}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          {stop.alert && (
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: stop.alert === "red" ? RED : AMBER }}
              aria-hidden
            />
          )}
          <span className="truncate text-sm font-medium text-neutral-900">{stop.name}</span>
          <CondBadge cond={stop.cond} />
        </div>
        <div className="mt-0.5 truncate text-xs text-neutral-500">{stop.meta} · {stop.ma}</div>
      </div>
      <button
        onClick={onRemove}
        className="mt-1 rounded p-0.5 text-neutral-300 opacity-0 transition group-hover:opacity-100 hover:bg-neutral-100 hover:text-neutral-700"
        aria-label="Remover"
      >
        <I.X className="!h-3.5 !w-3.5" />
      </button>
    </div>
  );
}

function PlannerDrawer({ onClose }: { onClose: () => void }) {
  const [stops, setStops] = useState<Stop[]>(PLAN);
  const [profile, setProfile] = useState<"foot" | "car">("foot");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const total = stops.length;
  const dist = profile === "foot" ? "3,4 km" : "5,1 km";
  const time = profile === "foot" ? "48 min" : "18 min";

  return (
    <aside className="flex h-full w-[400px] shrink-0 flex-col border-l border-neutral-200 bg-white">
      {/* Header */}
      <div className="border-b border-neutral-200 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-md text-white" style={{ backgroundColor: TEAL }}>
              <I.Route className="!h-4 !w-4" />
            </span>
            <div>
              <div className="text-sm font-semibold text-neutral-900">Planejar visita</div>
              <div className="text-[11px] text-neutral-500">Hoje, 12 de agosto · ACS João</div>
            </div>
          </div>
          <button onClick={onClose} className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700" aria-label="Fechar">
            <I.X />
          </button>
        </div>
        {/* Stats strip */}
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-md bg-neutral-50 px-2 py-1.5">
            <div className="text-lg font-semibold text-neutral-900">{total}</div>
            <div className="text-[10px] uppercase tracking-wider text-neutral-500">Visitas</div>
          </div>
          <div className="rounded-md bg-neutral-50 px-2 py-1.5">
            <div className="text-lg font-semibold text-neutral-900">{dist}</div>
            <div className="text-[10px] uppercase tracking-wider text-neutral-500">Distância</div>
          </div>
          <div className="rounded-md bg-neutral-50 px-2 py-1.5">
            <div className="text-lg font-semibold text-neutral-900">{time}</div>
            <div className="text-[10px] uppercase tracking-wider text-neutral-500">Tempo</div>
          </div>
        </div>
      </div>

      {/* Auto-suggest CTA */}
      <div className="border-b border-neutral-200 p-3">
        <button
          className="flex w-full items-center justify-center gap-2 rounded-md border border-neutral-200 bg-gradient-to-br from-white to-neutral-50 px-3 py-2 text-sm font-medium text-neutral-800 shadow-sm transition hover:border-[oklch(58%_0.10_195/0.4)] hover:from-[oklch(97%_0.02_195)]"
        >
          <I.Sparkles className="!h-4 !w-4" style={{ color: TEAL }} />
          Sugerir plano para hoje
          <span className="ml-auto text-[10px] font-medium text-neutral-500">
            baseado em alertas + última visita
          </span>
        </button>
      </div>

      {/* Filters (collapsible) */}
      <div className="border-b border-neutral-200">
        <button
          onClick={() => setFiltersOpen((v) => !v)}
          className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-neutral-50"
        >
          <I.Filter className="!h-3.5 !w-3.5 text-neutral-400" />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-600">Filtrar candidatos</span>
          <I.ChevronDown className={`ml-auto !h-4 !w-4 text-neutral-400 transition ${filtersOpen ? "rotate-180" : ""}`} />
        </button>
        {filtersOpen && (
          <div className="border-t border-neutral-100 p-3 space-y-2">
            <div>
              <div className="mb-1 text-[10px] font-medium uppercase tracking-wider text-neutral-500">Microárea</div>
              <div className="flex flex-wrap gap-1">
                {["MA 03", "MA 04", "MA 07", "MA 11"].map((m) => (
                  <span key={m} className="rounded-full border border-[oklch(58%_0.10_195/0.4)] bg-[oklch(97%_0.03_195)] px-2 py-0.5 text-[11px] font-medium text-[oklch(42%_0.10_195)]">
                    {m} <I.X className="!ml-0.5 !inline !h-2.5 !w-2.5" />
                  </span>
                ))}
                <button className="rounded-full border border-dashed border-neutral-300 px-2 py-0.5 text-[11px] text-neutral-500 hover:bg-neutral-50">+ MA</button>
              </div>
            </div>
            <div>
              <div className="mb-1 text-[10px] font-medium uppercase tracking-wider text-neutral-500">Condição</div>
              <div className="flex gap-1">
                {(["g", "t", "h"] as const).map((c) => {
                  const color = c === "g" ? GESTANTE : c === "t" ? TB : HAS;
                  const Ic = c === "g" ? I.Baby : c === "t" ? I.Lungs : I.HeartPulse;
                  return (
                    <button key={c} className="flex items-center gap-1 rounded-full border border-neutral-200 bg-white px-2 py-0.5 text-[11px] font-medium text-neutral-700 hover:bg-neutral-50">
                      <span className="flex h-3.5 w-3.5 items-center justify-center rounded" style={{ backgroundColor: color }}>
                        <Ic className="!h-2 !w-2 text-white" />
                      </span>
                      {c === "g" ? "Gestante" : c === "t" ? "TB" : "HAS"}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <div className="mb-1 text-[10px] font-medium uppercase tracking-wider text-neutral-500">Nível de alerta</div>
              <div className="flex gap-1">
                <button className="flex items-center gap-1 rounded-full border border-[oklch(85%_0.10_25)] bg-[oklch(97%_0.03_25)] px-2 py-0.5 text-[11px] font-medium text-[oklch(38%_0.15_25)]">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: RED }} /> Crítico
                </button>
                <button className="flex items-center gap-1 rounded-full border border-neutral-200 px-2 py-0.5 text-[11px] font-medium text-neutral-700 hover:bg-neutral-50">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: AMBER }} /> Atenção
                </button>
                <button className="flex items-center gap-1 rounded-full border border-neutral-200 px-2 py-0.5 text-[11px] font-medium text-neutral-700 hover:bg-neutral-50">
                  Todos
                </button>
              </div>
            </div>
            <button className="mt-1 w-full rounded-md border border-neutral-300 bg-white py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50">
              Adicionar todos ao plano (12)
            </button>
          </div>
        )}
      </div>

      {/* Ordered list */}
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex items-center justify-between px-3 pt-3">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">Ordem da rota</div>
          <span className="text-[11px] text-neutral-400">{total} paradas</span>
        </div>
        <div className="flex-1 overflow-y-auto px-1 pb-2">
          {stops.map((s) => (
            <StopRow key={s.name} stop={s} onRemove={() => setStops((prev) => prev.filter((p) => p.name !== s.name).map((p, i) => ({ ...p, order: i + 1 })))} />
          ))}
          <button className="mx-2 mt-1 flex w-[calc(100%-16px)] items-center justify-center gap-1.5 rounded-md border border-dashed border-neutral-300 py-2 text-xs font-medium text-neutral-500 hover:border-neutral-400 hover:bg-neutral-50 hover:text-neutral-800">
            <I.Plus /> Adicionar paciente
          </button>
        </div>
      </div>

      {/* Footer — profile + gerar rota + salvar */}
      <div className="border-t border-neutral-200 bg-neutral-50 p-3">
        <div className="mb-2 flex items-center gap-1 rounded-md border border-neutral-200 bg-white p-0.5">
          {(["foot", "car"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setProfile(p)}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded px-2 py-1 text-xs font-medium transition ${
                profile === p ? "bg-neutral-900 text-white" : "text-neutral-600 hover:text-neutral-900"
              }`}
            >
              {p === "foot" ? <I.Foot className="!h-3.5 !w-3.5" /> : <I.Car className="!h-3.5 !w-3.5" />}
              {p === "foot" ? "A pé" : "Carro"}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50">
            <I.Save className="!h-4 !w-4" /> Salvar plano
          </button>
          <button className="flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-white transition hover:opacity-90" style={{ backgroundColor: TEAL }}>
            <I.Route className="!h-4 !w-4" /> Gerar rota
          </button>
        </div>
      </div>
    </aside>
  );
}

/* -------- Compact sidebar (planning mode collapses it) -------- */
function CollapsedRail() {
  return (
    <aside className="flex h-full w-14 shrink-0 flex-col items-center gap-2 border-r border-neutral-200 bg-white py-3">
      {[I.Baby, I.Lungs, I.HeartPulse].map((Ic, i) => (
        <button key={i} className="flex h-10 w-10 items-center justify-center rounded-md text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700">
          <Ic className="!h-5 !w-5" />
        </button>
      ))}
    </aside>
  );
}

/* -------- Page -------- */
export default function PlannerProtoPage() {
  const [showPlanner, setShowPlanner] = useState(true);

  return (
    <div className="flex h-screen flex-col bg-white text-neutral-900">
      <header className="flex shrink-0 items-center justify-between border-b border-neutral-200 bg-white px-5 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 items-center justify-center rounded text-white" style={{ backgroundColor: TEAL }}>
            <I.MapPin className="!h-4 !w-4" />
          </div>
          <div>
            <div className="text-sm font-semibold text-neutral-900">Saúde Territorial</div>
            <div className="text-[10px] uppercase tracking-wider text-neutral-500">Modo planejamento</div>
          </div>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <Link href="/proto" className="text-neutral-500 hover:text-neutral-800">← proto index</Link>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <CollapsedRail />

        {/* Map surface */}
        <div className="relative flex-1 overflow-hidden bg-[oklch(97%_0.006_90)]">
          <Basemap />

          {/* Dim non-planned patients in background */}
          <DimMarker color={GESTANTE} x={20} y={30} />
          <DimMarker color={GESTANTE} x={35} y={22} />
          <DimMarker color={HAS} x={78} y={28} />
          <DimMarker color={TB} x={82} y={78} />
          <DimMarker color={GESTANTE} x={22} y={82} />
          <DimMarker color={HAS} x={62} y={72} />

          {/* Numbered route stops */}
          <RouteStop n={1} x={17} y={70} color={TB} />
          <RouteStop n={2} x={32} y={50} color={GESTANTE} />
          <RouteStop n={3} x={48} y={37} color={HAS} />
          <RouteStop n={4} x={60} y={30} color={GESTANTE} />
          <RouteStop n={5} x={77} y={40} color={HAS} />
          <RouteStop n={6} x={87} y={57} color={HAS} />

          {/* Legend for the route */}
          <div className="absolute left-3 top-3 flex items-center gap-2 rounded-md border border-neutral-200 bg-white/95 px-3 py-1.5 text-xs shadow-sm backdrop-blur">
            <span className="inline-block h-0.5 w-6 rounded-full" style={{ backgroundColor: ROUTE }} />
            <span className="text-neutral-700">Rota sugerida (OSRM)</span>
          </div>

          {/* Zoom */}
          <div className="absolute bottom-3 left-3 flex flex-col overflow-hidden rounded-md border border-neutral-200 bg-white shadow-sm">
            <button className="flex h-8 w-8 items-center justify-center text-neutral-600 hover:bg-neutral-50">+</button>
            <div className="h-px bg-neutral-200" />
            <button className="flex h-8 w-8 items-center justify-center text-neutral-600 hover:bg-neutral-50">−</button>
          </div>
        </div>

        {showPlanner ? (
          <PlannerDrawer onClose={() => setShowPlanner(false)} />
        ) : (
          <button
            onClick={() => setShowPlanner(true)}
            className="flex h-full w-12 items-center justify-center border-l border-neutral-200 bg-white text-neutral-500 hover:bg-neutral-50 hover:text-neutral-800"
            title="Abrir planejador"
          >
            <I.Route className="!h-5 !w-5" />
          </button>
        )}
      </div>
    </div>
  );
}
