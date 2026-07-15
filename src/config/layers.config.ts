/**
 * Visual configuration for each map layer (= Google Sheet tab).
 * Use `as const satisfies` to validate shape without widening literal types.
 */
export type LayerConfig = {
  /** Path to SVG icon in /public/icons/ */
  icon: string;
  /** CSS color token name (maps to --color-layer-* in globals.css) */
  colorToken: string;
  /** Sheet tab display name (Portuguese, matches actual tab name) */
  label: string;
  /** Columns to show in the detail panel */
  visibleColumns: string[];
};

export const LAYER_CONFIG = {
  gestantes: {
    icon: "/icons/pregnant.svg",
    colorToken: "layer-gestantes",
    label: "Gestantes",
    visibleColumns: ["nome", "cns", "dum", "dpp", "risco", "ig"],
  },
  tuberculose: {
    icon: "/icons/tb.svg",
    colorToken: "layer-tuberculose",
    label: "Tuberculose",
    visibleColumns: ["nome", "cns", "baciloscopia", "trm", "cultura", "formaClinica"],
  },
  diabetes: {
    icon: "/icons/diabetes.svg",
    colorToken: "layer-diabetes",
    label: "DM (Diabetes)",
    visibleColumns: ["nome", "cns", "pmdid"],
  },
  hipertensao: {
    icon: "/icons/hypertension.svg",
    colorToken: "layer-hipertensao",
    label: "HAS (Hipertensão)",
    visibleColumns: ["nome", "cns", "dataUltimaConsulta"],
  },
  acamados: {
    icon: "/icons/bedridden.svg",
    colorToken: "layer-acamados",
    label: "Domiciliados Acamados",
    visibleColumns: ["nome", "cns", "vacinas", "statusVisita"],
  },
  pse: {
    icon: "/icons/school.svg",
    colorToken: "layer-pse",
    label: "PSE (Saúde na Escola)",
    visibleColumns: ["nomeEscola", "inep", "acoes"],
  },
  ilpi: {
    icon: "/icons/ilpi.svg",
    colorToken: "layer-ilpi",
    label: "ILPI",
    visibleColumns: ["nomeLocal", "atividades"],
  },
} as const satisfies Record<string, LayerConfig>;

export type LayerId = keyof typeof LAYER_CONFIG;
