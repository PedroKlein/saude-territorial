/**
 * StepDadosTB — full-parity round-trip (Phase B, sheet-parity plan).
 *
 * Invariant: the tuberculose step's "campos avançados" block (PPD, exames de
 * histopatologia / RX / outros, forma de tratamento, contatos) round-trips
 * through TuberculosePatchSchema into ctx.tuberculose on submit, so editing a
 * TB case does not drop the treatment-monitoring detail.
 *
 * LGPD: all values are fictitious.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import "@testing-library/jest-dom";

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
  });
}

describe("StepDadosTB — full-parity round-trip", () => {
  it("preserves advanced fields (PPD, exames, forma tratamento, contatos) on submit", async () => {
    const setCtx = vi.fn();
    const goNext = vi.fn();
    const ctx: PatientWizardCtx = {
      ...BASE_CTX,
      tuberculose: {
        tipo: "Pulmonar",
        ppdMm: 12,
        histopatologia: "Granuloma",
        rxTorax: "Infiltrado apical",
        outrosExames: "Nenhum",
        formaTratamento: "Autoadministrado",
        contatosCoabitantes: 4,
        contatosExaminados: 2,
        todosContatosExaminados: false,
      },
    };

    const { container } = render(
      <StepDadosTB ctx={ctx} setCtx={setCtx} goNext={goNext} goBack={vi.fn()} />,
    );

    await submitForm(container);

    expect(setCtx).toHaveBeenCalledTimes(1);
    const t = setCtx.mock.calls[0][0].tuberculose as Record<string, unknown>;
    expect(t.ppdMm).toBe(12);
    expect(t.histopatologia).toBe("Granuloma");
    expect(t.rxTorax).toBe("Infiltrado apical");
    expect(t.outrosExames).toBe("Nenhum");
    expect(t.formaTratamento).toBe("Autoadministrado");
    expect(t.contatosCoabitantes).toBe(4);
    expect(t.contatosExaminados).toBe(2);
    expect(goNext).toHaveBeenCalled();
  });

  it("surfaces the contatos coherence error (examinados > coabitantes)", async () => {
    const setCtx = vi.fn();
    const goNext = vi.fn();
    const ctx: PatientWizardCtx = {
      ...BASE_CTX,
      tuberculose: { contatosCoabitantes: 1, contatosExaminados: 5 },
    };

    const { container } = render(
      <StepDadosTB ctx={ctx} setCtx={setCtx} goNext={goNext} goBack={vi.fn()} />,
    );

    await submitForm(container);

    // Cross-field guard rejects the submit — step does not advance.
    expect(goNext).not.toHaveBeenCalled();
    expect(setCtx).not.toHaveBeenCalled();
    expect(
      screen.getByText(/Contatos examinados não pode exceder/i),
    ).toBeInTheDocument();
  });
});
