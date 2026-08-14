"use client";

/**
 * Throwaway sketch — canonical map scene.
 * Route: /proto/map (dev-only). Sidebar + map + right panel composition.
 *
 * Marker & cluster style variants get appended in a follow-up sketch.
 */

import Link from "next/link";
import { useState } from "react";

const GESTANTE = "oklch(72% 0.11 15)";
const TB = "oklch(60% 0.09 40)";
const HAS = "oklch(60% 0.13 275)";
const TEAL = "oklch(58% 0.10 195)";
const RED = "oklch(58% 0.19 25)";
const AMBER = "oklch(75% 0.14 75)";

/* ----- inline lucide icons (subset) ----- */
const svgProps = {
  xmlns: "http://www.w3.org/2000/svg",
  width: 16,
  height: 16,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};
const I = {
  Search: (p: { className?: string }) => (
    <svg {...svgProps} className={p.className}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
  ),
  Baby: (p: { className?: string }) => (
    <svg {...svgProps} className={p.className}><path d="M9 12h.01"/><path d="M15 12h.01"/><path d="M10 16c.5.3 1.2.5 2 .5s1.5-.2 2-.5"/><path d="M19 6.3a9 9 0 0 1 1.8 3.9 2 2 0 0 1 0 3.6 9 9 0 0 1-17.6 0 2 2 0 0 1 0-3.6A9 9 0 0 1 12 3c2 0 3.5 1.1 3.5 2.5s-.9 2.5-2 2.5c-.8 0-1.5-.4-1.5-1"/></svg>
  ),
  Lungs: (p: { className?: string }) => (
    <svg {...svgProps} className={p.className}><path d="M6 20c1.6 0 3-1.3 3-3v-6a3 3 0 0 0-.8-2L4.9 5.1A2 2 0 0 0 3 4C2 4 1 5 1 6v11c0 1.7 1.3 3 2.8 3Zm12 0c-1.6 0-3-1.3-3-3v-6a3 3 0 0 1 .8-2L19.1 5.1A2 2 0 0 1 21 4c1 0 2 1 2 2v11c0 1.7-1.3 3-2.8 3Z"/><path d="M12 3v11"/><path d="M6 20h12"/></svg>
  ),
  HeartPulse: (p: { className?: string }) => (
    <svg {...svgProps} className={p.className}><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7Z"/><path d="M3.22 12H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27"/></svg>
  ),
  Alert: (p: { className?: string }) => (
    <svg {...svgProps} className={p.className}><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
  ),
  Plus: (p: { className?: string }) => (
    <svg {...svgProps} className={p.className}><path d="M5 12h14M12 5v14"/></svg>
  ),
  Route: (p: { className?: string }) => (
    <svg {...svgProps} className={p.className}><circle cx="6" cy="19" r="3"/><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"/><circle cx="18" cy="5" r="3"/></svg>
  ),
  Layers: (p: { className?: string }) => (
    <svg {...svgProps} className={p.className}><path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.84Z"/><path d="m22 12.18-9.17 4.16a2 2 0 0 1-1.66 0L2 12.18"/><path d="m22 17.18-9.17 4.16a2 2 0 0 1-1.66 0L2 17.18"/></svg>
  ),
  ChevronRight: (p: { className?: string }) => (
    <svg {...svgProps} className={p.className}><path d="m9 18 6-6-6-6"/></svg>
  ),
  MapPin: (p: { className?: string }) => (
    <svg {...svgProps} className={p.className}><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>
  ),
  User: (p: { className?: string }) => (
    <svg {...svgProps} className={p.className}><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
  ),
  ChevronLeft: (p: { className?: string }) => (
    <svg {...svgProps} className={p.className}><path d="m15 18-6-6 6-6"/></svg>
  ),
  PanelLeft: (p: { className?: string }) => (
    <svg {...svgProps} className={p.className}><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/></svg>
  ),
  PanelRight: (p: { className?: string }) => (
    <svg {...svgProps} className={p.className}><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M15 3v18"/></svg>
  ),
  Help: (p: { className?: string }) => (
    <svg {...svgProps} className={p.className}><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>
  ),
  X: (p: { className?: string }) => (
    <svg {...svgProps} className={p.className}><path d="M18 6 6 18M6 6l12 12"/></svg>
  ),
};

/* -------------------- Marker (candidate primary style) --------------------
   Rounded chip with layer color + icon; small alert dot in top-right when
   the patient triggers a rule. Coincidence badge (number) sits opposite the
   alert dot. */
function Marker({
  layer,
  alert,
  count,
  x,
  y,
}: {
  layer: "g" | "t" | "h";
  alert?: "red" | "amber";
  count?: number;
  x: number;
  y: number;
}) {
  const color = layer === "g" ? GESTANTE : layer === "t" ? TB : HAS;
  const Icon = layer === "g" ? I.Baby : layer === "t" ? I.Lungs : I.HeartPulse;
  return (
    <div
      className="absolute -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${x}%`, top: `${y}%` }}
    >
      <div className="relative">
        <div
          className="flex h-7 w-7 items-center justify-center rounded-full text-white shadow-[0_2px_6px_rgba(0,0,0,0.18),0_0_0_2px_white]"
          style={{ backgroundColor: color }}
        >
          <Icon className="!h-3.5 !w-3.5" />
        </div>
        {alert && (
          <span
            className="absolute -right-0.5 -top-0.5 flex h-3 w-3 items-center justify-center rounded-full ring-2 ring-white"
            style={{ backgroundColor: alert === "red" ? RED : AMBER }}
            aria-hidden
          />
        )}
        {count && count > 1 && (
          <span
            className="absolute -bottom-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-neutral-900 px-1 text-[10px] font-semibold text-white ring-2 ring-white"
          >
            {count}
          </span>
        )}
      </div>
    </div>
  );
}

/* -------------------- Cluster bubble (candidate) -------------------- */
function Cluster({
  count,
  worst,
  x,
  y,
}: {
  count: number;
  worst: "red" | "amber" | "none";
  x: number;
  y: number;
}) {
  const ring =
    worst === "red" ? RED : worst === "amber" ? AMBER : "oklch(80% 0 0)";
  return (
    <div
      className="absolute -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${x}%`, top: `${y}%` }}
    >
      <div
        className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-sm font-semibold text-neutral-800 shadow-[0_2px_8px_rgba(0,0,0,0.15)]"
        style={{ boxShadow: `0 0 0 3px ${ring}, 0 2px 8px rgba(0,0,0,0.15)` }}
      >
        {count}
      </div>
    </div>
  );
}

/* -------------------- Fake basemap (SVG) -------------------- */
function FakeBasemap() {
  return (
    <svg
      viewBox="0 0 800 600"
      preserveAspectRatio="none"
      className="absolute inset-0 h-full w-full"
      aria-hidden
    >
      <rect width="800" height="600" fill="oklch(97% 0.006 90)" />
      {/* Blocks — city blocks feel */}
      {Array.from({ length: 6 }).flatMap((_, r) =>
        Array.from({ length: 8 }).map((__, c) => {
          const x = c * 100 + 20 + (r % 2) * 8;
          const y = r * 100 + 15;
          return (
            <rect
              key={`${r}-${c}`}
              x={x}
              y={y}
              width={70 + ((r + c) % 3) * 8}
              height={65 + ((r * c) % 3) * 6}
              rx="2"
              fill="oklch(94% 0.008 90)"
              stroke="oklch(88% 0.008 90)"
              strokeWidth="0.5"
            />
          );
        }),
      )}
      {/* River / avenue */}
      <path
        d="M -20 420 Q 200 380 400 410 T 820 400"
        stroke="oklch(88% 0.02 220)"
        strokeWidth="16"
        fill="none"
        opacity="0.7"
      />
      {/* Diagonal main road */}
      <path
        d="M -20 -20 L 820 620"
        stroke="oklch(92% 0.005 90)"
        strokeWidth="6"
      />
      {/* Microarea outline */}
      <path
        d="M 120 100 L 380 90 L 420 260 L 340 380 L 140 360 Z"
        fill="oklch(58% 0.10 195 / 0.06)"
        stroke={TEAL}
        strokeWidth="1.5"
        strokeDasharray="5 3"
      />
    </svg>
  );
}

/* -------------------- Sidebar --------------------
   Search, layer toggles, priority list, plan CTA. */
function Sidebar({ onClose }: { onClose: () => void }) {
  const [layers, setLayers] = useState({ g: true, t: true, h: true });
  const priority = [
    { name: "João Batista Ferreira", cond: "t", alert: "red" as const, meta: "TB · sem consulta há 42d", ma: "MA 03" },
    { name: "Maria Aparecida Silva", cond: "g", alert: "red" as const, meta: "IG 41 sem · vencida", ma: "MA 07" },
    { name: "Cléa Dos Santos", cond: "h", alert: "red" as const, meta: "HAS · sem consulta há 6 meses", ma: "MA 07" },
    { name: "Rosângela Peixoto", cond: "g", alert: "amber" as const, meta: "Risco alto · pré-natal", ma: "MA 04" },
    { name: "Edna Ribeiro", cond: "h", alert: "amber" as const, meta: "HAS · próxima consulta 25/08", ma: "MA 11" },
  ];
  return (
    <aside className="flex h-full w-[300px] shrink-0 flex-col border-r border-neutral-200 bg-white">
      <div className="flex items-center gap-2 border-b border-neutral-200 p-3">
        <div className="relative flex-1">
          <I.Search className="absolute left-3 top-1/2 !h-4 !w-4 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Buscar paciente ou endereço…"
            className="w-full rounded-md border border-neutral-200 bg-neutral-50 py-2 pl-9 pr-3 text-sm placeholder:text-neutral-400 focus:border-[oklch(58%_0.10_195)] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[oklch(58%_0.10_195/0.15)]"
          />
        </div>
        <button
          onClick={onClose}
          className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
          aria-label="Ocultar barra lateral"
          title="Ocultar barra lateral"
        >
          <I.PanelLeft />
        </button>
      </div>

      {/* Layers */}
      <div className="border-b border-neutral-200 p-3">
        <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
          <I.Layers className="!h-3 !w-3" />
          Camadas
        </div>
        <div className="space-y-1">
          {(
            [
              { id: "g", label: "Gestantes", color: GESTANTE, count: 55, icon: I.Baby },
              { id: "t", label: "Tuberculose", color: TB, count: 5, icon: I.Lungs },
              { id: "h", label: "HAS", color: HAS, count: 8, icon: I.HeartPulse },
            ] as const
          ).map((l) => {
            const active = layers[l.id];
            return (
              <button
                key={l.id}
                onClick={() => setLayers((s) => ({ ...s, [l.id]: !s[l.id] }))}
                className={`flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm transition ${
                  active
                    ? "bg-neutral-50 text-neutral-900"
                    : "text-neutral-400 hover:bg-neutral-50"
                }`}
              >
                <span className="flex items-center gap-2">
                  <span
                    className="flex h-5 w-5 items-center justify-center rounded text-white"
                    style={{ backgroundColor: active ? l.color : "oklch(88% 0 0)" }}
                  >
                    <l.icon className="!h-3 !w-3" />
                  </span>
                  <span className="font-medium">{l.label}</span>
                </span>
                <span className="text-xs text-neutral-500">{l.count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Priority list */}
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex items-center justify-between px-3 pt-3">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
            <I.Alert className="!h-3 !w-3" style={{ color: RED }} />
            Precisam atenção
          </div>
          <span className="text-[11px] text-neutral-400">{priority.length}</span>
        </div>
        <ul className="flex-1 overflow-y-auto px-2 pb-2">
          {priority.map((p, idx) => {
            const color = p.cond === "g" ? GESTANTE : p.cond === "t" ? TB : HAS;
            const CondIcon = p.cond === "g" ? I.Baby : p.cond === "t" ? I.Lungs : I.HeartPulse;
            return (
              <li key={idx}>
                <button className="group flex w-full items-start gap-2.5 rounded-md px-2 py-2 text-left hover:bg-neutral-50">
                  <span
                    className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white"
                    style={{ backgroundColor: color }}
                  >
                    <CondIcon className="!h-3 !w-3" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: p.alert === "red" ? RED : AMBER }}
                        aria-hidden
                      />
                      <span className="truncate text-sm font-medium text-neutral-900">
                        {p.name}
                      </span>
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-neutral-500">
                      {p.meta} · {p.ma}
                    </span>
                  </span>
                  <I.ChevronRight className="!h-3.5 !w-3.5 shrink-0 text-neutral-300 group-hover:text-neutral-500" />
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Plan CTA */}
      <div className="border-t border-neutral-200 bg-neutral-50 p-3">
        <button
          className="flex w-full items-center justify-center gap-2 rounded-md py-2 text-sm font-medium text-white transition hover:opacity-90"
          style={{ backgroundColor: TEAL }}
        >
          <I.Route className="!h-4 !w-4" />
          Planejar visita
        </button>
      </div>
    </aside>
  );
}

/* -------------------- Right panel (abbreviated V1 winner) -------------------- */
function AbbrPanel({ onClose }: { onClose: () => void }) {
  return (
    <aside className="relative h-full w-[380px] shrink-0 overflow-y-auto border-l border-neutral-200 bg-white">
      <button
        onClick={onClose}
        className="absolute right-2 top-2 z-10 rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
        aria-label="Fechar painel"
        title="Fechar painel"
      >
        <I.X />
      </button>
      <div className="border-b border-neutral-200 p-4">
        <div className="flex items-start gap-2.5">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white text-sm font-medium"
            style={{ backgroundColor: TEAL }}
          >
            MA
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-neutral-900">
              Maria Aparecida Silva
            </div>
            <div className="text-xs text-neutral-500">30 anos · MA 07</div>
            <div className="mt-1 flex flex-wrap gap-1">
              <span
                className="inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium"
                style={{
                  backgroundColor: "oklch(96% 0.03 25)",
                  color: "oklch(38% 0.15 25)",
                  borderColor: "oklch(85% 0.10 25)",
                }}
              >
                <I.Alert className="!h-2.5 !w-2.5" /> Consulta há 6 meses
              </span>
            </div>
          </div>
        </div>
        <div className="mt-3 space-y-1.5 text-xs text-neutral-600">
          <div className="flex items-center gap-2">
            <I.MapPin className="!h-3 !w-3 text-neutral-400" />
            Rua das Palmeiras, 45 — Vila Cruzeiro
          </div>
          <div className="flex items-center gap-2">
            <I.User className="!h-3 !w-3 text-neutral-400" />
            <span className="font-mono">704 8036 0125 6789</span>
          </div>
        </div>
      </div>

      {/* Gestante card */}
      <div className="p-4">
        <div
          className="overflow-hidden rounded-[10px] border border-neutral-200"
          style={{ borderLeftColor: GESTANTE, borderLeftWidth: "3px" }}
        >
          <div className="flex items-center justify-between border-b border-neutral-100 bg-neutral-50/50 px-3 py-2.5">
            <div className="flex items-center gap-2">
              <span
                className="flex h-7 w-7 items-center justify-center rounded-full text-white"
                style={{ backgroundColor: GESTANTE }}
              >
                <I.Baby className="!h-3.5 !w-3.5" />
              </span>
              <div>
                <div className="text-sm font-semibold">Gestante</div>
                <div className="text-[11px] text-neutral-500">
                  38 sem · risco alto
                </div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-2 px-3 py-3 text-sm">
            <FieldSm label="DUM" value="25/12/25" />
            <FieldSm label="DPP" value="01/10/26" />
            <FieldSm label="Próxima" value="20/08/26" />
            <FieldSm label="PA" value="130/85" mono />
          </div>
        </div>

        {/* HAS card */}
        <div
          className="mt-3 overflow-hidden rounded-[10px] border border-neutral-200"
          style={{ borderLeftColor: HAS, borderLeftWidth: "3px" }}
        >
          <div className="flex items-center justify-between border-b border-neutral-100 bg-neutral-50/50 px-3 py-2.5">
            <div className="flex items-center gap-2">
              <span
                className="flex h-7 w-7 items-center justify-center rounded-full text-white"
                style={{ backgroundColor: HAS }}
              >
                <I.HeartPulse className="!h-3.5 !w-3.5" />
              </span>
              <div>
                <div className="text-sm font-semibold">HAS — Hipertensão</div>
                <div className="text-[11px] text-neutral-500">
                  Última: 15/02/26
                </div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-2 px-3 py-3 text-sm">
            <FieldSm label="Próxima" value="15/08/26" />
            <FieldSm label="PA" value="130/85" mono />
          </div>
        </div>

        <button className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-neutral-300 py-2 text-sm font-medium text-neutral-500 hover:border-neutral-400 hover:bg-neutral-50 hover:text-neutral-800">
          <I.Plus /> Adicionar condição
        </button>
      </div>
    </aside>
  );
}

function FieldSm({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-[10px] font-medium uppercase tracking-wider text-neutral-500">
        {label}
      </div>
      <div className={`mt-0.5 text-sm text-neutral-800 ${mono ? "font-mono text-xs" : ""}`}>
        {value}
      </div>
    </div>
  );
}

/* -------------------- Page -------------------- */
export default function MapProtoPage() {
  const [showSidebar, setShowSidebar] = useState(true);
  const [showPanel, setShowPanel] = useState(true);
  const [showLegend, setShowLegend] = useState(true);
  return (
    <div className="flex h-screen flex-col bg-white text-neutral-900">
      {/* Header */}
      <header className="flex shrink-0 items-center justify-between border-b border-neutral-200 bg-white px-5 py-3">
        <div className="flex items-center gap-3">
          <div
            className="flex h-7 w-7 items-center justify-center rounded text-white"
            style={{ backgroundColor: TEAL }}
          >
            <I.MapPin className="!h-4 !w-4" />
          </div>
          <div>
            <div className="text-sm font-semibold text-neutral-900">Saúde Territorial</div>
            <div className="text-[10px] uppercase tracking-wider text-neutral-500">
              US Moab Caldas
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <Link href="/proto" className="text-neutral-500 hover:text-neutral-800">
            ← proto index
          </Link>
          <button
            className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-white transition hover:opacity-90"
            style={{ backgroundColor: TEAL }}
          >
            <I.Plus /> Novo paciente
          </button>
        </div>
      </header>

      {/* Scene */}
      <div className="flex min-h-0 flex-1">
        {showSidebar && <Sidebar onClose={() => setShowSidebar(false)} />}

        {/* Map surface */}
        <div className="relative flex-1 overflow-hidden bg-[oklch(97%_0.006_90)]">
          <FakeBasemap />

          {/* Markers scattered */}
          <Marker layer="g" x={22} y={30} />
          <Marker layer="g" x={30} y={22} alert="amber" />
          <Marker layer="h" x={38} y={35} />
          <Marker layer="t" x={45} y={20} alert="red" />
          <Marker layer="g" x={52} y={30} count={2} alert="red" />
          <Marker layer="h" x={58} y={45} alert="amber" />
          <Marker layer="g" x={65} y={38} />
          <Cluster count={8} worst="red" x={35} y={62} />
          <Cluster count={4} worst="amber" x={70} y={65} />
          <Marker layer="t" x={78} y={78} />
          <Marker layer="g" x={82} y={30} />
          <Marker layer="h" x={22} y={72} />

          {/* Zoom / attribution */}
          <div className="absolute bottom-3 left-3 flex flex-col overflow-hidden rounded-md border border-neutral-200 bg-white shadow-sm">
            <button className="flex h-8 w-8 items-center justify-center text-neutral-600 hover:bg-neutral-50">+</button>
            <div className="h-px bg-neutral-200" />
            <button className="flex h-8 w-8 items-center justify-center text-neutral-600 hover:bg-neutral-50">−</button>
          </div>
          <div className="absolute bottom-2 right-2 rounded bg-white/70 px-1.5 py-0.5 text-[9px] text-neutral-500">
            © OpenStreetMap · CartoDB (mock)
          </div>

          {/* Show-sidebar pip */}
          {!showSidebar && (
            <button
              onClick={() => setShowSidebar(true)}
              className="absolute left-3 top-3 flex h-8 items-center gap-1.5 rounded-md border border-neutral-200 bg-white/95 px-2 text-xs font-medium text-neutral-700 shadow-sm backdrop-blur hover:bg-white"
              title="Mostrar barra lateral"
            >
              <I.PanelLeft className="!h-3.5 !w-3.5" />
              Barra
            </button>
          )}

          {/* Show-panel pip */}
          {!showPanel && (
            <button
              onClick={() => setShowPanel(true)}
              className="absolute right-3 top-3 flex h-8 items-center gap-1.5 rounded-md border border-neutral-200 bg-white/95 px-2 text-xs font-medium text-neutral-700 shadow-sm backdrop-blur hover:bg-white"
              title="Mostrar painel"
            >
              <I.PanelRight className="!h-3.5 !w-3.5" />
              Painel
            </button>
          )}

          {/* Legend */}
          {showLegend ? (
            <div
              className="absolute flex flex-col gap-1 rounded-md border border-neutral-200 bg-white/95 p-2.5 text-xs shadow-sm backdrop-blur"
              style={{ top: 12, right: !showPanel ? 96 : 12 }}
            >
              <div className="mb-0.5 flex items-center justify-between gap-4">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                  Legenda
                </span>
                <button
                  onClick={() => setShowLegend(false)}
                  className="rounded p-0.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
                  aria-label="Ocultar legenda"
                  title="Ocultar legenda"
                >
                  <I.X className="!h-3 !w-3" />
                </button>
              </div>
              {[
                { c: GESTANTE, label: "Gestante", n: 55 },
                { c: TB, label: "Tuberculose", n: 5 },
                { c: HAS, label: "HAS", n: 8 },
              ].map((l) => (
                <div key={l.label} className="flex items-center gap-2">
                  <span
                    className="h-3 w-3 rounded-full ring-1 ring-black/5"
                    style={{ backgroundColor: l.c }}
                  />
                  <span className="text-neutral-700">{l.label}</span>
                  <span className="ml-auto text-neutral-400">{l.n}</span>
                </div>
              ))}
              <div className="mt-1.5 flex items-center gap-2 border-t border-neutral-100 pt-1.5">
                <span className="relative h-3 w-3 rounded-full bg-neutral-300">
                  <span
                    className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full ring-1 ring-white"
                    style={{ backgroundColor: RED }}
                  />
                </span>
                <span className="text-neutral-700">Alerta crítico</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="relative h-3 w-3 rounded-full bg-neutral-300">
                  <span
                    className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full ring-1 ring-white"
                    style={{ backgroundColor: AMBER }}
                  />
                </span>
                <span className="text-neutral-700">Atenção</span>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowLegend(true)}
              className="absolute flex h-8 w-8 items-center justify-center rounded-md border border-neutral-200 bg-white/95 text-neutral-500 shadow-sm backdrop-blur hover:bg-white hover:text-neutral-700"
              style={{ top: 12, right: !showPanel ? 96 : 12 }}
              aria-label="Mostrar legenda"
              title="Mostrar legenda"
            >
              <I.Help className="!h-4 !w-4" />
            </button>
          )}
        </div>

        {showPanel && <AbbrPanel onClose={() => setShowPanel(false)} />}
      </div>
    </div>
  );
}
