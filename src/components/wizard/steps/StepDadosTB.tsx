"use client";

/**
 * StepDadosTB — tuberculose-specific data page in the wizard.
 *
 * Parity with the PET reference workbook (tab 06_Tuberculose):
 *  1. Registro do Caso (Tipo: Caso Fonte / Contato, GAL: Não / Sim)
 *  2. Amostras (1ª e 2ª amostras com datas distintas)
 *  3. Exames Diagnósticos (Baciloscopia 1ª e 2ª, TRM data/resultado, Cultura, PPD, RX, Histo)
 *  4. Tratamento (Forma clínica, Tipo de entrada, Esquema, Início, Forma de tratamento, TDO)
 *  5. Consultas de Acompanhamento (1º ao 9º mês: Realizada ou Não Realizada)
 *  6. Situação de Encerramento (Motivo e Data)
 *  7. Contatos (Lista dinâmica de contatos, verificação de 1ª amostra e coabitação)
 *
 * LGPD: no patient identifiers reach console.*.
 */

import { useState, useMemo, useCallback } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import {
  FileText,
  FlaskConical,
  Activity,
  Stethoscope,
  Calendar,
  Users,
  CheckCircle2,
  Plus,
  Trash2,
  Check,
  X,
} from "lucide-react";

import { usePatientData } from "@/hooks/usePatientData";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/panels/Field";
import { EnumField } from "@/components/panels/EnumField";
import { type ContactItem, parseContacts, TuberculosePatchSchema } from "@/lib/patients/schemas";
import {
  BACILOSCOPIA_RESULTADO_LABELS,
  BACILOSCOPIA_RESULTADO_VALUES,
  CULTURA_RESULTADO_LABELS,
  CULTURA_RESULTADO_VALUES,
  ENCERRAMENTO_MOTIVO_TB_LABELS,
  ENCERRAMENTO_MOTIVO_TB_VALUES,
  GAL_TB_LABELS,
  GAL_TB_VALUES,
  RX_TORAX_TB_LABELS,
  RX_TORAX_TB_VALUES,
  TDO_STATUS_LABELS,
  TDO_STATUS_VALUES,
  TIPO_CASO_TB_LABELS,
  TIPO_CASO_TB_VALUES,
  TIPO_ENTRADA_TB_LABELS,
  TIPO_ENTRADA_TB_VALUES,
  TRM_RESULTADO_LABELS,
  TRM_RESULTADO_VALUES,
} from "@/lib/patients/enums";
import type { WizardStep } from "@/components/wizard/Wizard";
import type { PatientWizardCtx } from "@/components/wizard/PatientWizard";

// ---------------------------------------------------------------------------
// Schemas & Types
// ---------------------------------------------------------------------------

const StepSchema = z.object({
  tipo: z.string().optional(),
  galRegistro: z.string().optional(),
  dataPrimeiraAmostra: z.date().nullable().optional(),
  dataSegundaAmostra: z.date().nullable().optional(),
  baciloscopiaResultado: z.string().optional(),
  baciloscopiaSegundaResultado: z.string().optional(),
  trmData: z.date().nullable().optional(),
  trmResultado: z.string().optional(),
  culturaMTuberculosis: z.string().optional(),
  culturaOutros: z.string().optional(),
  ppdMm: z.number().int().min(0).max(30).nullable().optional(),
  histopatologia: z.string().optional(),
  rxTorax: z.string().optional(),
  outrosExames: z.string().optional(),
  formaClinica: z.string().optional(),
  tipoEntrada: z.string().optional(),
  esquema: z.string().optional(),
  dataInicio: z.date().nullable().optional(),
  formaTratamento: z.string().optional(),
  tdoStatus: z.string().optional(),
  encerramentoMotivo: z.string().optional(),
  encerramentoData: z.date().nullable().optional(),
});

type StepValues = z.infer<typeof StepSchema>;

export type { ContactItem };

export type ConsultaItemState = {
  mes: number;
  realizada: boolean;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toDateOrNull(iso?: unknown): Date | null {
  if (typeof iso !== "string" || !iso) return null;
  const d = new Date(iso.includes("/") ? iso.split("/").reverse().join("-") : iso);
  return isNaN(d.getTime()) ? null : d;
}

function fmtDate(d: Date | null | undefined): string {
  return d ? format(d, "dd/MM/yyyy") : "";
}

function emptyToNull(v: string | undefined): string | null {
  if (v === undefined || v === "") return null;
  return v;
}

function parseConsultas(raw: unknown): ConsultaItemState[] {
  if (Array.isArray(raw)) {
    return raw.map((c: Record<string, unknown>) => ({
      mes: Number(c.mes),
      realizada: Boolean(c.realizada),
    }));
  }
  return [];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

type Props = Parameters<WizardStep<PatientWizardCtx>["render"]>[0];

export function StepDadosTB({ ctx, setCtx, goNext }: Props) {
  const prev = ctx.tuberculose;

  const [serverIssues, setServerIssues] = useState<string[]>([]);
  const [contacts, setContacts] = useState<ContactItem[]>(() =>
    parseContacts(prev.contatosLista),
  );
  const [consultas, setConsultas] = useState<ConsultaItemState[]>(() =>
    parseConsultas(prev.consultas),
  );

  // New contact inputs (only CNS and coabita; nome and examinado are derived from DB)
  const [newCns, setNewCns] = useState("");
  const [newCoabita, setNewCoabita] = useState(true);
  const [contactError, setContactError] = useState<string | null>(null);

  // Database lookup for patient name and 1ª amostra status
  const { data: layerData } = usePatientData();

  const allPatients = useMemo(() => {
    if (!layerData) return [];
    const map = new Map<
      string,
      {
        cns: string;
        nomeCompleto: string | null;
        dataPrimeiraAmostra?: unknown;
        baciloscopiaPrimeiraData?: unknown;
      }
    >();
    Object.values(layerData).forEach((list) => {
      list.forEach((p) => {
        if (p.cns) {
          map.set(p.cns, p);
        }
      });
    });
    return Array.from(map.values());
  }, [layerData]);

  const isExaminado = useCallback(
    (cns: string) => {
      const p = allPatients.find((pt) => pt.cns === cns);
      return Boolean(p?.dataPrimeiraAmostra ?? p?.baciloscopiaPrimeiraData);
    },
    [allPatients],
  );

  const getContactName = useCallback(
    (cns: string) => {
      const p = allPatients.find((pt) => pt.cns === cns);
      return p?.nomeCompleto ?? null;
    },
    [allPatients],
  );

  const {
    handleSubmit,
    control,
    register,
    formState: { errors },
  } = useForm<StepValues>({
    resolver: zodResolver(StepSchema),
    defaultValues: {
      tipo: (prev.tipo as string | undefined) ?? "",
      galRegistro: (prev.galRegistro as string | undefined) ?? "",
      dataPrimeiraAmostra: toDateOrNull(
        prev.dataPrimeiraAmostra ?? prev.baciloscopiaPrimeiraData,
      ),
      dataSegundaAmostra: toDateOrNull(
        prev.dataSegundaAmostra ?? prev.baciloscopiaSegundaData,
      ),
      baciloscopiaResultado:
        (prev.baciloscopiaResultado as string | undefined) ?? "",
      baciloscopiaSegundaResultado:
        (prev.baciloscopiaSegundaResultado as string | undefined) ?? "",
      trmData: toDateOrNull(prev.trmData ?? prev.trmPrimeiraData),
      trmResultado: (prev.trmResultado as string | undefined) ?? "",
      culturaMTuberculosis:
        (prev.culturaMTuberculosis as string | undefined) ?? "",
      culturaOutros: (prev.culturaOutros as string | undefined) ?? "",
      formaClinica: (prev.formaClinica as string | undefined) ?? "",
      tipoEntrada: (prev.tipoEntrada as string | undefined) ?? "",
      esquema: (prev.esquema as string | undefined) ?? "",
      dataInicio: toDateOrNull(prev.dataInicio),
      formaTratamento: (prev.formaTratamento as string | undefined) ?? "",
      tdoStatus: (prev.tdoStatus as string | undefined) ?? "",
      encerramentoMotivo: (prev.encerramentoMotivo as string | undefined) ?? "",
      encerramentoData: toDateOrNull(prev.encerramentoData),
      ppdMm: prev.ppdMm != null ? Number(prev.ppdMm) : null,
      histopatologia: (prev.histopatologia as string | undefined) ?? "",
      rxTorax: (prev.rxTorax as string | undefined) ?? "",
      outrosExames: (prev.outrosExames as string | undefined) ?? "",
    },
  });

  // Dynamic derivation of contacts (0/0 counts as all examined)
  const coabitantes = contacts.filter((c) => c.coabita);
  const coabitantesCount = coabitantes.length;
  const examinadosCount = contacts.filter((c) => isExaminado(c.cns)).length;
  const todosExaminados =
    coabitantesCount === 0 ||
    coabitantes.every((c) => isExaminado(c.cns));

  // Contact list operations
  const handleAddContact = () => {
    const trimmedCns = newCns.trim();
    if (!trimmedCns) {
      setContactError("Informe o CNS do contato.");
      return;
    }
    if (contacts.some((c) => c.cns === trimmedCns)) {
      setContactError("Este CNS já foi adicionado aos contatos.");
      return;
    }
    setContactError(null);
    setContacts((prevList) => [
      ...prevList,
      {
        cns: trimmedCns,
        coabita: newCoabita,
      },
    ]);
    setNewCns("");
    setNewCoabita(true);
  };

  const handleRemoveContact = (cns: string) => {
    setContacts((prevList) => prevList.filter((c) => c.cns !== cns));
  };

  const handleToggleCoabita = (cns: string) => {
    setContacts((prevList) =>
      prevList.map((c) =>
        c.cns === cns ? { ...c, coabita: !c.coabita } : c,
      ),
    );
  };

  // Follow-up consultations: cycle Unset -> Realizada (green) -> Não Realizada (red) -> Unset
  const cycleConsulta = (mes: number) => {
    setConsultas((prevList) => {
      const existing = prevList.find((c) => c.mes === mes);
      if (!existing) {
        return [...prevList, { mes, realizada: true }];
      }
      if (existing.realizada) {
        return prevList.map((c) =>
          c.mes === mes ? { ...c, realizada: false } : c,
        );
      }
      return prevList.filter((c) => c.mes !== mes);
    });
  };

  // Submission handler
  const onSubmit = handleSubmit((values) => {
    const raw: Record<string, unknown> = {
      tipo: emptyToNull(values.tipo),
      galRegistro: emptyToNull(values.galRegistro),
      dataPrimeiraAmostra: fmtDate(values.dataPrimeiraAmostra) || null,
      dataSegundaAmostra: fmtDate(values.dataSegundaAmostra) || null,
      baciloscopiaPrimeiraData: fmtDate(values.dataPrimeiraAmostra) || null,
      baciloscopiaSegundaData: fmtDate(values.dataSegundaAmostra) || null,
      baciloscopiaResultado: emptyToNull(values.baciloscopiaResultado),
      baciloscopiaSegundaResultado: emptyToNull(
        values.baciloscopiaSegundaResultado,
      ),
      trmData: fmtDate(values.trmData) || null,
      trmPrimeiraData: fmtDate(values.trmData) || null,
      trmResultado: emptyToNull(values.trmResultado),
      culturaMTuberculosis: emptyToNull(values.culturaMTuberculosis),
      culturaOutros: emptyToNull(values.culturaOutros),
      formaClinica: emptyToNull(values.formaClinica),
      tipoEntrada: emptyToNull(values.tipoEntrada),
      esquema: emptyToNull(values.esquema),
      dataInicio: fmtDate(values.dataInicio) || null,
      formaTratamento: emptyToNull(values.formaTratamento),
      tdoStatus: values.tdoStatus ?? null,
      encerramentoMotivo: emptyToNull(values.encerramentoMotivo),
      encerramentoData: fmtDate(values.encerramentoData) || null,
      ppdMm: values.ppdMm ?? null,
      histopatologia: emptyToNull(values.histopatologia),
      rxTorax: emptyToNull(values.rxTorax),
      outrosExames: emptyToNull(values.outrosExames),
      contatosCoabitantes: coabitantesCount,
      contatosExaminados: examinadosCount,
      todosContatosExaminados: todosExaminados,
      contatosLista:
        contacts.length > 0
          ? JSON.stringify(
              contacts.map((c) => ({
                cns: c.cns,
                coabita: c.coabita,
              })),
            )
          : prev.contatosLista ?? null,
      consultas: consultas.map((c) => ({
        mes: c.mes,
        realizada: c.realizada,
      })),
    };

    const parsed = TuberculosePatchSchema.safeParse(raw);
    if (!parsed.success) {
      setServerIssues(parsed.error.issues.map((i) => i.message));
      return;
    }
    setServerIssues([]);
    setCtx({ tuberculose: parsed.data });
    goNext();
  });

  return (
    <form
      id="wizard-step-form"
      onSubmit={(e) => {
        void onSubmit(e);
      }}
      className="space-y-4"
    >
      {serverIssues.length > 0 && (
        <div
          role="alert"
          className="rounded-md border border-alert-red/40 bg-alert-red/10 px-3 py-2 text-xs whitespace-pre-line text-red-900"
        >
          {serverIssues.map((m) => `• ${m}`).join("\n")}
        </div>
      )}

      {/* 1. Registro do Caso */}
      <section className="rounded-xl border border-neutral-200/80 bg-white p-3.5 shadow-xs space-y-3">
        <div className="flex items-center gap-2 border-b border-neutral-100 pb-2 text-xs font-semibold uppercase tracking-wider text-neutral-700">
          <FileText className="size-4 text-brand" />
          <span>1. Registro do Caso</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Tipo de caso"
            error={errors.tipo?.message}
            className="col-span-1"
          >
            <Controller
              control={control}
              name="tipo"
              render={({ field }) => (
                <EnumField
                  values={TIPO_CASO_TB_VALUES}
                  labels={TIPO_CASO_TB_LABELS}
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  ariaLabel="Tipo de caso de TB"
                />
              )}
            />
          </Field>
          <Field label="GAL (Sistema GAL)" className="col-span-1">
            <Controller
              control={control}
              name="galRegistro"
              render={({ field }) => (
                <EnumField
                  values={GAL_TB_VALUES}
                  labels={GAL_TB_LABELS}
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  ariaLabel="Registro no sistema GAL"
                />
              )}
            />
          </Field>
        </div>
      </section>

      {/* 2. Amostras */}
      <section className="rounded-xl border border-neutral-200/80 bg-white p-3.5 shadow-xs space-y-3">
        <div className="flex items-center gap-2 border-b border-neutral-100 pb-2 text-xs font-semibold uppercase tracking-wider text-neutral-700">
          <FlaskConical className="size-4 text-brand" />
          <span>2. Amostras</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Data da 1ª amostra"
            error={errors.dataPrimeiraAmostra?.message}
          >
            <Controller
              control={control}
              name="dataPrimeiraAmostra"
              render={({ field }) => (
                <DatePicker
                  value={field.value ?? null}
                  onChange={field.onChange}
                  max={new Date()}
                  ariaLabel="Data da 1ª amostra"
                />
              )}
            />
          </Field>
          <Field
            label="Data da 2ª amostra"
            error={errors.dataSegundaAmostra?.message}
          >
            <Controller
              control={control}
              name="dataSegundaAmostra"
              render={({ field }) => (
                <DatePicker
                  value={field.value ?? null}
                  onChange={field.onChange}
                  max={new Date()}
                  ariaLabel="Data da 2ª amostra"
                />
              )}
            />
          </Field>
        </div>
      </section>

      {/* 3. Exames Diagnósticos */}
      <section className="rounded-xl border border-neutral-200/80 bg-white p-3.5 shadow-xs space-y-3">
        <div className="flex items-center gap-2 border-b border-neutral-100 pb-2 text-xs font-semibold uppercase tracking-wider text-neutral-700">
          <Activity className="size-4 text-brand" />
          <span>3. Exames Diagnósticos</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Baciloscopia (1ª amostra)"
            className="col-span-1"
            error={errors.baciloscopiaResultado?.message}
          >
            <Controller
              control={control}
              name="baciloscopiaResultado"
              render={({ field }) => (
                <EnumField
                  values={BACILOSCOPIA_RESULTADO_VALUES}
                  labels={BACILOSCOPIA_RESULTADO_LABELS}
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  ariaLabel="Resultado da 1ª baciloscopia"
                />
              )}
            />
          </Field>
          <Field
            label="Baciloscopia (2ª amostra)"
            className="col-span-1"
            error={errors.baciloscopiaSegundaResultado?.message}
          >
            <Controller
              control={control}
              name="baciloscopiaSegundaResultado"
              render={({ field }) => (
                <EnumField
                  values={BACILOSCOPIA_RESULTADO_VALUES}
                  labels={BACILOSCOPIA_RESULTADO_LABELS}
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  ariaLabel="Resultado da 2ª baciloscopia"
                />
              )}
            />
          </Field>

          <Field label="Data do TRM" className="col-span-1">
            <Controller
              control={control}
              name="trmData"
              render={({ field }) => (
                <DatePicker
                  value={field.value ?? null}
                  onChange={field.onChange}
                  max={new Date()}
                  ariaLabel="Data do TRM"
                />
              )}
            />
          </Field>
          <Field
            label="Resultado do TRM"
            className="col-span-1"
            error={errors.trmResultado?.message}
          >
            <Controller
              control={control}
              name="trmResultado"
              render={({ field }) => (
                <EnumField
                  values={TRM_RESULTADO_VALUES}
                  labels={TRM_RESULTADO_LABELS}
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  ariaLabel="Resultado do TRM"
                />
              )}
            />
          </Field>

          <Field
            label="Cultura M. tuberculosis"
            className="col-span-1"
            error={errors.culturaMTuberculosis?.message}
          >
            <Controller
              control={control}
              name="culturaMTuberculosis"
              render={({ field }) => (
                <EnumField
                  values={CULTURA_RESULTADO_VALUES}
                  labels={CULTURA_RESULTADO_LABELS}
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  ariaLabel="Cultura M. tuberculosis"
                />
              )}
            />
          </Field>
          <Field label="Cultura (outros)" className="col-span-1">
            <Input
              {...register("culturaOutros")}
              placeholder="Outras culturas ou notas"
              aria-label="Cultura outros"
            />
          </Field>

          <Field
            label="PPD (mm)"
            className="col-span-1"
            error={errors.ppdMm?.message}
          >
            <Controller
              control={control}
              name="ppdMm"
              render={({ field }) => (
                <Input
                  type="number"
                  min={0}
                  max={30}
                  value={field.value ?? ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    field.onChange(val === "" ? null : Number(val));
                  }}
                  placeholder="0 a 30"
                  aria-label="PPD em milímetros"
                />
              )}
            />
          </Field>
          <Field label="RX Tórax" className="col-span-1">
            <Controller
              control={control}
              name="rxTorax"
              render={({ field }) => (
                <EnumField
                  values={RX_TORAX_TB_VALUES}
                  labels={RX_TORAX_TB_LABELS}
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  ariaLabel="RX Tórax"
                />
              )}
            />
          </Field>

          <Field label="Histopatologia" className="col-span-1">
            <Input
              {...register("histopatologia")}
              placeholder="Laudo histopatológico"
              aria-label="Histopatologia"
            />
          </Field>
          <Field label="Outros exames" className="col-span-1">
            <Input
              {...register("outrosExames")}
              placeholder="Outros exames realizados"
              aria-label="Outros exames"
            />
          </Field>
        </div>
      </section>

      {/* 4. Tratamento */}
      <section className="rounded-xl border border-neutral-200/80 bg-white p-3.5 shadow-xs space-y-3">
        <div className="flex items-center gap-2 border-b border-neutral-100 pb-2 text-xs font-semibold uppercase tracking-wider text-neutral-700">
          <Stethoscope className="size-4 text-brand" />
          <span>4. Tratamento</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Forma clínica" className="col-span-1">
            <Input
              {...register("formaClinica")}
              placeholder="Ex: Pulmonar, Pleural..."
              aria-label="Forma clínica"
            />
          </Field>
          <Field
            label="Tipo de entrada"
            className="col-span-1"
            error={errors.tipoEntrada?.message}
          >
            <Controller
              control={control}
              name="tipoEntrada"
              render={({ field }) => (
                <EnumField
                  values={TIPO_ENTRADA_TB_VALUES}
                  labels={TIPO_ENTRADA_TB_LABELS}
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  ariaLabel="Tipo de entrada"
                />
              )}
            />
          </Field>

          <Field label="Esquema" className="col-span-1">
            <Input
              {...register("esquema")}
              placeholder="Ex: RHZE (2 meses) + RH (4 meses)"
              aria-label="Esquema de tratamento"
            />
          </Field>
          <Field label="Data início tratamento" className="col-span-1">
            <Controller
              control={control}
              name="dataInicio"
              render={({ field }) => (
                <DatePicker
                  value={field.value ?? null}
                  onChange={field.onChange}
                  max={new Date()}
                  ariaLabel="Data de início do tratamento"
                />
              )}
            />
          </Field>

          <Field label="Forma de tratamento" className="col-span-1">
            <Input
              {...register("formaTratamento")}
              placeholder="Ex: Autoadministrado, Supervisionado..."
              aria-label="Forma de tratamento"
            />
          </Field>
          <Field
            label="Status do TDO"
            className="col-span-1"
            error={errors.tdoStatus?.message}
          >
            <Controller
              control={control}
              name="tdoStatus"
              render={({ field }) => (
                <EnumField
                  values={TDO_STATUS_VALUES}
                  labels={TDO_STATUS_LABELS}
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  ariaLabel="Status do TDO"
                />
              )}
            />
          </Field>
        </div>
      </section>

      {/* 5. Consultas de Acompanhamento (1º ao 9º mês) */}
      <section className="rounded-xl border border-neutral-200/80 bg-white p-3.5 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-neutral-700">
            <Calendar className="size-4 text-brand" />
            <span>5. Consultas de Acompanhamento</span>
          </div>
          <span className="text-[11px] font-medium text-neutral-500">
            {consultas.filter((c) => c.realizada).length} realizadas
          </span>
        </div>

        <p className="text-xs text-neutral-500">
          Clique no mês para alternar: 🟢 ✓ (Realizada) ➔ 🔴 ✗ (Não realizada) ➔ — (Desmarcar)
        </p>

        {/* 9x1 follow-up grid */}
        <div className="grid grid-cols-9 gap-1 sm:gap-1.5">
          {Array.from({ length: 9 }, (_, i) => i + 1).map((mes) => {
            const item = consultas.find((c) => c.mes === mes);
            const isRealizada = item?.realizada === true;
            const isNaoRealizada = item?.realizada === false;

            return (
              <button
                key={mes}
                type="button"
                onClick={() => {
                  cycleConsulta(mes);
                }}
                title={`${mes}º Mês: clique para alternar (verde ➔ vermelho ➔ desmarcar)`}
                aria-label={`${mes}º Mês ${isRealizada ? "realizada" : isNaoRealizada ? "não realizada" : "não informada"}`}
                className={`flex flex-col items-center justify-center rounded-lg border py-2 px-0.5 transition-all select-none ${
                  isRealizada
                    ? "bg-emerald-600 border-emerald-600 text-white shadow-xs font-semibold"
                    : isNaoRealizada
                      ? "bg-rose-600 border-rose-600 text-white shadow-xs font-semibold"
                      : "bg-neutral-50 border-neutral-200 text-neutral-600 hover:bg-neutral-100 hover:border-neutral-300 font-medium"
                }`}
              >
                <span className="text-[11px] sm:text-xs leading-none">{mes}º</span>
                <span className="mt-1 flex h-3.5 items-center justify-center">
                  {isRealizada ? (
                    <Check className="size-3.5 stroke-[2.5]" />
                  ) : isNaoRealizada ? (
                    <X className="size-3.5 stroke-[2.5]" />
                  ) : (
                    <span className="text-[10px] opacity-60 leading-none">—</span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* 6. Situação de Encerramento */}
      <section className="rounded-xl border border-neutral-200/80 bg-white p-3.5 shadow-xs space-y-3">
        <div className="flex items-center gap-2 border-b border-neutral-100 pb-2 text-xs font-semibold uppercase tracking-wider text-neutral-700">
          <CheckCircle2 className="size-4 text-brand" />
          <span>6. Situação de Encerramento</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Motivo de encerramento"
            className="col-span-1"
            error={errors.encerramentoMotivo?.message}
          >
            <Controller
              control={control}
              name="encerramentoMotivo"
              render={({ field }) => (
                <EnumField
                  values={ENCERRAMENTO_MOTIVO_TB_VALUES}
                  labels={ENCERRAMENTO_MOTIVO_TB_LABELS}
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  ariaLabel="Motivo de encerramento"
                />
              )}
            />
          </Field>
          <Field
            label="Data de encerramento"
            className="col-span-1"
            error={errors.encerramentoData?.message}
          >
            <Controller
              control={control}
              name="encerramentoData"
              render={({ field }) => (
                <DatePicker
                  value={field.value ?? null}
                  onChange={field.onChange}
                  max={new Date()}
                  ariaLabel="Data de encerramento"
                />
              )}
            />
          </Field>
        </div>
      </section>

      {/* 7. Contatos */}
      <section className="rounded-xl border border-neutral-200/80 bg-white p-3.5 shadow-xs space-y-3">
        <div className="flex items-center gap-2 border-b border-neutral-100 pb-2 text-xs font-semibold uppercase tracking-wider text-neutral-700">
          <Users className="size-4 text-brand" />
          <span>Contatos</span>
        </div>

        {/* Clean stacked form for adding contacts */}
        <div className="space-y-2.5 rounded-lg bg-neutral-50/80 p-3 border border-neutral-200/70">
          <div className="text-xs font-semibold text-neutral-700">
            Adicionar Contato
          </div>
          <div className="space-y-2">
            <div>
              <label className="text-[11px] font-medium text-neutral-600 block mb-1">
                CNS do contato *
              </label>
              <Input
                value={newCns}
                onChange={(e) => {
                  setNewCns(e.target.value);
                }}
                placeholder="Ex: 898001147585001"
                aria-label="CNS do contato"
                className="h-8 text-xs bg-white"
              />
            </div>

            <div className="pt-0.5">
              <label className="flex items-center gap-2 text-xs text-neutral-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={newCoabita}
                  onChange={(e) => {
                    setNewCoabita(e.target.checked);
                  }}
                  className="rounded border-neutral-300 text-brand focus:ring-brand size-4"
                />
                <span>Mora junto (coabitante)</span>
              </label>
            </div>

            <Button
              type="button"
              size="sm"
              onClick={handleAddContact}
              className="w-full h-8 text-xs gap-1.5 mt-1"
            >
              <Plus className="size-3.5" />
              Adicionar contato
            </Button>
          </div>

          {contactError && (
            <p className="text-xs text-alert-red font-medium mt-1">
              {contactError}
            </p>
          )}
        </div>

        {/* Contacts list */}
        {contacts.length > 0 ? (
          <div className="space-y-1.5">
            {contacts.map((c) => {
              const name = getContactName(c.cns);
              const examinado = isExaminado(c.cns);

              return (
                <div
                  key={c.cns}
                  className="flex items-center justify-between rounded-lg border border-neutral-200/80 bg-white p-2.5 text-xs shadow-2xs"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold text-neutral-900">
                        {c.cns}
                      </span>
                      {name && (
                        <span className="text-neutral-600 truncate font-medium">
                          ({name})
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          handleToggleCoabita(c.cns);
                        }}
                        className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
                          c.coabita
                            ? "bg-neutral-100 text-neutral-800 hover:bg-neutral-200"
                            : "bg-neutral-50 text-neutral-400 hover:bg-neutral-100"
                        }`}
                      >
                        {c.coabita ? "Mora junto" : "Não mora junto"}
                      </button>
                      <span
                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                          examinado
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {examinado ? (
                          <>
                            <Check className="size-3" />
                            1ª amostra coletada
                          </>
                        ) : (
                          <>
                            <X className="size-3" />
                            Amostra pendente
                          </>
                        )}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      handleRemoveContact(c.cns);
                    }}
                    className="shrink-0 ml-2 rounded p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-rose-600"
                    aria-label={`Remover contato ${c.cns}`}
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-neutral-500 italic">
            Nenhum contato cadastrado para este caso.
          </p>
        )}
      </section>
    </form>
  );
}
