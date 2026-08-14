/**
 * Visual configuration for each map layer (= Google Sheet tab).
 * Use `as const satisfies` to validate shape without widening literal types.
 */
export type LayerConfig = {
  /** Path to SVG icon in /public/icons/ */
  icon: string;
  /** CSS color token name (maps to --color-<token> in globals.css) */
  colorToken: string;
  /** Sheet tab display name (Portuguese, matches actual tab name) */
  label: string;
  /** Columns to show in the detail panel */
  visibleColumns: string[];
};

export const LAYER_CONFIG = {
  gestantes: {
    icon: "/icons/pregnant.svg",
    colorToken: "gestante",
    label: "Gestantes",
    visibleColumns: ["nomeCompleto", "cns", "dum", "dpp", "risco", "ig"],
  },
  tuberculose: {
    icon: "/icons/tb.svg",
    colorToken: "tuberculose",
    label: "Tuberculose",
    visibleColumns: ["nome", "cns", "baciloscopia", "trm", "cultura", "formaClinica"],
  },
  diabetes: {
    icon: "/icons/diabetes.svg",
    colorToken: "diabetes",
    label: "DM (Diabetes)",
    visibleColumns: ["nome", "cns", "pmdid"],
  },
  hipertensao: {
    icon: "/icons/hypertension.svg",
    colorToken: "hipertensao",
    label: "HAS (Hipertensão)",
    visibleColumns: ["nome", "cns", "dataUltimaConsulta"],
  },
  acamados: {
    icon: "/icons/bedridden.svg",
    colorToken: "acamados",
    label: "Domiciliados Acamados",
    visibleColumns: ["nome", "cns", "vacinas", "statusVisita"],
  },
  pse: {
    icon: "/icons/school.svg",
    colorToken: "pse",
    label: "PSE (Saúde na Escola)",
    visibleColumns: ["nomeEscola", "inep", "acoes"],
  },
  ilpi: {
    icon: "/icons/ilpi.svg",
    colorToken: "ilpi",
    label: "ILPI",
    visibleColumns: ["nomeLocal", "atividades"],
  },
} as const satisfies Record<string, LayerConfig>;

export type LayerId = keyof typeof LAYER_CONFIG;
