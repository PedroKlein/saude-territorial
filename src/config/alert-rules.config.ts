import type { AlertRule } from "@/types/alerts";

/**
 * MVP alert rules — locked; changes need an ADR.
 *
 * These four rules were locked by the health team as the only alerts to
 * evaluate for the MVP. SPEC.md § Alert system lists the set explicitly.
 */
export const ALERT_RULES: AlertRule[] = [
  // Gestantes — IG > 40 semanas (pós-termo)
  {
    layer: "gestantes",
    column: "ig",
    operator: ">",
    value: 40,
    level: "vermelho",
  },
  // Gestantes — risco alto (canonical lowercase; API/normalization enforces it)
  {
    layer: "gestantes",
    column: "risco",
    operator: "=",
    value: "alto",
    level: "amarelo",
  },
  // Tuberculose — sem atualização há mais de 30 dias
  {
    layer: "tuberculose",
    column: "dataUltimaAtualizacao",
    operator: "older_than_days",
    value: 30,
    level: "vermelho",
  },
  // Hipertensão — sem consulta há mais de 180 dias
  {
    layer: "hipertensao",
    column: "dataUltimaConsulta",
    operator: "older_than_days",
    value: 180,
    level: "amarelo",
  },
];
