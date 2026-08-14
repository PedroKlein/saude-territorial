"use client";

/**
 * Throwaway sketch — new-patient / add-condition wizard.
 * Route: /proto/wizard  (dev-only)
 *
 * Two flows sharing one wizard shell:
 *   A. "Novo paciente" — identidade → endereço → primeira condição (opcional) → confirmar
 *   B. "Adicionar condição" — escolher condição → dados → confirmar
 *
 * Step navigation at the top lets you jump around so you can see every step
 * without simulating a full session. Real thing enforces forward-only through
 * validation gates.
 */

import Link from "next/link";
import { useState } from "react";

const GESTANTE = "oklch(72% 0.11 15)";
const TB = "oklch(60% 0.09 40)";
const HAS = "oklch(60% 0.13 275)";
const TEAL = "oklch(58% 0.10 195)";
const RED = "oklch(58% 0.19 25)";

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
  X: (p: { className?: string }) => <svg {...svgProps} className={p.className}><path d="M18 6 6 18M6 6l12 12" /></svg>,
  Check: (p: { className?: string }) => <svg {...svgProps} className={p.className}><path d="M20 6 9 17l-5-5" /></svg>,
  ChevronRight: (p: { className?: string }) => <svg {...svgProps} className={p.className}><path d="m9 18 6-6-6-6" /></svg>,
  ChevronLeft: (p: { className?: string }) => <svg {...svgProps} className={p.className}><path d="m15 18-6-6 6-6" /></svg>,
  User: (p: { className?: string }) => <svg {...svgProps} className={p.className}><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>,
  MapPin: (p: { className?: string }) => <svg {...svgProps} className={p.className}><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 0 1 16 0" /><circle cx="12" cy="10" r="3" /></svg>,
  Alert: (p: { className?: string }) => <svg {...svgProps} className={p.className}><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><path d="M12 9v4" /><path d="M12 17h.01" /></svg>,
  Baby: (p: { className?: string }) => <svg {...svgProps} className={p.className}><path d="M9 12h.01" /><path d="M15 12h.01" /><path d="M10 16c.5.3 1.2.5 2 .5s1.5-.2 2-.5" /><path d="M19 6.3a9 9 0 0 1 1.8 3.9 2 2 0 0 1 0 3.6 9 9 0 0 1-17.6 0 2 2 0 0 1 0-3.6A9 9 0 0 1 12 3c2 0 3.5 1.1 3.5 2.5s-.9 2.5-2 2.5c-.8 0-1.5-.4-1.5-1" /></svg>,
  Lungs: (p: { className?: string }) => <svg {...svgProps} className={p.className}><path d="M6 20c1.6 0 3-1.3 3-3v-6a3 3 0 0 0-.8-2L4.9 5.1A2 2 0 0 0 3 4C2 4 1 5 1 6v11c0 1.7 1.3 3 2.8 3Zm12 0c-1.6 0-3-1.3-3-3v-6a3 3 0 0 1 .8-2L19.1 5.1A2 2 0 0 1 21 4c1 0 2 1 2 2v11c0 1.7-1.3 3-2.8 3Z" /><path d="M12 3v11" /><path d="M6 20h12" /></svg>,
  HeartPulse: (p: { className?: string }) => <svg {...svgProps} className={p.className}><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7Z" /><path d="M3.22 12H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27" /></svg>,
  Calculator: (p: { className?: string }) => <svg {...svgProps} className={p.className}><rect x="4" y="2" width="16" height="20" rx="2" /><line x1="8" y1="6" x2="16" y2="6" /><line x1="8" y1="14" x2="8" y2="14" /><line x1="12" y1="14" x2="12" y2="14" /><line x1="16" y1="14" x2="16" y2="14" /><line x1="8" y1="18" x2="8" y2="18" /><line x1="12" y1="18" x2="12" y2="18" /><line x1="16" y1="18" x2="16" y2="18" /></svg>,
  Sparkles: (p: { className?: string }) => <svg {...svgProps} className={p.className}><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" /></svg>,
};

/* -------------------- Form primitives -------------------- */
function Label({ children, required = false }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="mb-1 flex items-center gap-1 text-[11px] font-medium uppercase tracking-wider text-neutral-500">
      {children}
      {required && <span style={{ color: RED }}>*</span>}
    </label>
  );
}

function TextInput({ placeholder, value = "", mono = false }: { placeholder?: string; value?: string; mono?: boolean }) {
  return (
    <input
      type="text"
      defaultValue={value}
      placeholder={placeholder}
      className={`w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-[oklch(58%_0.10_195)] focus:outline-none focus:ring-2 focus:ring-[oklch(58%_0.10_195/0.15)] ${mono ? "font-mono text-xs" : ""}`}
    />
  );
}

function DateInput({ value }: { value?: string }) {
  return (
    <input
      type="date"
      defaultValue={value}
      className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-[oklch(58%_0.10_195)] focus:outline-none focus:ring-2 focus:ring-[oklch(58%_0.10_195/0.15)]"
    />
  );
}

function NumberInput({ value, min, max, unit }: { value?: number; min?: number; max?: number; unit?: string }) {
  return (
    <div className="relative">
      <input
        type="number"
        defaultValue={value}
        min={min}
        max={max}
        className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-[oklch(58%_0.10_195)] focus:outline-none focus:ring-2 focus:ring-[oklch(58%_0.10_195/0.15)]"
      />
      {unit && <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-500">{unit}</span>}
    </div>
  );
}

function Select({ value, options }: { value?: string; options: string[] }) {
  return (
    <select
      defaultValue={value}
      className="w-full appearance-none rounded-md border border-neutral-300 bg-white bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22gray%22 stroke-width=%222%22><path d=%22m6 9 6 6 6-6%22/></svg>')] bg-[position:right_0.75rem_center] bg-no-repeat px-3 py-2 pr-9 text-sm focus:border-[oklch(58%_0.10_195)] focus:outline-none focus:ring-2 focus:ring-[oklch(58%_0.10_195/0.15)]"
    >
      {options.map((o) => (
        <option key={o} value={o}>{o}</option>
      ))}
    </select>
  );
}

function Computed({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded-md border border-dashed border-neutral-300 bg-neutral-50 px-3 py-2">
      <div className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-neutral-500">
        <I.Calculator className="!h-3 !w-3" /> {label}
      </div>
      <div className="mt-0.5 text-sm font-medium text-neutral-800">{value}</div>
      {note && <div className="text-[11px] text-neutral-500">{note}</div>}
    </div>
  );
}

/* -------------------- Step contents -------------------- */

function StepIdentidade() {
  return (
    <div className="space-y-4">
      <div>
        <Label required>Nome completo</Label>
        <TextInput placeholder="Ex.: Maria Aparecida Silva" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label required>Data de nascimento</Label>
          <DateInput value="1994-03-12" />
        </div>
        <div>
          <Label>Sexo</Label>
          <Select value="Feminino" options={["Feminino", "Masculino", "Não informado"]} />
        </div>
      </div>
      <div>
        <Label required>CNS</Label>
        <TextInput placeholder="000 0000 0000 0000" mono />
        <div className="mt-1 text-[11px] text-neutral-500">
          15 dígitos. Se já existir, será oferecido "Adicionar condição ao paciente existente".
        </div>
      </div>
      <div>
        <Label>Telefone</Label>
        <TextInput placeholder="(00) 00000-0000" />
      </div>
      <div>
        <Label>Vulnerabilidades</Label>
        <textarea
          className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-[oklch(58%_0.10_195)] focus:outline-none focus:ring-2 focus:ring-[oklch(58%_0.10_195/0.15)]"
          rows={2}
          placeholder="Ex.: adolescente na família, insegurança alimentar"
        />
      </div>
    </div>
  );
}

function StepEndereco() {
  return (
    <div className="space-y-4">
      <div>
        <Label required>Endereço</Label>
        <TextInput placeholder="Ex.: Rua das Palmeiras, 45 — Vila Cruzeiro" value="Rua das Palmeiras, 45 — Vila Cruzeiro" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Bairro</Label>
          <TextInput placeholder="Ex.: Vila Cruzeiro" value="Vila Cruzeiro" />
        </div>
        <div>
          <Label>Microárea</Label>
          <Select value="MA 07" options={["MA 01", "MA 02", "MA 03", "MA 04", "MA 05", "MA 06", "MA 07", "MA 08", "MA 09", "MA 10", "MA 11", "MA 12"]} />
        </div>
      </div>

      {/* Geocode preview */}
      <div className="rounded-md border border-neutral-200 bg-neutral-50 p-3">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
            <I.MapPin className="!h-3 !w-3" /> Localização
          </div>
          <span className="rounded-full bg-[oklch(94%_0.06_155)] px-2 py-0.5 text-[10px] font-medium text-[oklch(35%_0.14_155)]">
            <I.Check className="!inline !h-3 !w-3" /> Geocodificado
          </span>
        </div>
        <div className="relative h-32 overflow-hidden rounded border border-neutral-200 bg-white">
          <svg viewBox="0 0 400 128" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
            <rect width="400" height="128" fill="oklch(96% 0.006 90)" />
            <rect x="20" y="15" width="80" height="45" fill="oklch(93% 0.008 90)" />
            <rect x="120" y="15" width="90" height="50" fill="oklch(93% 0.008 90)" />
            <rect x="230" y="10" width="70" height="55" fill="oklch(93% 0.008 90)" />
            <rect x="320" y="20" width="60" height="45" fill="oklch(93% 0.008 90)" />
            <rect x="30" y="80" width="80" height="40" fill="oklch(93% 0.008 90)" />
            <rect x="130" y="80" width="90" height="40" fill="oklch(93% 0.008 90)" />
            <path d="M0 72 L400 72" stroke="oklch(90% 0.005 90)" strokeWidth="2" />
            <path d="M110 0 L110 128" stroke="oklch(90% 0.005 90)" strokeWidth="2" />
            <path d="M220 0 L220 128" stroke="oklch(90% 0.005 90)" strokeWidth="2" />
          </svg>
          <div
            className="absolute -translate-x-1/2 -translate-y-full"
            style={{ left: "50%", top: "55%" }}
          >
            <div
              className="flex h-7 w-7 items-center justify-center rounded-full text-white shadow-[0_2px_6px_rgba(0,0,0,0.18),0_0_0_2px_white]"
              style={{ backgroundColor: TEAL }}
            >
              <I.MapPin className="!h-3.5 !w-3.5" />
            </div>
          </div>
        </div>
        <div className="mt-2 flex items-center justify-between text-xs">
          <span className="font-mono text-neutral-600">-30.0733, -51.2140</span>
          <button className="rounded-md border border-neutral-300 bg-white px-2 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50">
            Ajustar pino manualmente
          </button>
        </div>
      </div>

      <div className="rounded-md bg-[oklch(97%_0.04_75)] px-3 py-2 text-[12px] text-[oklch(42%_0.13_65)]">
        <span className="font-medium">Não encontrou?</span> Se o endereço não retornar coordenadas
        (comum em endereços sem número), você poderá arrastar o pino manualmente após salvar.
      </div>
    </div>
  );
}

function ConditionCard({
  active,
  color,
  icon,
  title,
  desc,
  onClick,
}: {
  active: boolean;
  color: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-start gap-3 rounded-lg border p-3 text-left transition ${
        active
          ? "shadow-[0_0_0_2px_var(--acc),0_2px_8px_rgba(0,0,0,0.05)]"
          : "border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50"
      }`}
      style={active ? ({ ["--acc" as string]: color, borderColor: color } as React.CSSProperties) : undefined}
    >
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white"
        style={{ backgroundColor: color }}
      >
        {icon}
      </span>
      <span className="flex-1">
        <span className="block text-sm font-semibold text-neutral-900">{title}</span>
        <span className="mt-0.5 block text-xs text-neutral-500">{desc}</span>
      </span>
      {active && (
        <span
          className="flex h-5 w-5 items-center justify-center rounded-full text-white"
          style={{ backgroundColor: color }}
        >
          <I.Check className="!h-3 !w-3" />
        </span>
      )}
    </button>
  );
}

function StepEscolherCondicoes({
  chosen,
  toggle,
  skippable,
  alreadyAttached = new Set(),
}: {
  chosen: Set<"g" | "t" | "h">;
  toggle: (c: "g" | "t" | "h") => void;
  skippable?: boolean;
  alreadyAttached?: Set<"g" | "t" | "h">;
}) {
  const options: Array<{ id: "g" | "t" | "h"; color: string; icon: React.ReactNode; title: string; desc: string }> = [
    { id: "g", color: GESTANTE, icon: <I.Baby className="!h-5 !w-5" />, title: "Gestante", desc: "Pré-natal, exames, puerpério" },
    { id: "t", color: TB, icon: <I.Lungs className="!h-5 !w-5" />, title: "Tuberculose", desc: "Diagnóstico, tratamento, TDO, contatos" },
    { id: "h", color: HAS, icon: <I.HeartPulse className="!h-5 !w-5" />, title: "HAS — Hipertensão", desc: "Consultas, aferições, encaminhamentos" },
  ];
  return (
    <div className="space-y-3">
      <div className="rounded-md bg-neutral-50 px-3 py-2 text-xs text-neutral-600">
        Selecione <span className="font-medium text-neutral-800">uma ou mais</span> condições
        {skippable && " — ou nenhuma. Você pode adicionar condições depois pelo painel do paciente."}
        {chosen.size > 0 && (
          <> Cada condição escolhida adicionará uma página de dados ao wizard.</>
        )}
      </div>
      {options.map((o) => {
        const attached = alreadyAttached.has(o.id);
        const active = chosen.has(o.id);
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => !attached && toggle(o.id)}
            disabled={attached}
            className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition ${
              attached
                ? "cursor-not-allowed border-neutral-200 bg-neutral-50 opacity-60"
                : active
                  ? "shadow-[0_0_0_2px_var(--acc),0_2px_8px_rgba(0,0,0,0.05)]"
                  : "border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50"
            }`}
            style={active ? ({ ["--acc" as string]: o.color, borderColor: o.color } as React.CSSProperties) : undefined}
          >
            {/* Checkbox */}
            <span
              aria-hidden
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition ${
                active
                  ? "border-transparent text-white"
                  : "border-neutral-300 bg-white"
              }`}
              style={active ? { backgroundColor: o.color } : undefined}
            >
              {active && <I.Check className="!h-3.5 !w-3.5" />}
            </span>
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white"
              style={{ backgroundColor: attached ? "oklch(80% 0 0)" : o.color }}
            >
              {o.icon}
            </span>
            <span className="flex-1">
              <span className="block text-sm font-semibold text-neutral-900">{o.title}</span>
              <span className="mt-0.5 block text-xs text-neutral-500">
                {attached ? "Já atribuída a este paciente" : o.desc}
              </span>
            </span>
          </button>
        );
      })}
      {chosen.size > 0 && (
        <div className="mt-2 rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-neutral-600">
          <span className="font-medium text-neutral-800">Próximas páginas:</span>{" "}
          {[...chosen]
            .map((c) => (c === "g" ? "Gestante" : c === "t" ? "Tuberculose" : "HAS"))
            .join(" → ")}
          {" → Confirmar"}
        </div>
      )}
    </div>
  );
}

function StepDadosGestante() {
  return (
    <div className="space-y-4">
      <div className="rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-neutral-600">
        <span className="font-medium">DPP e IG são calculados</span> a partir da DUM. Você não precisa
        digitá-los.
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label required>DUM</Label>
          <DateInput value="2025-12-25" />
        </div>
        <Computed label="DPP (DUM + 280d)" value="01/10/2026" />
        <Computed label="IG hoje" value="38 semanas" note="Cálculo baseado em hoje" />
        <div>
          <Label>IG na abertura PN</Label>
          <Select value="<12 sem" options={["<12 sem", "12-24 sem", ">24 sem"]} />
        </div>
        <div>
          <Label required>Risco</Label>
          <Select value="alto" options={["habitual", "alto"]} />
        </div>
        <div>
          <Label>Nº consultas</Label>
          <NumberInput value={7} min={0} max={30} />
        </div>
        <div>
          <Label>Data próxima consulta</Label>
          <DateInput value="2026-08-20" />
        </div>
        <div>
          <Label>Pressão arterial</Label>
          <TextInput value="130/85" mono />
        </div>
        <div className="col-span-2">
          <Label>Vacina dTpa</Label>
          <Select value="Feito" options={["", "Feito", "Não Feito"]} />
        </div>
      </div>
      <div className="rounded-md border border-[oklch(85%_0.10_25)] bg-[oklch(97%_0.03_25)] px-3 py-2 text-[12px] text-[oklch(38%_0.15_25)]">
        <div className="flex items-center gap-1.5 font-medium">
          <I.Alert className="!h-3.5 !w-3.5" /> Regra de alerta ativada
        </div>
        <div className="mt-1">
          Como <em>risco = alto</em>, essa gestante entrará na lista "Precisam atenção" ao salvar.
        </div>
      </div>
      <button className="text-xs font-medium text-neutral-500 hover:text-neutral-800">
        Mostrar campos avançados (exames TR, monitoramento, puerpério…) →
      </button>
    </div>
  );
}

function StepDadosTB() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label required>Tipo</Label>
          <Select value="Pulmonar" options={["Pulmonar", "Extrapulmonar", "Mista"]} />
        </div>
        <div>
          <Label required>Tipo de entrada</Label>
          <Select value="Caso novo" options={["Caso novo", "Recidiva", "Reingresso pós-abandono", "Transferência"]} />
        </div>
        <div>
          <Label>Forma clínica</Label>
          <Select value="Pulmonar" options={["Pulmonar", "Pleural", "Ganglionar", "Miliar", "Óssea"]} />
        </div>
        <div>
          <Label>Esquema</Label>
          <Select value="RHZE" options={["RHZE", "RH", "Individualizado"]} />
        </div>
        <div>
          <Label required>Data início do tratamento</Label>
          <DateInput />
        </div>
        <div>
          <Label>TDO</Label>
          <Select value="Regular" options={["Regular", "Irregular/faltoso", ""]} />
        </div>
        <div>
          <Label>Baciloscopia — 1ª amostra</Label>
          <DateInput />
        </div>
        <div>
          <Label>Baciloscopia — 2ª amostra</Label>
          <DateInput />
        </div>
        <div>
          <Label>PPD</Label>
          <NumberInput min={0} max={50} unit="mm" />
        </div>
        <div>
          <Label>Nº coabitantes</Label>
          <NumberInput min={0} max={20} />
        </div>
      </div>
      <button className="text-xs font-medium text-neutral-500 hover:text-neutral-800">
        Mostrar campos avançados (exames adicionais, encerramento, contatos…) →
      </button>
    </div>
  );
}

function StepDadosHAS() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label required>Data da última consulta</Label>
          <DateInput />
        </div>
        <div>
          <Label>Data da próxima consulta</Label>
          <DateInput />
        </div>
        <div>
          <Label>Data da última aferição PA</Label>
          <DateInput />
        </div>
        <div>
          <Label>Pressão arterial</Label>
          <TextInput placeholder="Ex.: 140/90" mono />
        </div>
        <div className="col-span-2">
          <Label>Notas clínicas</Label>
          <textarea
            rows={2}
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-[oklch(58%_0.10_195)] focus:outline-none focus:ring-2 focus:ring-[oklch(58%_0.10_195/0.15)]"
            placeholder="Ex.: controlada com hidroclorotiazida 25mg"
          />
        </div>
        <div className="col-span-2">
          <Label>Encaminhamentos</Label>
          <textarea
            rows={2}
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-[oklch(58%_0.10_195)] focus:outline-none focus:ring-2 focus:ring-[oklch(58%_0.10_195/0.15)]"
            placeholder="Ex.: nutricionista"
          />
        </div>
      </div>
    </div>
  );
}

function StepConfirmar() {
  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-neutral-200 bg-white p-4">
        <div className="flex items-start gap-3">
          <div
            className="flex h-11 w-11 items-center justify-center rounded-full text-white text-sm font-medium"
            style={{ backgroundColor: TEAL }}
          >
            MA
          </div>
          <div>
            <div className="text-sm font-semibold text-neutral-900">Maria Aparecida Silva</div>
            <div className="text-xs text-neutral-500">30 anos · Feminino · MA 07</div>
            <div className="mt-1 flex items-center gap-2 text-xs text-neutral-600">
              <I.MapPin className="!h-3 !w-3 text-neutral-400" /> Rua das Palmeiras, 45 — Vila Cruzeiro
            </div>
            <div className="mt-0.5 font-mono text-xs text-neutral-600">704 8036 0125 6789</div>
          </div>
        </div>
      </div>
      <div
        className="overflow-hidden rounded-lg border border-neutral-200"
        style={{ borderLeftColor: GESTANTE, borderLeftWidth: "3px" }}
      >
        <div className="flex items-center gap-2 border-b border-neutral-100 bg-neutral-50/50 px-3 py-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full text-white" style={{ backgroundColor: GESTANTE }}>
            <I.Baby className="!h-3 !w-3" />
          </span>
          <span className="text-sm font-semibold">Gestante · risco alto</span>
        </div>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 px-3 py-3 text-xs">
          <div><dt className="text-neutral-500">DUM</dt><dd className="text-neutral-800">25/12/2025</dd></div>
          <div><dt className="text-neutral-500">DPP</dt><dd className="text-neutral-800">01/10/2026</dd></div>
          <div><dt className="text-neutral-500">IG</dt><dd className="text-neutral-800">38 semanas</dd></div>
          <div><dt className="text-neutral-500">Próxima consulta</dt><dd className="text-neutral-800">20/08/2026</dd></div>
        </dl>
      </div>
      <div className="flex items-start gap-2 rounded-md bg-neutral-50 px-3 py-2 text-xs text-neutral-600">
        <I.Check className="!h-4 !w-4 shrink-0 text-[oklch(50%_0.14_155)]" />
        Ao salvar, o paciente aparecerá no mapa na MA 07 e entrará automaticamente na lista de
        prioridades (risco alto).
      </div>
    </div>
  );
}

function StepSucesso() {
  return (
    <div className="flex flex-col items-center py-8 text-center">
      <div
        className="mb-4 flex h-16 w-16 items-center justify-center rounded-full text-white"
        style={{ backgroundColor: "oklch(65% 0.14 155)" }}
      >
        <I.Check className="!h-8 !w-8" />
      </div>
      <h3 className="text-lg font-semibold text-neutral-900">Paciente cadastrada</h3>
      <p className="mt-1 max-w-xs text-sm text-neutral-600">
        Maria Aparecida Silva foi adicionada à MA 07. Você pode encontrá-la agora no mapa ou na
        lista de prioridades.
      </p>
      <p className="mt-3 flex items-center gap-1 text-[11px] text-neutral-400">
        <I.Sparkles className="!h-3 !w-3" /> Animação Lottie no lugar do check estático
      </p>
      <div className="mt-6 flex gap-2">
        <button className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50">
          Ver no mapa
        </button>
        <button
          className="rounded-md px-3 py-2 text-sm font-medium text-white hover:opacity-90"
          style={{ backgroundColor: TEAL }}
        >
          Adicionar outra condição
        </button>
      </div>
    </div>
  );
}

/* -------------------- Wizard shell -------------------- */

type StepId =
  | "identidade"
  | "endereco"
  | "condicoes"
  | "dados-g"
  | "dados-t"
  | "dados-h"
  | "confirmar"
  | "sucesso";

const CONDITION_LABEL: Record<"g" | "t" | "h", string> = {
  g: "Gestante",
  t: "Tuberculose",
  h: "HAS",
};

function buildSteps(
  flow: "novo" | "cond",
  chosen: Set<"g" | "t" | "h">,
): Array<{ id: StepId; label: string }> {
  const dataSteps = (["g", "t", "h"] as const)
    .filter((c) => chosen.has(c))
    .map((c) => ({ id: `dados-${c}` as StepId, label: CONDITION_LABEL[c] }));

  if (flow === "novo") {
    return [
      { id: "identidade", label: "Identidade" },
      { id: "endereco", label: "Endereço" },
      { id: "condicoes", label: "Condições" },
      ...dataSteps,
      { id: "confirmar", label: "Confirmar" },
      { id: "sucesso", label: "Pronto" },
    ];
  }
  return [
    { id: "condicoes", label: "Condições" },
    ...dataSteps,
    { id: "confirmar", label: "Confirmar" },
    { id: "sucesso", label: "Pronto" },
  ];
}

/** Mocked to demonstrate the "Já atribuída" state on the add-condition flow. */
const MOCK_EXISTING_CONDITIONS = new Set<"g" | "t" | "h">(["g"]);

export default function WizardProtoPage() {
  const [flow, setFlow] = useState<"novo" | "cond">("novo");
  const [stepIdx, setStepIdx] = useState(0);
  const [chosen, setChosen] = useState<Set<"g" | "t" | "h">>(() => new Set(["g"]));

  const steps = buildSteps(flow, chosen);
  // Guard against a chosen change that shortened the array below stepIdx.
  const safeStepIdx = Math.min(stepIdx, steps.length - 1);
  const step = steps[safeStepIdx];
  const isFinal = step.id === "sucesso";
  const canBack = safeStepIdx > 0 && !isFinal;
  const isLastBeforeSuccess = safeStepIdx === steps.length - 2;

  const toggleCondition = (c: "g" | "t" | "h") => {
    setChosen((prev) => {
      const next = new Set(prev);
      if (next.has(c)) next.delete(c);
      else next.add(c);
      return next;
    });
  };

  const dataTitleFor = (c: "g" | "t" | "h") =>
    c === "g" ? "Dados da gestante" : c === "t" ? "Dados da tuberculose" : "Dados da HAS";

  const titleFor: Record<StepId, string> = {
    identidade: "Quem é o paciente?",
    endereco: "Onde ele mora?",
    condicoes: flow === "novo" ? "Condições" : "Adicionar quais condições?",
    "dados-g": dataTitleFor("g"),
    "dados-t": dataTitleFor("t"),
    "dados-h": dataTitleFor("h"),
    confirmar: "Revisar e salvar",
    sucesso: "",
  };

  return (
    <div className="min-h-screen bg-[oklch(97%_0.006_90)] text-neutral-900">
      <header className="border-b border-neutral-200 bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
              Sketch
            </div>
            <h1 className="text-lg font-semibold text-neutral-900">
              Wizard — novo paciente / adicionar condição
            </h1>
          </div>
          <Link href="/proto" className="text-xs text-neutral-500 hover:text-neutral-800">
            ← proto index
          </Link>
        </div>
      </header>

      {/* Flow switcher (sketch-only) */}
      <div className="border-b border-neutral-200 bg-white px-6 py-2 text-xs">
        <div className="flex items-center gap-2 text-neutral-500">
          <span>Fluxo:</span>
          <button
            onClick={() => {
              setFlow("novo");
              setStepIdx(0);
            }}
            className={`rounded-full px-2 py-0.5 ${flow === "novo" ? "bg-neutral-900 text-white" : "text-neutral-700 hover:bg-neutral-100"}`}
          >
            Novo paciente
          </button>
          <button
            onClick={() => {
              setFlow("cond");
              setStepIdx(0);
            }}
            className={`rounded-full px-2 py-0.5 ${flow === "cond" ? "bg-neutral-900 text-white" : "text-neutral-700 hover:bg-neutral-100"}`}
          >
            Adicionar condição
          </button>
        </div>
      </div>

      {/* Modal on dimmed background */}
      <div className="flex min-h-[calc(100vh-9rem)] items-start justify-center p-6">
        <div className="w-full max-w-[520px]">
          <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-[0_10px_40px_rgba(0,0,0,0.08)]">
            {/* Modal header */}
            <div className="border-b border-neutral-200 px-5 pb-3 pt-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[10px] font-medium uppercase tracking-wider text-neutral-500">
                    {flow === "novo" ? "Novo paciente" : "Adicionar condição"}
                    {flow === "cond" && (
                      <span className="ml-2 text-neutral-400">Maria Aparecida Silva</span>
                    )}
                  </div>
                  {!isFinal && (
                    <h2 className="mt-0.5 text-base font-semibold text-neutral-900">
                      {titleFor[step.id]}
                    </h2>
                  )}
                </div>
                <button className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700" aria-label="Fechar">
                  <I.X />
                </button>
              </div>

              {/* Step indicator */}
              {!isFinal && (
                <div className="mt-3 flex items-center gap-1.5">
                  {steps.slice(0, -1).map((s, i) => {
                    const done = i < stepIdx;
                    const active = i === stepIdx;
                    return (
                      <button
                        key={s.id}
                        onClick={() => setStepIdx(i)}
                        className="flex flex-1 flex-col items-start gap-1"
                      >
                        <div
                          className={`h-1 w-full rounded-full transition ${
                            done || active ? "" : "bg-neutral-200"
                          }`}
                          style={done || active ? { backgroundColor: TEAL } : undefined}
                        />
                        <div className={`text-[10px] font-medium ${active ? "text-neutral-900" : done ? "text-neutral-600" : "text-neutral-400"}`}>
                          {s.label}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal body */}
            <div className="max-h-[540px] overflow-y-auto px-5 py-5">
              {step.id === "identidade" && <StepIdentidade />}
              {step.id === "endereco" && <StepEndereco />}
              {step.id === "condicoes" && (
                <StepEscolherCondicoes
                  chosen={chosen}
                  toggle={toggleCondition}
                  skippable={flow === "novo"}
                  alreadyAttached={flow === "cond" ? MOCK_EXISTING_CONDITIONS : undefined}
                />
              )}
              {step.id === "dados-g" && <StepDadosGestante />}
              {step.id === "dados-t" && <StepDadosTB />}
              {step.id === "dados-h" && <StepDadosHAS />}
              {step.id === "confirmar" && <StepConfirmar />}
              {step.id === "sucesso" && <StepSucesso />}
            </div>

            {/* Modal footer */}
            {!isFinal && (
              <div className="flex items-center justify-between gap-3 border-t border-neutral-200 bg-neutral-50 px-5 py-3">
                <button
                  disabled={!canBack}
                  onClick={() => setStepIdx((i) => Math.max(0, Math.min(i, steps.length - 1) - 1))}
                  className={`flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium transition ${
                    canBack
                      ? "text-neutral-700 hover:bg-neutral-100"
                      : "cursor-not-allowed text-neutral-300"
                  }`}
                >
                  <I.ChevronLeft className="!h-4 !w-4" />
                  Voltar
                </button>
                <div className="flex items-center gap-2">
                  {step.id === "condicoes" && flow === "novo" && chosen.size === 0 && (
                    <button
                      onClick={() => setStepIdx(steps.findIndex((s) => s.id === "confirmar"))}
                      className="rounded-md px-3 py-2 text-sm font-medium text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800"
                    >
                      Pular
                    </button>
                  )}
                  <button
                    onClick={() =>
                      setStepIdx((i) =>
                        Math.min(steps.length - 1, Math.min(i, steps.length - 1) + 1),
                      )
                    }
                    className="flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium text-white transition hover:opacity-90"
                    style={{ backgroundColor: TEAL }}
                  >
                    {isLastBeforeSuccess ? "Salvar" : "Continuar"}
                    <I.ChevronRight className="!h-4 !w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
