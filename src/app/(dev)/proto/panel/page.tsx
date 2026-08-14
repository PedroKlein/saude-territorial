"use client";

/* eslint-disable @next/next/no-img-element */
/**
 * Throwaway sketch — patient detail panel variations.
 *
 * Route: /proto/panel  (dev-only, no auth gate, no data wiring)
 *
 * Three variations of the SAME content (a fictional multi-condition patient)
 * so the user can pick a direction before we touch real components.
 *
 * The design tokens are inlined via arbitrary Tailwind values — deliberately
 * NOT wired into globals.css yet. Once a variation wins we lift them into the
 * theme file and delete this route.
 */

import { useState } from "react";
import Link from "next/link";

/* -------------------------------------------------------------------------- */
/*  Mock patient — Maria Aparecida Silva, gestante alto risco + HAS           */
/* -------------------------------------------------------------------------- */

const patient = {
  nome: "Maria Aparecida Silva",
  cns: "704 8036 0125 6789",
  dob: "12/03/1994",
  age: 30,
  telefone: "(51) 98421-7734",
  endereco: "Rua das Palmeiras, 45 — Vila Cruzeiro",
  microarea: "MA 07",
  vulnerabilidades: "Adolescente na família, insegurança alimentar",
  updatedAt: "há 3 dias",
  gestante: {
    dum: "25/12/2025",
    dpp: "01/10/2026",
    ig: "38 semanas",
    igAbertura: "<12 sem",
    risco: "alto" as const,
    numeroConsultas: 7,
    dataProximaConsulta: "20/08/2026",
    pressaoArterial: "130/85",
    vacinaDtpa: "Feito",
    alert: { level: "atencao" as const, label: "Risco alto — acompanhar" },
  },
  has: {
    dataUltimaConsulta: "15/02/2026",
    dataProximaConsulta: "15/08/2026 (atrasada 3d)",
    dataUltimaAfericaoPa: "10/08/2026",
    pressaoArterial: "130/85",
    notas: "Bem controlada com hidroclorotiazida 25mg",
    encaminhamentos: "Nutricionista (agendado 22/08)",
    alert: {
      level: "critico" as const,
      label: "Última consulta há 6 meses",
    },
  },
};

/* -------------------------------------------------------------------------- */
/*  Inline lucide icons (subset)                                              */
/* -------------------------------------------------------------------------- */

const Icon = {
  User: (p: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className}><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
  ),
  Baby: (p: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className}><path d="M9 12h.01" /><path d="M15 12h.01" /><path d="M10 16c.5.3 1.2.5 2 .5s1.5-.2 2-.5" /><path d="M19 6.3a9 9 0 0 1 1.8 3.9 2 2 0 0 1 0 3.6 9 9 0 0 1-17.6 0 2 2 0 0 1 0-3.6A9 9 0 0 1 12 3c2 0 3.5 1.1 3.5 2.5s-.9 2.5-2 2.5c-.8 0-1.5-.4-1.5-1" /></svg>
  ),
  HeartPulse: (p: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className}><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7Z" /><path d="M3.22 12H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27" /></svg>
  ),
  Lungs: (p: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className}><path d="M6.081 20c1.612 0 2.919-1.335 2.919-2.98v-6.014a2.9 2.9 0 0 0-.769-1.978L4.85 5.14A2.021 2.021 0 0 0 3 4.14C1.895 4.14 1 5.02 1 6.098v10.898C1 18.646 2.267 20 3.828 20Zm11.838 0c-1.612 0-2.919-1.335-2.919-2.98v-6.014a2.9 2.9 0 0 1 .769-1.978l3.381-3.889A2.021 2.021 0 0 1 21 4.14c1.105 0 2 .88 2 1.958v10.898C23 18.646 21.733 20 20.172 20Z" /><path d="M12 3v11" /><path d="M6 20h12" /></svg>
  ),
  AlertTriangle: (p: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className}><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><path d="M12 9v4" /><path d="M12 17h.01" /></svg>
  ),
  Calendar: (p: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className}><rect width="18" height="18" x="3" y="4" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
  ),
  Phone: (p: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
  ),
  MapPin: (p: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className}><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" /><circle cx="12" cy="10" r="3" /></svg>
  ),
  ChevronDown: (p: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className}><path d="m6 9 6 6 6-6" /></svg>
  ),
  Pencil: (p: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className}><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" /><path d="m15 5 4 4" /></svg>
  ),
  Plus: (p: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className}><path d="M5 12h14M12 5v14" /></svg>
  ),
  X: (p: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className}><path d="M18 6 6 18M6 6l18 18" /></svg>
  ),
};

/* -------------------------------------------------------------------------- */
/*  Shared bits — identity block, alert chip, tokens strip                    */
/* -------------------------------------------------------------------------- */

function Avatar({ name, ring }: { name: string; ring?: string }) {
  const initials = name.split(" ").slice(0, 2).map((w) => w[0]).join("");
  return (
    <div
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-medium text-white shadow-sm ${ring ?? ""}`}
      style={{ backgroundColor: "oklch(58% 0.10 195)" }}
    >
      {initials}
    </div>
  );
}

function AlertChip({ level, label }: { level: "critico" | "atencao"; label: string }) {
  const styles =
    level === "critico"
      ? { bg: "oklch(96% 0.03 25)", fg: "oklch(38% 0.15 25)", border: "oklch(85% 0.10 25)" }
      : { bg: "oklch(97% 0.04 75)", fg: "oklch(42% 0.13 65)", border: "oklch(85% 0.09 75)" };
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium"
      style={{ backgroundColor: styles.bg, color: styles.fg, borderColor: styles.border }}
    >
      <Icon.AlertTriangle className="h-3 w-3" />
      {label}
    </span>
  );
}

function Field({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-[11px] font-medium uppercase tracking-wider text-neutral-500">
        {label}
      </div>
      <div className={`mt-0.5 text-sm text-neutral-800 ${mono ? "font-mono" : ""}`}>
        {value}
      </div>
    </div>
  );
}

function IdentityBlock({ compact = false }: { compact?: boolean }) {
  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3">
        <Avatar name={patient.nome} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold leading-tight text-neutral-900">
                {patient.nome}
              </h2>
              <div className="mt-0.5 text-xs text-neutral-500">
                {patient.age} anos · {patient.dob} · {patient.microarea}
              </div>
            </div>
            <button
              className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
              aria-label="Editar"
            >
              <Icon.Pencil />
            </button>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1">
            <AlertChip level={patient.has.alert.level} label={patient.has.alert.label} />
            <AlertChip level={patient.gestante.alert.level} label={patient.gestante.alert.label} />
          </div>
        </div>
      </div>

      {!compact && (
        <dl className="grid grid-cols-1 gap-2.5 text-sm">
          <div className="flex items-start gap-2 text-neutral-600">
            <Icon.MapPin className="mt-0.5 shrink-0 text-neutral-400" />
            <span>{patient.endereco}</span>
          </div>
          <div className="flex items-center gap-2 text-neutral-600">
            <Icon.Phone className="shrink-0 text-neutral-400" />
            <span>{patient.telefone}</span>
          </div>
          <div className="flex items-center gap-2 text-neutral-600">
            <Icon.User className="shrink-0 text-neutral-400" />
            <span className="font-mono text-xs">{patient.cns}</span>
          </div>
        </dl>
      )}

      {!compact && (
        <div className="rounded-md bg-amber-50/60 px-2.5 py-1.5 text-[12px] text-amber-900">
          <span className="font-medium">Vulnerabilidades:</span> {patient.vulnerabilidades}
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Variation 1 — Accordion cards, Notion-ish                                 */
/* -------------------------------------------------------------------------- */

const GESTANTE_ACCENT = "oklch(72% 0.11 15)"; // soft rose
const HAS_ACCENT = "oklch(60% 0.13 275)"; // clinical indigo

function VariationOne() {
  return (
    <div className="flex h-full flex-col overflow-y-auto bg-white">
      <div className="border-b border-neutral-200 p-5">
        <IdentityBlock />
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        {/* Gestante card */}
        <details
          open
          className="group overflow-hidden rounded-[10px] border border-neutral-200 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)]"
          style={{ borderLeftColor: GESTANTE_ACCENT, borderLeftWidth: "3px" }}
        >
          <summary className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3 hover:bg-neutral-50 [&::-webkit-details-marker]:hidden">
            <div className="flex items-center gap-2.5">
              <span
                className="flex h-8 w-8 items-center justify-center rounded-full text-white"
                style={{ backgroundColor: GESTANTE_ACCENT }}
              >
                <Icon.Baby />
              </span>
              <div>
                <div className="text-sm font-semibold text-neutral-900">Gestante</div>
                <div className="text-xs text-neutral-500">
                  {patient.gestante.ig} · risco {patient.gestante.risco}
                </div>
              </div>
            </div>
            <Icon.ChevronDown className="text-neutral-400 transition-transform group-open:rotate-180" />
          </summary>
          <div className="border-t border-neutral-100 px-4 py-4">
            <div className="mb-3 text-[11px] font-medium uppercase tracking-wider text-neutral-500">
              Pré-natal
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              <Field label="DUM" value={patient.gestante.dum} />
              <Field label="DPP (calculado)" value={patient.gestante.dpp} />
              <Field label="IG (calculado)" value={patient.gestante.ig} />
              <Field label="IG na abertura PN" value={patient.gestante.igAbertura} />
              <Field label="Risco" value={patient.gestante.risco} />
              <Field label="Nº consultas" value={String(patient.gestante.numeroConsultas)} />
              <Field label="Próxima consulta" value={patient.gestante.dataProximaConsulta} />
              <Field label="PA" value={patient.gestante.pressaoArterial} mono />
              <Field label="Vacina dTpa" value={patient.gestante.vacinaDtpa} />
            </div>
            <button className="mt-4 text-xs font-medium text-neutral-500 hover:text-neutral-800">
              Mostrar campos avançados →
            </button>
          </div>
        </details>

        {/* HAS card */}
        <details
          open
          className="group overflow-hidden rounded-[10px] border border-neutral-200 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)]"
          style={{ borderLeftColor: HAS_ACCENT, borderLeftWidth: "3px" }}
        >
          <summary className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3 hover:bg-neutral-50 [&::-webkit-details-marker]:hidden">
            <div className="flex items-center gap-2.5">
              <span
                className="flex h-8 w-8 items-center justify-center rounded-full text-white"
                style={{ backgroundColor: HAS_ACCENT }}
              >
                <Icon.HeartPulse />
              </span>
              <div>
                <div className="text-sm font-semibold text-neutral-900">HAS — Hipertensão</div>
                <div className="text-xs text-neutral-500">
                  Última consulta {patient.has.dataUltimaConsulta}
                </div>
              </div>
            </div>
            <Icon.ChevronDown className="text-neutral-400 transition-transform group-open:rotate-180" />
          </summary>
          <div className="border-t border-neutral-100 px-4 py-4">
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              <Field label="Última consulta" value={patient.has.dataUltimaConsulta} />
              <Field label="Próxima consulta" value={patient.has.dataProximaConsulta} />
              <Field label="Última aferição PA" value={patient.has.dataUltimaAfericaoPa} />
              <Field label="PA" value={patient.has.pressaoArterial} mono />
            </div>
            <div className="mt-3">
              <div className="text-[11px] font-medium uppercase tracking-wider text-neutral-500">
                Notas clínicas
              </div>
              <div className="mt-1 text-sm text-neutral-800">{patient.has.notas}</div>
            </div>
            <div className="mt-3">
              <div className="text-[11px] font-medium uppercase tracking-wider text-neutral-500">
                Encaminhamentos
              </div>
              <div className="mt-1 text-sm text-neutral-800">{patient.has.encaminhamentos}</div>
            </div>
          </div>
        </details>

        <button className="flex items-center justify-center gap-1.5 rounded-md border border-dashed border-neutral-300 py-2.5 text-sm font-medium text-neutral-500 hover:border-neutral-400 hover:bg-neutral-50 hover:text-neutral-800">
          <Icon.Plus /> Adicionar condição
        </button>
      </div>

      <div className="mt-auto border-t border-neutral-200 bg-neutral-50 px-5 py-2 text-[11px] text-neutral-500">
        Atualizado {patient.updatedAt}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Variation 2 — Editorial sections, flat, no cards                          */
/* -------------------------------------------------------------------------- */

function SectionHeader({
  color,
  icon,
  title,
  meta,
}: {
  color: string;
  icon: React.ReactNode;
  title: string;
  meta: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-3">
      <div className="flex items-center gap-2.5">
        <span
          className="flex h-6 w-6 items-center justify-center rounded-md text-white"
          style={{ backgroundColor: color }}
        >
          {icon}
        </span>
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-neutral-900">
          {title}
        </span>
      </div>
      <span className="text-xs text-neutral-500">{meta}</span>
    </div>
  );
}

function VariationTwo() {
  return (
    <div className="flex h-full flex-col overflow-y-auto bg-white">
      <div className="border-b border-neutral-200 p-5">
        <IdentityBlock />
      </div>

      <div className="flex-1 px-5 pb-5">
        <div className="mt-3 border-b border-neutral-200">
          <SectionHeader
            color={GESTANTE_ACCENT}
            icon={<Icon.Baby />}
            title="Gestante"
            meta={`${patient.gestante.ig} · risco ${patient.gestante.risco}`}
          />
        </div>
        <div className="py-4">
          <div className="mb-3 text-[10px] font-medium uppercase tracking-wider text-neutral-400">
            Pré-natal
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            <Field label="DUM" value={patient.gestante.dum} />
            <Field label="DPP" value={patient.gestante.dpp} />
            <Field label="IG" value={patient.gestante.ig} />
            <Field label="IG abertura" value={patient.gestante.igAbertura} />
            <Field label="Risco" value={patient.gestante.risco} />
            <Field label="Nº consultas" value={String(patient.gestante.numeroConsultas)} />
            <Field label="Próxima consulta" value={patient.gestante.dataProximaConsulta} />
            <Field label="PA" value={patient.gestante.pressaoArterial} mono />
          </div>
        </div>

        <div className="mt-3 border-b border-neutral-200">
          <SectionHeader
            color={HAS_ACCENT}
            icon={<Icon.HeartPulse />}
            title="HAS — Hipertensão"
            meta={`Última: ${patient.has.dataUltimaConsulta}`}
          />
        </div>
        <div className="py-4">
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            <Field label="Última consulta" value={patient.has.dataUltimaConsulta} />
            <Field label="Próxima consulta" value={patient.has.dataProximaConsulta} />
            <Field label="Última aferição PA" value={patient.has.dataUltimaAfericaoPa} />
            <Field label="PA" value={patient.has.pressaoArterial} mono />
          </div>
          <div className="mt-4">
            <div className="text-[10px] font-medium uppercase tracking-wider text-neutral-400">
              Notas clínicas
            </div>
            <div className="mt-1 text-sm text-neutral-800">{patient.has.notas}</div>
          </div>
          <div className="mt-3">
            <div className="text-[10px] font-medium uppercase tracking-wider text-neutral-400">
              Encaminhamentos
            </div>
            <div className="mt-1 text-sm text-neutral-800">{patient.has.encaminhamentos}</div>
          </div>
        </div>

        <button className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-md py-2.5 text-sm font-medium text-neutral-500 hover:bg-neutral-50 hover:text-neutral-800">
          <Icon.Plus /> Adicionar condição
        </button>
      </div>

      <div className="mt-auto border-t border-neutral-200 bg-neutral-50 px-5 py-2 text-[11px] text-neutral-500">
        Atualizado {patient.updatedAt}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Variation 3 — Tabs across the top, Felt-inspired                          */
/* -------------------------------------------------------------------------- */

function VariationThree() {
  const [tab, setTab] = useState<"g" | "h">("g");
  const accent = tab === "g" ? GESTANTE_ACCENT : HAS_ACCENT;

  const tabs: Array<{
    id: "g" | "h";
    label: string;
    icon: React.ReactNode;
    color: string;
  }> = [
    { id: "g", label: "Gestante", icon: <Icon.Baby className="!h-3 !w-3" />, color: GESTANTE_ACCENT },
    { id: "h", label: "HAS", icon: <Icon.HeartPulse className="!h-3 !w-3" />, color: HAS_ACCENT },
  ];

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-white">
      <div className="p-5 pb-3">
        <IdentityBlock />
      </div>

      <div className="bg-neutral-50/50 px-5">
        <div className="flex gap-1">
          {tabs.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`relative flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm transition ${
                  active
                    ? "font-medium text-neutral-900"
                    : "border-transparent text-neutral-500 hover:text-neutral-800"
                }`}
                style={active ? { borderBottomColor: t.color } : undefined}
              >
                <span
                  className="flex h-5 w-5 items-center justify-center rounded text-white"
                  style={{ backgroundColor: t.color }}
                >
                  {t.icon}
                </span>
                {t.label}
                <span
                  className="ml-1 h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: "oklch(58% 0.19 25)" }}
                  aria-hidden
                />
              </button>
            );
          })}

          <button className="ml-auto flex items-center gap-1 px-2 py-2 text-xs font-medium text-neutral-500 hover:text-neutral-800">
            <Icon.Plus /> Adicionar
          </button>
        </div>
      </div>
      <div className="h-px" style={{ backgroundColor: accent }} />

      <div className="flex-1 p-5">
        {tab === "g" && (
          <div>
            <div className="mb-3 flex items-center justify-between">
              <div className="text-[11px] font-medium uppercase tracking-wider text-neutral-500">
                Pré-natal
              </div>
              <span className="text-xs text-neutral-500">
                {patient.gestante.ig} · risco {patient.gestante.risco}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              <Field label="DUM" value={patient.gestante.dum} />
              <Field label="DPP (calculado)" value={patient.gestante.dpp} />
              <Field label="IG (calculado)" value={patient.gestante.ig} />
              <Field label="IG abertura" value={patient.gestante.igAbertura} />
              <Field label="Risco" value={patient.gestante.risco} />
              <Field label="Nº consultas" value={String(patient.gestante.numeroConsultas)} />
              <Field label="Próxima consulta" value={patient.gestante.dataProximaConsulta} />
              <Field label="PA" value={patient.gestante.pressaoArterial} mono />
              <Field label="Vacina dTpa" value={patient.gestante.vacinaDtpa} />
            </div>
            <button className="mt-4 text-xs font-medium text-neutral-500 hover:text-neutral-800">
              Mostrar campos avançados →
            </button>
          </div>
        )}

        {tab === "h" && (
          <div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              <Field label="Última consulta" value={patient.has.dataUltimaConsulta} />
              <Field label="Próxima consulta" value={patient.has.dataProximaConsulta} />
              <Field label="Última aferição PA" value={patient.has.dataUltimaAfericaoPa} />
              <Field label="PA" value={patient.has.pressaoArterial} mono />
            </div>
            <div className="mt-4">
              <div className="text-[11px] font-medium uppercase tracking-wider text-neutral-500">
                Notas clínicas
              </div>
              <div className="mt-1 text-sm text-neutral-800">{patient.has.notas}</div>
            </div>
            <div className="mt-3">
              <div className="text-[11px] font-medium uppercase tracking-wider text-neutral-500">
                Encaminhamentos
              </div>
              <div className="mt-1 text-sm text-neutral-800">{patient.has.encaminhamentos}</div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-auto border-t border-neutral-200 bg-neutral-50 px-5 py-2 text-[11px] text-neutral-500">
        Atualizado {patient.updatedAt}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Tokens strip (quiet header)                                               */
/* -------------------------------------------------------------------------- */

function TokensStrip() {
  const swatches: Array<[string, string]> = [
    ["Brand teal", "oklch(58% 0.10 195)"],
    ["Rose (Gestante)", GESTANTE_ACCENT],
    ["Terracotta (TB)", "oklch(60% 0.09 40)"],
    ["Indigo (HAS)", HAS_ACCENT],
    ["Alert red", "oklch(58% 0.19 25)"],
    ["Alert amber", "oklch(75% 0.14 75)"],
    ["OK green", "oklch(65% 0.14 155)"],
  ];
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-neutral-200 bg-neutral-50/70 px-6 py-2.5 text-xs text-neutral-600">
      <div className="flex items-center gap-1.5">
        <span className="font-medium text-neutral-800">Tokens:</span>
      </div>
      {swatches.map(([label, color]) => (
        <div key={label} className="flex items-center gap-1.5">
          <span
            className="inline-block h-3 w-3 rounded-sm ring-1 ring-black/5"
            style={{ backgroundColor: color }}
          />
          <span>{label}</span>
        </div>
      ))}
      <div className="ml-auto text-neutral-500">
        Geist Sans · 14/12/16 · 4px rhythm · radii 4/6/10
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

export default function PanelProtoPage() {
  return (
    <div className="min-h-screen bg-[oklch(98.5%_0.005_90)] text-neutral-900">
      <header className="border-b border-neutral-200 bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
              Sketch
            </div>
            <h1 className="text-lg font-semibold text-neutral-900">
              Painel do paciente — variações
            </h1>
          </div>
          <Link href="/proto" className="text-xs text-neutral-500 hover:text-neutral-800">
            ← proto index
          </Link>
        </div>
      </header>

      <TokensStrip />

      <div className="mx-auto max-w-[1500px] p-6">
        <p className="mb-5 max-w-3xl text-sm text-neutral-600">
          Três variações do painel do paciente com a{" "}
          <em>mesma</em> pessoa —{" "}
          <span className="font-medium text-neutral-900">Maria Aparecida Silva</span>, gestante de
          alto risco com HAS. Clique nos elementos para ver estados interativos (accordion, tabs).
          Cada variação tem largura de 420&nbsp;px para simular o painel real.
        </p>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {[
            { title: "V1 — Cartões accordion", subtitle: "Notion · seções expansíveis, acento colorido lateral", node: <VariationOne /> },
            { title: "V2 — Editorial", subtitle: "Datawrapper · seções planas, sem cartões, densa", node: <VariationTwo /> },
            { title: "V3 — Abas por condição", subtitle: "Felt · uma aba por condição, foco no atual", node: <VariationThree /> },
          ].map((v, i) => (
            <div key={i} className="flex flex-col">
              <div className="mb-2">
                <div className="text-sm font-semibold text-neutral-900">{v.title}</div>
                <div className="text-xs text-neutral-500">{v.subtitle}</div>
              </div>
              <div
                className="mx-auto w-full max-w-[420px] overflow-hidden rounded-[10px] border border-neutral-200 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.03)]"
                style={{ height: "820px" }}
              >
                {v.node}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
