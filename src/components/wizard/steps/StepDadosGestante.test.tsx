/**
 * StepDadosGestante — full-parity round-trip (Phase B, sheet-parity plan).
 *
 * Invariant: every gestante field the step captures (essentials + the
 * "campos avançados" block: IG na abertura, acompanhamento, TR panels,
 * resultado teste rápido, puerpério trio, exposta) survives a submit — the
 * step maps them through the shared GestantesPatchSchema into ctx.gestantes,
 * so an edit round-trip does not silently drop clinical detail.
 *
 * LGPD: all values are fictitious.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import "@testing-library/jest-dom";

import { StepDadosGestante } from "./StepDadosGestante";
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
  chosenConditions: ["gestantes"],
  originalConditions: ["gestantes"],
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

describe("StepDadosGestante — full-parity round-trip", () => {
  it("preserves advanced fields (puerpério trio, TR panels, exposta) on submit", async () => {
    const setCtx = vi.fn();
    const goNext = vi.fn();
    const ctx: PatientWizardCtx = {
      ...BASE_CTX,
      gestantes: {
        dum: "01/01/2026",
        risco: "alto",
        igAbertura: "< 12 sem",
        numeroConsultas: 6,
        acompanhamentoPesoAltura: "Em dia",
        numeroVisitasDomiciliares: 3,
        avaliacaoOdontoStatus: "Realizada",
        trPrimeiroTri: "Feito",
        trSegundoTri: "Não Feito",
        trTerceiroTri: "Não realizada",
        resultadoTr: "MONITORAR",
        trHepBHepCPrimeiroTri: "Realizada",
        trSifHivTerceiroTri: "A realizar",
        isPuerpera: true,
        puerperioConsulta: "Realizada",
        puerperioVisitaDomiciliar: "A realizar",
        puerperioAvaliacaoOdonto: "Não realizada",
        isExposta: true,
      },
    };

    const { container } = render(
      <StepDadosGestante ctx={ctx} setCtx={setCtx} goNext={goNext} goBack={vi.fn()} />,
    );

    await submitForm(container);

    expect(setCtx).toHaveBeenCalledTimes(1);
    const g = setCtx.mock.calls[0][0].gestantes as Record<string, unknown>;
    expect(g.igAbertura).toBe("< 12 sem");
    expect(g.acompanhamentoPesoAltura).toBe("Em dia");
    expect(g.numeroVisitasDomiciliares).toBe(3);
    expect(g.avaliacaoOdontoStatus).toBe("Realizada");
    expect(g.trPrimeiroTri).toBe("Feito");
    expect(g.trSegundoTri).toBe("Não Feito");
    expect(g.trTerceiroTri).toBe("Não realizada");
    expect(g.resultadoTr).toBe("MONITORAR");
    expect(g.trHepBHepCPrimeiroTri).toBe("Realizada");
    expect(g.trSifHivTerceiroTri).toBe("A realizar");
    expect(g.isPuerpera).toBe(true);
    expect(g.puerperioConsulta).toBe("Realizada");
    expect(g.puerperioVisitaDomiciliar).toBe("A realizar");
    expect(g.puerperioAvaliacaoOdonto).toBe("Não realizada");
    expect(g.isExposta).toBe(true);
    expect(goNext).toHaveBeenCalled();
  });

  it("hides the puerpério trio when the patient is not puérpera", () => {
    render(
      <StepDadosGestante
        ctx={{ ...BASE_CTX, gestantes: { risco: "habitual" } }}
        setCtx={vi.fn()}
        goNext={vi.fn()}
        goBack={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByText(/campos avançados/i));
    expect(screen.queryByText("Puerpério — consulta")).not.toBeInTheDocument();
  });

  it("shows the puerpério trio when the patient is puérpera", () => {
    render(
      <StepDadosGestante
        ctx={{
          ...BASE_CTX,
          gestantes: { risco: "habitual", isPuerpera: true, puerperioConsulta: "Realizada" },
        }}
        setCtx={vi.fn()}
        goNext={vi.fn()}
        goBack={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByText(/campos avançados/i));
    expect(screen.getByText("Puerpério — consulta")).toBeInTheDocument();
  });
});
