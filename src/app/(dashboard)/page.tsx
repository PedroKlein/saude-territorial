import Link from "next/link";
import {
  Activity,
  ArrowRight,
  CalendarCheck2,
  Clock3,
  MapPinned,
  Route,
  TriangleAlert,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react";

import { AddPatientButton } from "@/components/panels/AddPatientButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const metrics: {
  label: string;
  value: string;
  note: string;
  icon: LucideIcon;
  iconClassName: string;
  badge?: string;
  alertLink?: boolean;
}[] = [
  {
    label: "Pacientes ativos",
    value: "248",
    note: "Acompanhamentos em andamento",
    icon: Users,
    iconClassName: "bg-brand/10 text-brand",
    badge: "+12",
  },
  {
    label: "Alertas críticos",
    value: "7",
    note: "Exigem acompanhamento",
    icon: TriangleAlert,
    iconClassName: "bg-alert-red/10 text-alert-red",
    alertLink: true,
  },
  {
    label: "Sem atualização",
    value: "23",
    note: "Há mais de 30 dias",
    icon: Clock3,
    iconClassName: "bg-alert-amber/15 text-alert-amber",
  },
  {
    label: "Consultas esta semana",
    value: "18",
    note: "Agendadas pela equipe",
    icon: CalendarCheck2,
    iconClassName: "bg-ok-green/10 text-ok-green",
  },
];

const chartValues = [15, 22, 18, 31, 26, 38, 34, 49, 43, 58, 52, 64];
const chartPoints = chartValues
  .map((value, index) => `${(index / (chartValues.length - 1)) * 720},${120 - value * 1.55}`)
  .join(" ");

function MetricCard({
  label,
  value,
  note,
  icon: Icon,
  iconClassName,
  badge,
  alertLink,
}: (typeof metrics)[number]) {
  return (
    <article className="rounded-lg border bg-card p-5 shadow-xs">
      <div className="flex items-start justify-between gap-4">
        <div className={`flex size-10 shrink-0 items-center justify-center rounded-full ${iconClassName}`}>
          <Icon className="size-5" aria-hidden="true" />
        </div>
        {badge ? (
          <Badge className="bg-ok-green/10 text-ok-green" variant="secondary">
            {badge}
          </Badge>
        ) : null}
      </div>
      <p className="mt-5 text-sm font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-3xl font-semibold tracking-tight text-foreground">{value}</p>
      <div className="mt-2 flex min-h-5 items-center justify-between gap-3 text-xs text-muted-foreground">
        <span>{note}</span>
        {alertLink ? (
          <Link
            href="/map"
            className="inline-flex shrink-0 items-center gap-1 font-medium text-alert-red hover:underline"
          >
            Ver alertas
            <ArrowRight className="size-3" aria-hidden="true" />
          </Link>
        ) : null}
      </div>
    </article>
  );
}

function ActionPreview({
  icon: Icon,
  label,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  tone: string;
}) {
  return (
    <div className={`flex h-28 items-center justify-center border border-dashed ${tone}`}>
      <div className="flex items-center gap-2 text-sm font-medium">
        <Icon className="size-5" aria-hidden="true" />
        <span>{label}</span>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto flex min-h-full w-full max-w-7xl flex-col px-4 sm:px-6">
        <div className="flex-1 py-8 sm:py-10">
          <section className="grid gap-8 border-b pb-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
            <div className="max-w-2xl">
              <Badge variant="outline" className="border-brand/25 bg-brand/5 text-brand">
                Visão geral da unidade
              </Badge>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                Bom dia, Equipe Moab Caldas
              </h1>
              <p className="mt-3 max-w-xl text-base leading-7 text-muted-foreground">
                Acompanhe os alertas prioritários, atualize cadastros e organize as visitas da equipe.
              </p>
              <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">Terça-feira, 14 de maio</span>
                <span>09:42</span>
                <span>Última atualização: agora</span>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex h-32 items-center justify-center border border-dashed border-brand/30 bg-brand/5 text-brand">
                <div className="text-center">
                  <MapPinned className="mx-auto size-7" aria-hidden="true" />
                  <p className="mt-2 text-sm font-medium">Mapa territorial</p>
                </div>
              </div>
              <div className="flex h-32 items-center justify-center border border-dashed border-border bg-muted/40 text-muted-foreground">
                <div className="text-center">
                  <Route className="mx-auto size-7" aria-hidden="true" />
                  <p className="mt-2 text-sm font-medium">Rota planejada</p>
                </div>
              </div>
            </div>
          </section>

          <section aria-labelledby="summary-heading" className="py-8">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">
                  Resumo
                </p>
                <h2 id="summary-heading" className="mt-1 text-xl font-semibold text-foreground">
                  Situação da unidade
                </h2>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {metrics.map((metric) => (
                <MetricCard key={metric.label} {...metric} />
              ))}
            </div>
          </section>

          <section aria-labelledby="activity-heading" className="rounded-lg border bg-card p-5 shadow-xs sm:p-6">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Activity className="size-5 text-brand" aria-hidden="true" />
                  <h2 id="activity-heading" className="text-lg font-semibold text-foreground">
                    Atividades hoje
                  </h2>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Registros realizados pela equipe entre 8h e 19h.
                </p>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="size-2 rounded-full bg-brand" aria-hidden="true" />
                Registros
              </div>
            </div>

            <div className="mt-6 overflow-hidden" role="img" aria-label="Atividades entre 8h e 19h, com tendência de crescimento ao longo do dia">
              <svg viewBox="0 0 720 130" className="h-36 w-full" preserveAspectRatio="none" aria-hidden="true">
                {[20, 50, 80, 110].map((y) => (
                  <line
                    key={y}
                    x1="0"
                    x2="720"
                    y1={y}
                    y2={y}
                    stroke="currentColor"
                    className="text-border"
                    strokeWidth="1"
                  />
                ))}
                <polyline
                  points={chartPoints}
                  fill="none"
                  stroke="currentColor"
                  className="text-brand"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="4"
                  vectorEffect="non-scaling-stroke"
                />
                {chartValues.map((value, index) => (
                  <circle
                    key={`${index}-${value}`}
                    cx={(index / (chartValues.length - 1)) * 720}
                    cy={120 - value * 1.55}
                    r="4"
                    fill="currentColor"
                    className="text-brand"
                    vectorEffect="non-scaling-stroke"
                  />
                ))}
              </svg>
              <div className="mt-2 grid grid-cols-12 text-center text-xs text-muted-foreground">
                {Array.from({ length: 12 }, (_, index) => (
                  <span key={index}>{index + 8}h</span>
                ))}
              </div>
            </div>
          </section>

          <section aria-labelledby="actions-heading" className="py-8">
            <div className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">
                Acesso rápido
              </p>
              <h2 id="actions-heading" className="mt-1 text-xl font-semibold text-foreground">
                Ações frequentes
              </h2>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <article className="border bg-card p-4 shadow-xs">
                <ActionPreview
                  icon={UserPlus}
                  label="Novo cadastro"
                  tone="border-brand/30 bg-brand/5 text-brand"
                />
                <div className="pt-4">
                  <AddPatientButton className="h-9 w-full" label="Cadastrar pessoa" />
                </div>
              </article>

              <article className="border bg-card p-4 shadow-xs">
                <ActionPreview
                  icon={MapPinned}
                  label="Território e pacientes"
                  tone="border-gestante/40 bg-gestante/10 text-gestante"
                />
                <div className="pt-4">
                  <Button asChild className="h-9 w-full">
                    <Link href="/map">
                      <MapPinned data-icon="inline-start" />
                      Abrir mapa
                    </Link>
                  </Button>
                </div>
              </article>

              <article className="border bg-card p-4 shadow-xs">
                <ActionPreview
                  icon={Route}
                  label="Organizar visitas"
                  tone="border-hipertensao/35 bg-hipertensao/10 text-hipertensao"
                />
                <div className="pt-4">
                  <Button asChild className="h-9 w-full">
                    <Link href="/map">
                      <Route data-icon="inline-start" />
                      Planejar rota
                    </Link>
                  </Button>
                </div>
              </article>
            </div>
          </section>

          <section aria-labelledby="notices-heading" className="pb-10">
            <h2 id="notices-heading" className="mb-4 text-xl font-semibold text-foreground">
              Avisos prioritários
            </h2>
            <div className="border border-alert-red/25 border-l-4 border-l-alert-red bg-alert-red/5 p-5">
              <div className="flex items-start gap-3">
                <span className="mt-1.5 size-2.5 shrink-0 rounded-full bg-alert-red" aria-hidden="true" />
                <div>
                  <p className="font-semibold text-alert-red">
                    2 pacientes com alertas críticos ainda não visualizados
                  </p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    Revise os alertas antes de organizar as próximas visitas da equipe.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>

        <footer className="flex flex-col gap-2 border-t bg-card/60 py-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>Dados sintéticos</span>
          <span>Fonte: sistema local</span>
          <span>Versão de demonstração</span>
        </footer>
      </div>
    </div>
  );
}
