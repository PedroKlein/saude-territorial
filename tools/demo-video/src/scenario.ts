const DAY_MS = 24 * 60 * 60 * 1000;

function isoDateDaysFromNow(days: number): string {
  return new Date(Date.now() + days * DAY_MS).toISOString().slice(0, 10);
}

function displayDate(iso: string): string {
  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
}

function relativeDate(days: number) {
  const iso = isoDateDaysFromNow(days);
  return {iso, display: displayDate(iso)};
}

// SYNTHETIC DATA — not real patients.
const planDate = isoDateDaysFromNow(7);

export const demoViewport = {width: 1920, height: 1080} as const;

export const demoScenario = {
  patient: {
    cns: "100000000000007",
    name: "Helena Demo Sintética",
    street: "Rua Demonstrativa Inexistente",
    number: "123",
    neighborhood: "Bairro Sintético",
    reference: "Casa fictícia com portão verde",
  },
  pregnancy: {
    dum: relativeDate(-14),
    lastConsultation: relativeDate(-5),
    nextConsultation: relativeDate(7),
    consultations: "2",
    bloodPressure: "130/85",
    dtpa: "A realizar",
    prenatalStart: "Menos de 12 semanas",
    homeVisits: "1",
    weightFollowUp: "Em dia",
    dentalEvaluation: "A realizar",
    firstTrimesterTest: "Feito",
    secondTrimesterTest: "Não feito",
    thirdTrimesterTest: "Não realizada",
    rapidTestResult: "Não reagente",
    firstTrimesterExpandedTest: "Realizada",
    thirdTrimesterExpandedTest: "A realizar",
    previousHypertension: "Não",
    previousDiabetes: "Não",
  },
  planner: {
    acsName: "ACS Demonstração",
    date: planDate,
    dateDisplay: displayDate(planDate),
  },
} as const;
