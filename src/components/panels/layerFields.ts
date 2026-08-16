/**
 * `LAYER_FIELDS` — which form fields are rendered per condition layer.
 *
 * Kept explicit rather than derived from `LAYER_CONFIG.visibleColumns` because
 * the visibleColumns list mixes stale keys from the pre-pivot mock. The schema
 * files are the ground truth.
 *
 * Imported by the wizard's per-condition data steps and the panel's edit
 * creates share the same field set.
 *
 * Enum fields carry `values` + `labels` — matching `src/lib/patients/enums.ts`
 * canonical inventory. Adding a value here without adding it to the enum
 * module + migration is a bug; the API layer will reject the write.
 */

import {
  ACOMPANHAMENTO_STATUS_LABELS,
  ACOMPANHAMENTO_STATUS_VALUES,
  BACILOSCOPIA_RESULTADO_LABELS,
  BACILOSCOPIA_RESULTADO_VALUES,
  CULTURA_RESULTADO_LABELS,
  CULTURA_RESULTADO_VALUES,
  ENCERRAMENTO_MOTIVO_TB_LABELS,
  ENCERRAMENTO_MOTIVO_TB_VALUES,
  IG_ABERTURA_LABELS,
  IG_ABERTURA_VALUES,
  RESULTADO_TR_LABELS,
  RESULTADO_TR_VALUES,
  RISCO_LABELS,
  RISCO_VALUES,
  STATUS_REALIZACAO_LABELS,
  STATUS_REALIZACAO_VALUES,
  TDO_STATUS_LABELS,
  TDO_STATUS_VALUES,
  TIPO_ENTRADA_TB_LABELS,
  TIPO_ENTRADA_TB_VALUES,
  TRM_RESULTADO_LABELS,
  TRM_RESULTADO_VALUES,
  TR_STATUS_LABELS,
  TR_STATUS_VALUES,
} from "@/lib/patients/enums";

export type FieldDef =
  | { key: string; label: string; type: "text" | "date" | "number" }
  | {
      key: string;
      label: string;
      type: "enum";
      values: readonly string[];
      labels: Readonly<Record<string, string>>;
    };

export const LAYER_FIELDS: Record<
  "gestantes" | "tuberculose" | "hipertensao",
  ReadonlyArray<FieldDef>
> = {
  gestantes: [
    { key: "dum", label: "DUM (Data da Última Menstruação)", type: "date" },
    { key: "dpp", label: "DPP (Data Provável do Parto)", type: "date" },
    {
      key: "risco",
      label: "Risco",
      type: "enum",
      values: RISCO_VALUES,
      labels: RISCO_LABELS,
    },
    {
      key: "igAbertura",
      label: "IG na abertura PN",
      type: "enum",
      values: IG_ABERTURA_VALUES,
      labels: IG_ABERTURA_LABELS,
    },
    {
      key: "dataUltimaConsulta",
      label: "Data da última consulta",
      type: "date",
    },
    {
      key: "dataProximaConsulta",
      label: "Data da próxima consulta",
      type: "date",
    },
    { key: "numeroConsultas", label: "Número de consultas", type: "number" },
    { key: "pressaoArterial", label: "Pressão arterial", type: "text" },
    {
      key: "vacinaDtpa",
      label: "Vacina dTpa",
      type: "enum",
      values: STATUS_REALIZACAO_VALUES,
      labels: STATUS_REALIZACAO_LABELS,
    },
    {
      key: "avaliacaoOdontoStatus",
      label: "Avaliação odonto",
      type: "enum",
      values: STATUS_REALIZACAO_VALUES,
      labels: STATUS_REALIZACAO_LABELS,
    },
    {
      key: "acompanhamentoPesoAltura",
      label: "Acompanhamento peso/altura",
      type: "enum",
      values: ACOMPANHAMENTO_STATUS_VALUES,
      labels: ACOMPANHAMENTO_STATUS_LABELS,
    },
    {
      key: "trPrimeiroTri",
      label: "TR Sífilis/HIV — 1º trimestre",
      type: "enum",
      values: TR_STATUS_VALUES,
      labels: TR_STATUS_LABELS,
    },
    {
      key: "trSegundoTri",
      label: "TR Sífilis/HIV — 2º trimestre",
      type: "enum",
      values: TR_STATUS_VALUES,
      labels: TR_STATUS_LABELS,
    },
    {
      key: "trTerceiroTri",
      label: "TR Sífilis/HIV — 3º trimestre",
      type: "enum",
      values: TR_STATUS_VALUES,
      labels: TR_STATUS_LABELS,
    },
    {
      key: "resultadoTr",
      label: "Resultado teste rápido",
      type: "enum",
      values: RESULTADO_TR_VALUES,
      labels: RESULTADO_TR_LABELS,
    },
  ],
  tuberculose: [
    { key: "tipo", label: "Tipo", type: "text" },
    {
      key: "baciloscopiaResultado",
      label: "Baciloscopia (resultado)",
      type: "enum",
      values: BACILOSCOPIA_RESULTADO_VALUES,
      labels: BACILOSCOPIA_RESULTADO_LABELS,
    },
    {
      key: "trmResultado",
      label: "TRM (resultado)",
      type: "enum",
      values: TRM_RESULTADO_VALUES,
      labels: TRM_RESULTADO_LABELS,
    },
    {
      key: "culturaMTuberculosis",
      label: "Cultura M. tuberculosis",
      type: "enum",
      values: CULTURA_RESULTADO_VALUES,
      labels: CULTURA_RESULTADO_LABELS,
    },
    { key: "formaClinica", label: "Forma clínica", type: "text" },
    { key: "esquema", label: "Esquema", type: "text" },
    {
      key: "dataInicio",
      label: "Data de início do tratamento",
      type: "date",
    },
    {
      key: "tdoStatus",
      label: "TDO (status)",
      type: "enum",
      values: TDO_STATUS_VALUES,
      labels: TDO_STATUS_LABELS,
    },
    {
      key: "tipoEntrada",
      label: "Tipo de entrada",
      type: "enum",
      values: TIPO_ENTRADA_TB_VALUES,
      labels: TIPO_ENTRADA_TB_LABELS,
    },
    {
      key: "encerramentoMotivo",
      label: "Motivo de encerramento",
      type: "enum",
      values: ENCERRAMENTO_MOTIVO_TB_VALUES,
      labels: ENCERRAMENTO_MOTIVO_TB_LABELS,
    },
    { key: "encerramentoData", label: "Data de encerramento", type: "date" },
    { key: "outrosExames", label: "Outros exames", type: "text" },
  ],
  hipertensao: [
    {
      key: "dataUltimaConsulta",
      label: "Data da última consulta",
      type: "date",
    },
    {
      key: "dataProximaConsulta",
      label: "Data da próxima consulta",
      type: "date",
    },
    {
      key: "dataUltimaAfericaoPa",
      label: "Data da última aferição PA",
      type: "date",
    },
    { key: "pressaoArterial", label: "Pressão arterial", type: "text" },
    { key: "registroNotas", label: "Notas clínicas", type: "text" },
    { key: "encaminhamentos", label: "Encaminhamentos", type: "text" },
  ],
};

/** Layers the forms support editing. */
export const EDITABLE_LAYERS: Record<
  "gestantes" | "tuberculose" | "hipertensao",
  true
> = {
  gestantes: true,
  tuberculose: true,
  hipertensao: true,
};
