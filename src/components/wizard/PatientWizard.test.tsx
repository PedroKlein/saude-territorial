/**
 * PatientWizard smoke tests (UP-3).
 *
 * Covers:
 *  1. Renders nothing when open=false
 *  2. Opens with mode=new — identidade step (CNS input) is present
 *  3. Advances identidade → endereço on valid CNS + nome submit
 *  4. Refuses to advance when CNS is invalid (Luhn fails)
 *  5. add-condition mode skips identidade/endereço — no CNS input visible
 *  6. 400 from updatePatient surfaces specific field error (#7)
 *  7. Edit mode condition manager: toggle-off/on conditions batches calls (#16)
 *
 * LGPD: all patient values are synthetic / fictitious.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as React from "react";
import type { ReactNode } from "react";

// -----------------------------------------------------------------------
// Hoisted mock refs — referenced by vi.mock factories
// -----------------------------------------------------------------------

const hoisted = vi.hoisted(() => ({
  // createPatient
  createMutateAsync: vi.fn(),
  attachMutateAsync: vi.fn(),
  // updatePatient
  updateMutateAsync: vi.fn(),
  // deleteCondition
  deleteConditionMutateAsync: vi.fn(),
}));

// -----------------------------------------------------------------------
// Module mocks — must be declared before any component import
// -----------------------------------------------------------------------

vi.mock("motion/react", () => ({
  AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, ...props }: React.ComponentProps<"div">) => (
      <div {...props}>{children}</div>
    ),
  },
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ open, children }: { open: boolean; children: ReactNode }) =>
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: ReactNode }) => (
    <div data-testid="dialog-content">{children}</div>
  ),
  DialogTitle: ({ children }: { children: ReactNode }) => (
    <h2 data-testid="dialog-title">{children}</h2>
  ),
  DialogDescription: ({ children }: { children: ReactNode }) => (
    <p>{children}</p>
  ),
  DialogHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogFooter: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/select", () => ({
  Select: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => (
    <span>{placeholder}</span>
  ),
}));

vi.mock("@/components/ui/date-picker", () => ({
  DatePicker: ({ ariaLabel }: { ariaLabel?: string }) => (
    <input type="date" aria-label={ariaLabel ?? "date"} />
  ),
  DateRangePicker: ({ ariaLabel }: { ariaLabel?: string }) => (
    <input type="date" aria-label={ariaLabel ?? "date-range"} />
  ),
}));

/**
 * CnsInput stub: wires `onValueChange` ↔ RHF field.onChange so fireEvent can
 * drive the RHF controller in integration tests.
 */
vi.mock("@/components/ui/masked-input", () => ({
  CnsInput: ({
    value,
    onValueChange,
    ...rest
  }: {
    value?: string;
    onValueChange?: (v: string) => void;
    [k: string]: unknown;
  }) => (
    <input
      data-testid="cns-input"
      value={value ?? ""}
      onChange={(e) => onValueChange?.(e.target.value)}
      {...(rest)}
    />
  ),
  PhoneInput: () => <input aria-label="Telefone" />,
  PressureInput: () => <input aria-label="Pressão arterial" />,
}));

vi.mock("@/components/ui/tooltip", () => ({
  TooltipProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  Tooltip: ({ children }: { children: ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: React.ReactElement }) => children,
  TooltipContent: ({ children }: { children: ReactNode }) => (
    <div role="tooltip">{children}</div>
  ),
}));

vi.mock("lottie-react", () => ({ default: () => <div data-testid="lottie" /> }));

vi.mock("next/dynamic", () => ({
  // dynamic(fn, opts) must return a COMPONENT. Returning `opts.loading()`
  // hands back a JSX element, which React then tries to render as a component
  // and throws "Element type is invalid". Wrap in a functional component so
  // consumers can safely do `<Dynamic {...props} />`.
  default: () => () => null,
}));

vi.mock("@/stores/mapStore", () => ({
  useMapStore: (
    sel: (s: { setSelectedPatient: (v: string | null) => void }) => unknown,
  ) => sel({ setSelectedPatient: vi.fn() }),
}));

vi.mock("@/hooks/useCreatePatient", () => ({
  useCreatePatient: () => ({
    mutateAsync: hoisted.createMutateAsync,
    isPending: false,
  }),
  useAttachCondition: () => ({
    mutateAsync: hoisted.attachMutateAsync,
    isPending: false,
  }),
  isCreatePatientError: (_e: unknown): boolean => false,
}));

vi.mock("@/hooks/useUpdatePatient", () => ({
  useUpdatePatient: () => ({
    mutateAsync: hoisted.updateMutateAsync,
    isPending: false,
  }),
}));

vi.mock("@/hooks/useDeletePatient", () => ({
  useDeletePatient: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteCondition: () => ({
    mutateAsync: hoisted.deleteConditionMutateAsync,
    isPending: false,
  }),
}));

// -----------------------------------------------------------------------
// Component under test — imported AFTER the mocks
// -----------------------------------------------------------------------

import { PatientWizard } from "./PatientWizard";

function Wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

/**
 * Synthetic CNS that passes the Luhn checksum used by isValidCns.
 * LGPD: fictitious — not a real patient identifier.
 */
const VALID_CNS = "100000000000007";

/** Submit the wizard step form (footer button uses form="wizard-step-form"). */
function submitStep() {
  const form = document.getElementById("wizard-step-form") as HTMLFormElement;
  fireEvent.submit(form);
}

// -----------------------------------------------------------------------
// Test setup
// -----------------------------------------------------------------------

beforeEach(() => {
  // Fully reset mocks so `mockRejectedValueOnce` etc. from a previous test
  // cannot leak state into the next.
  hoisted.createMutateAsync.mockReset();
  hoisted.attachMutateAsync.mockReset();
  hoisted.updateMutateAsync.mockReset();
  hoisted.deleteConditionMutateAsync.mockReset();

  hoisted.createMutateAsync.mockResolvedValue({
    status: 201,
    data: { patient: { id: "new-id" } },
  });
  hoisted.attachMutateAsync.mockResolvedValue({ status: 201, data: {} });
  hoisted.updateMutateAsync.mockResolvedValue({ status: 200, data: {} });
  hoisted.deleteConditionMutateAsync.mockResolvedValue(undefined);
});

// -----------------------------------------------------------------------
// Tests
// -----------------------------------------------------------------------

describe("PatientWizard", () => {
  it("renders nothing when open=false", () => {
    render(
      <Wrapper>
        <PatientWizard open={false} mode={{ kind: "new" }} onClose={vi.fn()} />
      </Wrapper>,
    );
    expect(screen.queryByTestId("dialog")).toBeNull();
  });

  it("opens with mode=new — identidade step (CNS input) is present", () => {
    render(
      <Wrapper>
        <PatientWizard open mode={{ kind: "new" }} onClose={vi.fn()} />
      </Wrapper>,
    );
    expect(screen.getByTestId("dialog")).toBeInTheDocument();
    expect(screen.getByTestId("cns-input")).toBeInTheDocument();
  });

  it("advances identidade → endereço on valid CNS + nome submit", async () => {
    render(
      <Wrapper>
        <PatientWizard open mode={{ kind: "new" }} onClose={vi.fn()} />
      </Wrapper>,
    );

    fireEvent.change(screen.getByTestId("cns-input"), {
      target: { value: VALID_CNS },
    });
    fireEvent.change(screen.getByLabelText("Nome completo"), {
      target: { value: "Paciente Sintético" },
    });

    submitStep();

    await waitFor(() => {
      expect(screen.getByLabelText("Rua")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("cns-input")).toBeNull();
  });

  it("refuses to advance identidade when CNS fails Luhn validation", async () => {
    render(
      <Wrapper>
        <PatientWizard open mode={{ kind: "new" }} onClose={vi.fn()} />
      </Wrapper>,
    );

    fireEvent.change(screen.getByTestId("cns-input"), {
      target: { value: "000000000000000" },
    });
    fireEvent.change(screen.getByLabelText("Nome completo"), {
      target: { value: "Paciente Sintético" },
    });

    submitStep();

    await waitFor(() => {
      expect(screen.getByTestId("cns-input")).toBeInTheDocument();
    });
    expect(screen.queryByLabelText("Rua")).toBeNull();
  });

  it("add-condition mode skips identidade/endereço — no CNS input visible", () => {
    render(
      <Wrapper>
        <PatientWizard
          open
          mode={{
            kind: "add-condition",
            patientId: "patient-uuid-001",
            alreadyAttached: ["gestantes"],
          }}
          onClose={vi.fn()}
        />
      </Wrapper>,
    );
    expect(screen.queryByTestId("cns-input")).toBeNull();
  });

  it("#7 — 400 from updatePatient surfaces specific field label in wizard alert", async () => {
    // Mock updatePatient to reject with a structured 400 body.
    hoisted.updateMutateAsync.mockRejectedValueOnce({
      status: 400,
      body: {
        error: "Dados inválidos.",
        issues: [
          {
            path: ["base", "telefone"],
            message: "Telefone deve ter DDD + 8 ou 9 dígitos.",
          },
        ],
      },
      message: "Dados inválidos.",
    });

    const editPatient = {
      id: "edit-patient-007",
      cns: VALID_CNS,
      nomeCompleto: "Paciente Sintético 007",
      lat: -30.05,
      lng: -51.2,
      gestante: null,
      tuberculose: null,
      has: null,
    };

    render(
      <Wrapper>
        <PatientWizard
          open
          mode={{ kind: "edit", patientId: "edit-patient-007", patient: editPatient }}
          onClose={vi.fn()}
        />
      </Wrapper>,
    );

    // Navigate: identidade (pre-filled) → endereco → gerenciar-condicoes → confirmar
    submitStep(); // identidade
    await waitFor(() => { expect(screen.getByLabelText("Rua")).toBeInTheDocument(); });

    submitStep(); // endereco
    // Wait for gerenciar-condicoes step (checkboxes appear)
    await waitFor(() =>
      { expect(screen.getAllByRole("checkbox").length).toBeGreaterThan(0); },
    );

    submitStep(); // gerenciar-condicoes
    // Wait for confirmar step (Finalizar button appears)
    await waitFor(() =>
      { expect(screen.getByText("Finalizar")).toBeInTheDocument(); },
    );

    fireEvent.click(screen.getByText("Finalizar"));

    await waitFor(() => {
      const alert = screen.getByRole("alert");
      expect(alert).toBeInTheDocument();
      // Should show PT-BR label ("Telefone") and the server message.
      expect(alert.textContent).toContain("Telefone");
      expect(alert.textContent).toContain(
        "Telefone deve ter DDD + 8 ou 9 dígitos.",
      );
    });
  });

  it("#16 — edit mode condition manager batches attach+delete on Finalizar", async () => {
    // Patient with gestantes attached.
    const editPatient = {
      id: "edit-patient-016",
      cns: VALID_CNS,
      nomeCompleto: "Paciente Sintético 016",
      lat: -30.05,
      lng: -51.2,
      gestante: { dum: "01/01/2026" },
      tuberculose: null,
      has: null,
    };

    render(
      <Wrapper>
        <PatientWizard
          open
          mode={{ kind: "edit", patientId: "edit-patient-016", patient: editPatient }}
          onClose={vi.fn()}
        />
      </Wrapper>,
    );

    // Step 1: identidade (pre-filled with VALID_CNS + nomeCompleto)
    submitStep();
    await waitFor(() => { expect(screen.getByLabelText("Rua")).toBeInTheDocument(); });

    // Step 2: endereco
    submitStep();
    // Wait for gerenciar-condicoes step — condition checkboxes visible
    await waitFor(() =>
      { expect(screen.getAllByRole("checkbox").length).toBeGreaterThan(0); },
    );

    // Step 3: gerenciar-condicoes
    // gestantes is checked (index 0); tuberculose is unchecked (index 1).
    const checkboxes = screen.getAllByRole("checkbox");
    // Uncheck gestantes → queues for removal.
    fireEvent.click(checkboxes[0]!);
    // Check tuberculose → queues for addition.
    fireEvent.click(checkboxes[1]!);

    submitStep(); // advance past gerenciar-condicoes

    // Step 4: dados-tuberculose (now visible since tuberculose was added)
    await waitFor(() =>
      { expect(document.getElementById("wizard-step-form")).toBeInTheDocument(); },
    );
    submitStep(); // all fields optional — advance

    // Step 5: confirmar → Finalizar
    await waitFor(() =>
      { expect(screen.getByText("Finalizar")).toBeInTheDocument(); },
    );
    fireEvent.click(screen.getByText("Finalizar"));

    // Verify mutations were called correctly.
    await waitFor(() => {
      // PATCH was called (base update).
      expect(hoisted.updateMutateAsync).toHaveBeenCalledOnce();

      // attachCondition called for tuberculose.
      expect(hoisted.attachMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          patientId: "edit-patient-016",
          body: expect.objectContaining({ condicao: "tuberculose" }),
        }),
      );

      // deleteCondition called for gestantes.
      expect(hoisted.deleteConditionMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "edit-patient-016",
          condicao: "gestantes",
        }),
      );
    });
  });
});
