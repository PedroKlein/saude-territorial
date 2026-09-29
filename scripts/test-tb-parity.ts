/**
 * scripts/test-tb-parity.ts
 *
 * Automated verification for TB sheet parity:
 * - TuberculosePatchSchema validation with all sheet fields & values
 * - Handling of empty strings, nulls, and NaNs
 * - Follow-up consultations (1º ao 9º mês) array validation
 * - Dynamic contact calculation logic
 * - Cross-field date constraints
 */

import { strict as assert } from "node:assert";
import { TuberculosePatchSchema } from "../src/lib/patients/schemas";
import {
  BACILOSCOPIA_RESULTADO_VALUES,
  TRM_RESULTADO_VALUES,
  TIPO_CASO_TB_VALUES,
  CULTURA_RESULTADO_VALUES,
  TDO_STATUS_VALUES,
  ENCERRAMENTO_MOTIVO_TB_VALUES,
} from "../src/lib/patients/enums";

console.log("▶ Running TB Sheet Parity Test Suite...");

// Test 1: Full payload with all sheet fields
{
  const payload = {
    tipo: "Caso Fonte",
    galRegistro: "Sim",
    dataPrimeiraAmostra: "10/01/2025",
    dataSegundaAmostra: "15/01/2025",
    baciloscopiaResultado: "Positivo+",
    baciloscopiaSegundaResultado: "Negativo",
    trmData: "12/01/2025",
    trmResultado: "Detectado/ Rifampicina Sensível",
    culturaMTuberculosis: "Positiva",
    culturaOutros: "Nenhum crescimento atípico",
    formaClinica: "Pulmonar",
    tipoEntrada: "Caso novo",
    esquema: "RHZE",
    dataInicio: "15/01/2025",
    formaTratamento: "Supervisionado",
    tdoStatus: "TDO em dia",
    encerramentoMotivo: "Cura",
    encerramentoData: "15/07/2025",
    ppdMm: 12,
    histopatologia: "Processo inflamatório crônico granulomatoso",
    rxTorax: "Feito",
    outrosExames: "Hemograma normal",
    contatosCoabitantes: 2,
    contatosExaminados: 2,
    todosContatosExaminados: true,
    contatosLista: JSON.stringify([
      { cns: "898001147585001", nome: "Contato A", coabita: true, examinado: true },
      { cns: "898001147585002", nome: "Contato B", coabita: true, examinado: true },
      { cns: "898001147585003", nome: "Contato C", coabita: false, examinado: false },
    ]),
    consultas: [
      { mes: 1, realizada: true },
      { mes: 2, realizada: true },
      { mes: 3, realizada: true },
      { mes: 4, realizada: true },
      { mes: 5, realizada: true },
      { mes: 6, realizada: true },
    ],
  };

  const parsed = TuberculosePatchSchema.safeParse(payload);
  assert.equal(parsed.success, true, "Valid sheet parity payload must pass schema validation");
  if (parsed.success) {
    assert.equal(parsed.data.tipo, "Caso Fonte");
    assert.equal(parsed.data.galRegistro, "Sim");
    assert.equal(parsed.data.baciloscopiaResultado, "Positivo+");
    assert.equal(parsed.data.baciloscopiaSegundaResultado, "Negativo");
    assert.equal(parsed.data.trmResultado, "Detectado/ Rifampicina Sensível");
    assert.equal(parsed.data.culturaMTuberculosis, "Positiva");
    assert.equal(parsed.data.ppdMm, 12);
    assert.equal(parsed.data.consultas?.length, 6);
    assert.equal(parsed.data.todosContatosExaminados, true);
  }
  console.log("  ✔ Test 1 passed: Full sheet parity payload validated successfully.");
}

// Test 2: Empty number inputs & NaN resilience
{
  const payloadWithEmpties = {
    tipo: "Contato",
    ppdMm: "", // empty string from unentered input
    contatosCoabitantes: null,
    contatosExaminados: undefined,
  };

  const parsed = TuberculosePatchSchema.safeParse(payloadWithEmpties);
  assert.equal(parsed.success, true, "Empty strings for number fields must resolve to null without errors");
  if (parsed.success) {
    assert.equal(parsed.data.ppdMm, null);
    assert.equal(parsed.data.contatosCoabitantes, null);
    assert.equal(parsed.data.contatosExaminados, undefined);
  }
  console.log("  ✔ Test 2 passed: Empty numbers and nulls handled safely.");
}

// Test 3: All sheet enum values are accepted
{
  for (const tipo of TIPO_CASO_TB_VALUES) {
    const res = TuberculosePatchSchema.safeParse({ tipo });
    assert.equal(res.success, true, `Tipo '${tipo}' must be accepted`);
  }
  for (const b of BACILOSCOPIA_RESULTADO_VALUES) {
    const res = TuberculosePatchSchema.safeParse({ baciloscopiaResultado: b, baciloscopiaSegundaResultado: b });
    assert.equal(res.success, true, `Baciloscopia '${b}' must be accepted`);
  }
  for (const trm of TRM_RESULTADO_VALUES) {
    const res = TuberculosePatchSchema.safeParse({ trmResultado: trm });
    assert.equal(res.success, true, `TRM '${trm}' must be accepted`);
  }
  for (const cult of CULTURA_RESULTADO_VALUES) {
    const res = TuberculosePatchSchema.safeParse({ culturaMTuberculosis: cult });
    assert.equal(res.success, true, `Cultura '${cult}' must be accepted`);
  }
  for (const tdo of TDO_STATUS_VALUES) {
    const res = TuberculosePatchSchema.safeParse({ tdoStatus: tdo });
    assert.equal(res.success, true, `TDO '${tdo}' must be accepted`);
  }
  for (const enc of ENCERRAMENTO_MOTIVO_TB_VALUES) {
    const res = TuberculosePatchSchema.safeParse({ encerramentoMotivo: enc });
    assert.equal(res.success, true, `Encerramento '${enc}' must be accepted`);
  }
  console.log("  ✔ Test 3 passed: All sheet enums accepted.");
}

// Test 4: Cross-field constraints
{
  // 2nd sample before 1st sample
  const sampleOrderFail = TuberculosePatchSchema.safeParse({
    dataPrimeiraAmostra: "20/01/2025",
    dataSegundaAmostra: "10/01/2025",
  });
  assert.equal(sampleOrderFail.success, false, "2nd sample before 1st sample must be rejected");

  // Encerramento before inicio
  const encerramentoOrderFail = TuberculosePatchSchema.safeParse({
    dataInicio: "20/03/2025",
    encerramentoData: "10/03/2025",
  });
  assert.equal(encerramentoOrderFail.success, false, "Encerramento before dataInicio must be rejected");

  console.log("  ✔ Test 4 passed: Cross-field temporal constraints enforced.");
}

// Test 5: Dynamic contact computation
{
  type ContactItem = { cns: string; nome?: string; coabita: boolean; examinado: boolean };

  const contactsList: ContactItem[] = [
    { cns: "111", coabita: true, examinado: true },
    { cns: "222", coabita: true, examinado: false },
    { cns: "333", coabita: false, examinado: false }, // does not cohabitate
  ];

  function checkAllExamined(list: ContactItem[]): boolean {
    const coabs = list.filter((c) => c.coabita);
    return coabs.length === 0 || coabs.every((c) => c.examinado);
  }

  const coabitantes = contactsList.filter((c) => c.coabita).length;
  const exam = contactsList.filter((c) => c.examinado).length;

  assert.equal(coabitantes, 2);
  assert.equal(exam, 1);
  assert.equal(checkAllExamined(contactsList), false);

  // If 2nd is also examined (1st sample collected)
  contactsList[1]!.examinado = true;
  const exam2 = contactsList.filter((c) => c.examinado).length;

  assert.equal(exam2, 2);
  assert.equal(checkAllExamined(contactsList), true);

  // 0/0 contacts (empty list or no cohabitants) counts as all examined!
  assert.equal(checkAllExamined([]), true, "Empty list (0/0) must evaluate to true");
  assert.equal(
    checkAllExamined([{ cns: "444", coabita: false, examinado: false }]),
    true,
    "Non-cohabitants only (0/0) must evaluate to true",
  );

  console.log("  ✔ Test 5 passed: Dynamic contact metric derivation & 0/0 rule verified.");
}

console.log("\nAll TB Sheet Parity automated tests passed successfully!\n");
