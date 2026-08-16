/**
 * QualityView — unit tests (data quality tab, /pacientes)
 *
 * Covers:
 *  1. Renders correct group headings and counts for a 2-patient fixture.
 *  2. Clicking "Editar" calls onEdit with the correct patient id.
 *  3. Empty-state renders when all patients are clean.
 *  4. "Mostrar mais N" toggle expands the list past 5.
 *
 * LGPD: fixtures use fictitious data; no real patient info in logs.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { QualityView } from "./QualityView";
import type { UnifiedPatient } from "./page";

// ---------------------------------------------------------------------------
// Fixtures — LGPD: fictitious data
// ---------------------------------------------------------------------------

/** Returns a fully-populated patient with all quality checks passing by default. */
function makePatient(
  overrides: Partial<Record<string, unknown>> & { id: string; nomeCompleto?: string | null },
): UnifiedPatient {
  return {
    cns: "000000000000000",
    nomeCompleto: "Paciente Sintético",
    lat: -30.034,
    lng: -51.217,
    rua: "Rua Sintética",
    cep: "90000000",
    microarea: "MA1",
    telefone: "51999990000",
    dataNascimento: "01/01/1990",
    // non-empty array → does not trigger sem-vulnerabilidades
    vulnerabilidades: ["referencia-familiar"],
    conditions: [],
    dataUltimaAtualizacao: null,
    ...overrides,
  } as unknown as UnifiedPatient;
}

/** Triggers: sem-telefone only */
const PATIENT_NO_TELEFONE = makePatient({
  id: "uuid-001",
  cns: "111222333444555",
  nomeCompleto: "Maria Silva",
  telefone: null,
});

/** Triggers: sem-endereco only (lat/lng 0 = falsy, no rua) */
const PATIENT_NO_ENDERECO = makePatient({
  id: "uuid-002",
  cns: "222333444555666",
  nomeCompleto: "João Santos",
  lat: 0,
  lng: 0,
  rua: null,
});

/** Triggers: no issue — all fields present */
const CLEAN_PATIENT = makePatient({
  id: "uuid-003",
  cns: "333444555666777",
  nomeCompleto: "Ana Costa",
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("QualityView", () => {
  it("renders correct group headings and patient names for 2-patient fixture", () => {
    render(
      <QualityView
        patients={[PATIENT_NO_TELEFONE, PATIENT_NO_ENDERECO]}
        isLoading={false}
        onEdit={vi.fn()}
      />,
    );

    expect(screen.getByText("Sem endereço")).toBeInTheDocument();
    expect(screen.getByText("Sem telefone")).toBeInTheDocument();
    expect(screen.getByText("Maria Silva")).toBeInTheDocument();
    expect(screen.getByText("João Santos")).toBeInTheDocument();
  });

  it("calls onEdit with the correct patient id when Editar is clicked", () => {
    const onEdit = vi.fn();
    render(
      <QualityView
        patients={[PATIENT_NO_TELEFONE, PATIENT_NO_ENDERECO]}
        isLoading={false}
        onEdit={onEdit}
      />,
    );

    // Find the list item for Maria Silva and click its Editar button.
    const mariaCell = screen.getByText("Maria Silva");
    const mariaRow = mariaCell.closest("li")!;
    fireEvent.click(within(mariaRow).getByRole("button", { name: "Editar" }));

    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onEdit).toHaveBeenCalledWith("uuid-001");
  });

  it("shows empty-state message when all patients pass quality checks", () => {
    render(
      <QualityView
        patients={[CLEAN_PATIENT]}
        isLoading={false}
        onEdit={vi.fn()}
      />,
    );

    expect(
      screen.getByText(/Todos os cadastros têm dados básicos preenchidos/),
    ).toBeInTheDocument();
  });

  it("collapses rows beyond 5 and expands when Mostrar mais is clicked", () => {
    // 6 patients all missing telefone → single sem-telefone group with 6 rows
    const manyPatients = Array.from({ length: 6 }, (_, i) =>
      makePatient({
        id: `uuid-${10 + i}`,
        nomeCompleto: `Paciente ${i + 1}`,
        telefone: null,
      }),
    );

    render(
      <QualityView patients={manyPatients} isLoading={false} onEdit={vi.fn()} />,
    );

    // Only first 5 visible; the 6th is hidden
    expect(screen.getByText("Paciente 1")).toBeInTheDocument();
    expect(screen.queryByText("Paciente 6")).not.toBeInTheDocument();
    expect(screen.getByText(/Mostrar mais 1/)).toBeInTheDocument();

    // Expand
    fireEvent.click(screen.getByText(/Mostrar mais 1/));
    expect(screen.getByText("Paciente 6")).toBeInTheDocument();
  });
});
