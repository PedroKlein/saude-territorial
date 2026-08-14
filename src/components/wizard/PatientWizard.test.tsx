/**
 * PatientWizard smoke tests (UP-3).
 *
 * Covers:
 *  1. Renders nothing when open=false
 *  2. Opens with mode=new — identidade step (CNS input) is present
 *  3. Advances identidade → endereço on valid CNS + nome submit
 *  4. Refuses to advance when CNS is invalid (Luhn fails)
 *  5. add-condition mode skips identidade/endereço — no CNS input visible
 *
 * LGPD: all patient values are synthetic / fictitious.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as React from "react";
import type { ReactNode } from "react";

// -----------------------------------------------------------------------
// Module mocks — hoisted before any component-under-test import
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
      {...(rest as React.InputHTMLAttributes<HTMLInputElement>)}
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
  default: (
    _fn: unknown,
    opts: { loading?: () => ReactNode },
  ) => opts?.loading?.() ?? (() => null),
}));

vi.mock("@/stores/mapStore", () => ({
  useMapStore: (
    sel: (s: { setSelectedPatient: (v: string | null) => void }) => unknown,
  ) => sel({ setSelectedPatient: vi.fn() }),
}));

vi.mock("@/hooks/useCreatePatient", () => ({
  useCreatePatient: () => ({
    mutateAsync: vi.fn().mockResolvedValue({
      status: 201,
      data: { patient: { id: "new-id" } },
    }),
    isPending: false,
  }),
  useAttachCondition: () => ({
    mutateAsync: vi.fn().mockResolvedValue({ status: 201, data: {} }),
    isPending: false,
  }),
  isCreatePatientError: (_e: unknown): boolean => false,
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

    // Drive RHF fields through the mocked inputs
    fireEvent.change(screen.getByTestId("cns-input"), {
      target: { value: VALID_CNS },
    });
    fireEvent.change(screen.getByLabelText("Nome completo"), {
      target: { value: "Paciente Sintético" },
    });

    submitStep();

    // After advance, address fields (StepEndereco) should be visible
    await waitFor(() => {
      expect(screen.getByLabelText("Rua")).toBeInTheDocument();
    });
    // CNS input must be gone (not on identidade anymore)
    expect(screen.queryByTestId("cns-input")).toBeNull();
  });

  it("refuses to advance identidade when CNS fails Luhn validation", async () => {
    render(
      <Wrapper>
        <PatientWizard open mode={{ kind: "new" }} onClose={vi.fn()} />
      </Wrapper>,
    );

    // All-zeros CNS fails the Luhn checksum
    fireEvent.change(screen.getByTestId("cns-input"), {
      target: { value: "000000000000000" },
    });
    fireEvent.change(screen.getByLabelText("Nome completo"), {
      target: { value: "Paciente Sintético" },
    });

    submitStep();

    // RHF should keep the wizard on identidade
    await waitFor(() => {
      expect(screen.getByTestId("cns-input")).toBeInTheDocument();
    });
    // endereço's "Rua" field must not be visible
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
});
