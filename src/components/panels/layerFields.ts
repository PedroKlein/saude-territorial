/**
 * `LAYER_FIELDS` — which form fields are rendered per condition layer.
 *
 * Kept explicit rather than derived from `LAYER_CONFIG.visibleColumns` because
 * the visibleColumns list mixes stale keys from the pre-pivot mock. The schema
 * files are the ground truth.
 *
 * Imported by both `PatientEditForm` and `PatientCreateForm` so edits and
 * creates share the same field set.
 */

export type FieldDef = {
  key: string;
  label: string;
  type: "text" | "date" | "number" | "select";
  options?: readonly string[];
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
      type: "select",
      options: ["habitual", "alto"] as const,
    },
    { key: "igAbertura", label: "IG na abertura PN", type: "text" },
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
    { key: "vacinaDtpa", label: "Vacina dTpa", type: "text" },
  ],
  tuberculose: [
    { key: "tipo", label: "Tipo", type: "text" },
    {
      key: "baciloscopiaResultado",
      label: "Baciloscopia (resultado)",
      type: "text",
    },
    { key: "trmResultado", label: "TRM (resultado)", type: "text" },
    {
      key: "culturaMTuberculosis",
      label: "Cultura M. tuberculosis",
      type: "text",
    },
    { key: "formaClinica", label: "Forma clínica", type: "text" },
    { key: "esquema", label: "Esquema", type: "text" },
    {
      key: "dataInicio",
      label: "Data de início do tratamento",
      type: "date",
    },
    { key: "tdoStatus", label: "TDO (status)", type: "text" },
    {
      key: "encerramentoMotivo",
      label: "Motivo de encerramento",
      type: "text",
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
