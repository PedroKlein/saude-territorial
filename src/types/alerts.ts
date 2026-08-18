/**
 * Alert system types for the rule engine.
 *
 * Rules are evaluated against patient data to produce alerts
 * with severity levels (vermelho > amarelo > verde).
 */

export type AlertOperator =
  | ">"
  | "<"
  | ">="
  | "<="
  | "="
  | "!="
  | "older_than_days"
  | "is_empty";

export type AlertLevel = "vermelho" | "amarelo" | "verde";

export type AlertRule = {
  /** Which layer (sheet tab) this rule applies to */
  layer: string;
  /** Column/field name to evaluate */
  column: string;
  /** Comparison operator */
  operator: AlertOperator;
  /** Value to compare against (unused for is_empty) */
  value: string | number;
  /** Alert level to assign if rule triggers */
  level: AlertLevel;
}

export type AlertResult = {
  /** Patient CNS identifier */
  patientCns: string;
  /** Highest alert level from all triggered rules */
  level: AlertLevel;
  /** All rules that triggered for this patient */
  triggeredRules: AlertRule[];
}
