/**
 * StepDadosTB — full-parity round-trip (Phase B + Sheet Parity).
 *
 * Invariant:
 *  1. Sheet sections (Registro do caso, Amostras, Exames, Tratamento, Consultas, Encerramento, Contatos)
 *     round-trip cleanly through TuberculosePatchSchema.
 *  2. Contatos dynamically compute coabitantes, examinados, and todosContatosExaminados.
 *  3. Follow-up consultations (1º ao 9º mês) round-trip through consultas array.
 *  4. Empty number inputs (PPD mm) serialize to null without NaN errors.
 *
 * LGPD: all values are fictitious.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import "@testing-library/jest-dom";

vi.mock("@/hooks/usePatientData", () => ({
  usePatientData: () => ({
    data: {
      tuberculose: [
        { cns: "111", dataPrimeiraAmostra: "01/01/2026" },
        { cns: "222", dataPrimeiraAmostra: "02/01/2026" },
        { cns: "111111111111111", dataPrimeiraAmostra: "01/01/2026", nomeCompleto: "Contato 1" },
      ],
    },
    isLoading: false,
  }),
}));

import { StepDadosTB } from "./StepDadosTB";
import type { PatientWizardCtx } from "@/components/wizard/PatientWizard";

const BASE_CTX: PatientWizardCtx = {
  cns: "",
  nomeCompleto: "",
  dataNascimento: "",
  telefone: "",
  vulnerabilidades: "",
  cep: "",
  rua: "",
  numero: "",
  complemento: "",
  bairro: "",
  microarea: "",
  geocodedCoords: null,
  referencia: "",
  chosenConditions: ["tuberculose"],
  originalConditions: ["tuberculose"],
  toRemove: [],
  gestantes: {},
  tuberculose: {},
  hipertensao: {},
};

/** Submit the step form and flush react-hook-form's async resolver. */
async function submitForm(container: HTMLElement) {
  const form = container.querySelector("#wizard-step-form");
  expect(form).not.toBeNull();
  await act(async () => {
    fireEvent.submit(form!);
    await Promise.resolve(); // flush RHF's async resolver microtasks
  });
}

describe("StepDadosTB — full-parity round-trip", () => {
  it("preserves advanced fields (PPD, exames, forma tratamento, contatos) on submit", async () => {
    const setCtx = vi.fn();
    const goNext = vi.fn();
    const ctx: PatientWizardCtx = {
      ...BASE_CTX,
      tuberculose: {
        tipo: "Caso Fonte",
        ppdMm: 12,
        histopatologia: "Granuloma",
        rxTorax: "Feito",
        outrosExames: "Nenhum",
        formaTratamento: "Autoadministrado",
        contatosLista: JSON.stringify([
          { cns: "111", coabita: true, examinado: true },
          { cns: "222", coabita: true, examinado: true },
          { cns: "333", coabita: true, examinado: false },
          { cns: "444", coabita: true, examinado: false },
        ]),
      },
    };

    const { container } = render(
      <StepDadosTB ctx={ctx} setCtx={setCtx} goNext={goNext} goBack={vi.fn()} />,
    );

    await submitForm(container);

    expect(setCtx).toHaveBeenCalledTimes(1);
    const t = setCtx.mock.calls[0]![0]!.tuberculose as Record<string, unknown>;
    expect(t.ppdMm).toBe(12);
    expect(t.histopatologia).toBe("Granuloma");
    expect(t.rxTorax).toBe("Feito");
    expect(t.outrosExames).toBe("Nenhum");
    expect(t.formaTratamento).toBe("Autoadministrado");
    expect(t.contatosCoabitantes).toBe(4);
    expect(t.contatosExaminados).toBe(2);
    expect(t.todosContatosExaminados).toBe(false);
    expect(goNext).toHaveBeenCalled();
  });

  it("dynamically manages contacts and computes examination metrics with coabita filter", async () => {
    const setCtx = vi.fn();
    const goNext = vi.fn();
    const ctx: PatientWizardCtx = {
      ...BASE_CTX,
      tuberculose: {
        tipo: "Caso Fonte",
        contatosLista: JSON.stringify([
          { cns: "111111111111111", nome: "Contato 1", coabita: true, examinado: true },
          { cns: "222222222222222", nome: "Contato 2", coabita: true, examinado: false },
          { cns: "333333333333333", nome: "Contato 3", coabita: false, examinado: false },
        ]),
      },
    };

    const { container } = render(
      <StepDadosTB ctx={ctx} setCtx={setCtx} goNext={goNext} goBack={vi.fn()} />,
    );

    // Initial contacts displayed
    expect(screen.getByText("111111111111111")).toBeInTheDocument();
    expect(screen.getByText("222222222222222")).toBeInTheDocument();
    expect(screen.getByText("333333333333333")).toBeInTheDocument();

    await submitForm(container);

    expect(setCtx).toHaveBeenCalledTimes(1);
    const t = setCtx.mock.calls[0]![0]!.tuberculose as Record<string, unknown>;
    expect(t.contatosCoabitantes).toBe(2);
    expect(t.contatosExaminados).toBe(1);
    expect(t.todosContatosExaminados).toBe(false);
    expect(goNext).toHaveBeenCalled();
  });

  it("submits empty PPD mm without NaN validation errors", async () => {
    const setCtx = vi.fn();
    const goNext = vi.fn();
    const ctx: PatientWizardCtx = {
      ...BASE_CTX,
      tuberculose: {
        tipo: "Caso Fonte",
        ppdMm: null,
      },
    };

    const { container } = render(
      <StepDadosTB ctx={ctx} setCtx={setCtx} goNext={goNext} goBack={vi.fn()} />,
    );

    await submitForm(container);

    expect(setCtx).toHaveBeenCalledTimes(1);
    const t = setCtx.mock.calls[0]![0]!.tuberculose as Record<string, unknown>;
    expect(t.ppdMm).toBeNull();
    expect(goNext).toHaveBeenCalled();
  });

  it("records monthly follow-up consultations in the 9-month tracker", async () => {
    const setCtx = vi.fn();
    const goNext = vi.fn();
    const ctx: PatientWizardCtx = {
      ...BASE_CTX,
      tuberculose: {
        tipo: "Caso Fonte",
        consultas: [
          { mes: 1, realizada: true },
        ],
      },
    };

    const { container } = render(
      <StepDadosTB ctx={ctx} setCtx={setCtx} goNext={goNext} goBack={vi.fn()} />,
    );

    await submitForm(container);

    expect(setCtx).toHaveBeenCalledTimes(1);
    const t = setCtx.mock.calls[0]![0]!.tuberculose as Record<string, unknown>;
    expect(Array.isArray(t.consultas)).toBe(true);
    const consultas = t.consultas as Array<{ mes: number; realizada: boolean }>;
    expect(consultas).toHaveLength(1);
    expect(consultas[0]!.mes).toBe(1);
    expect(consultas[0]!.realizada).toBe(true);
    expect(goNext).toHaveBeenCalled();
  });

  it("treats 0/0 contacts as all examined (todosContatosExaminados: true)", async () => {
    const setCtx = vi.fn();
    const goNext = vi.fn();
    const ctx: PatientWizardCtx = {
      ...BASE_CTX,
      tuberculose: {
        tipo: "Caso Fonte",
        contatosLista: JSON.stringify([]),
      },
    };

    const { container } = render(
      <StepDadosTB ctx={ctx} setCtx={setCtx} goNext={goNext} goBack={vi.fn()} />,
    );

    await submitForm(container);

    expect(setCtx).toHaveBeenCalledTimes(1);
    const t = setCtx.mock.calls[0]![0]!.tuberculose as Record<string, unknown>;
    expect(t.contatosCoabitantes).toBe(0);
    expect(t.contatosExaminados).toBe(0);
    expect(t.todosContatosExaminados).toBe(true);
    expect(goNext).toHaveBeenCalled();
  });

  it("cycles 9x1 consultation button through green, red, and unset on sequential clicks", async () => {
    const setCtx = vi.fn();
    const goNext = vi.fn();
    const ctx: PatientWizardCtx = {
      ...BASE_CTX,
      tuberculose: {
        tipo: "Caso Fonte",
        consultas: [],
      },
    };

    const { container } = render(
      <StepDadosTB ctx={ctx} setCtx={setCtx} goNext={goNext} goBack={vi.fn()} />,
    );

    const month1Btn = screen.getByRole("button", { name: /1º Mês/i });

    // Click 1: Unset -> Green (Realizada)
    fireEvent.click(month1Btn);
    expect(screen.getByRole("button", { name: /1º Mês realizada/i })).toBeInTheDocument();

    // Click 2: Green -> Red (Não realizada)
    fireEvent.click(month1Btn);
    expect(screen.getByRole("button", { name: /1º Mês não realizada/i })).toBeInTheDocument();

    // Click 3: Red -> Unset
    fireEvent.click(month1Btn);
    expect(screen.getByRole("button", { name: /1º Mês não informada/i })).toBeInTheDocument();

    // Submit form: consultas array should be empty
    await submitForm(container);
    expect(setCtx).toHaveBeenCalledTimes(1);
    const t = setCtx.mock.calls[0]![0]!.tuberculose as Record<string, unknown>;
    expect(t.consultas).toEqual([]);
  });
});
