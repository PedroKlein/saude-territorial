/**
 * Default alert rules for the health monitoring system.
 *
 * Rules are evaluated against patient data at render time.
 * Format: [Layer, Column, Operator, Value, Alert Level]
 */

import type { AlertRule } from "@/types/alerts";

export const ALERT_RULES: AlertRule[] = [
  // Gestantes — IG > 40 semanas (pós-termo)
  {
    layer: "gestantes",
    column: "ig",
    operator: ">",
    value: 40,
    level: "vermelho",
  },
  // Gestantes — risco alto
  {
    layer: "gestantes",
    column: "risco",
    operator: "=",
    value: "alto",
    level: "vermelho",
  },
  // Gestantes — sem consulta há mais de 30 dias
  {
    layer: "gestantes",
    column: "dataUltimaConsulta",
    operator: "older_than_days",
    value: 30,
    level: "vermelho",
  },
  // Tuberculose — sem baciloscopia
  {
    layer: "tuberculose",
    column: "baciloscopia",
    operator: "is_empty",
    value: "",
    level: "amarelo",
  },
  // Acamados — sem visita há mais de 30 dias
  {
    layer: "acamados",
    column: "dataUltimaAtualizacao",
    operator: "older_than_days",
    value: 30,
    level: "amarelo",
  },
  // Hipertensão — sem consulta há mais de 60 dias
  {
    layer: "hipertensao",
    column: "dataUltimaConsulta",
    operator: "older_than_days",
    value: 60,
    level: "vermelho",
  },
  // Diabetes — sem consulta há mais de 45 dias
  {
    layer: "diabetes",
    column: "dataUltimaConsulta",
    operator: "older_than_days",
    value: 45,
    level: "amarelo",
  },
];
