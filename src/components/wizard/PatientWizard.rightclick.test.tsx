/**
 * PatientWizard right-click integration tests.
 *
 * Covers: when the wizard is opened with initialCoords (right-click path),
 * the Endereço step initialises geoResult as "manual" and shows the pin
 * picker; the rua field remains empty.
 *
 * LGPD: all coords and patient values are synthetic / fictitious.
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
    open ? <div>{children}</div> : null,
  DialogContent: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DialogTitle: ({ children }: { children: ReactNode }) => (
    <h2>{children}</h2>
  ),
}));

vi.mock("@/components/ui/select", () => ({
  Select: ({
    children,
    onValueChange,
  }: {
    children: ReactNode;
    onValueChange?: (v: string) => void;
  }) => (
    <div data-testid="select-wrapper" onClick={() => onValueChange?.("ma1")}>
      {children}
    </div>
  ),
  SelectTrigger: ({ children }: { children: ReactNode }) => (
    <button type="button">{children}</button>
  ),
  SelectValue: ({ placeholder }: { placeholder?: string }) => (
    <span>{placeholder}</span>
  ),
  SelectContent: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  SelectItem: ({ children }: { children: ReactNode; value: string }) => (
    <div>{children}</div>
  ),
}));

vi.mock("@/components/ui/date-picker", () => ({
  DatePicker: ({
    onValueChange,
  }: {
    value?: string;
    onValueChange?: (v: string) => void;
  }) => (
    <input
      data-testid="date-picker"
      onChange={(e) => onValueChange?.(e.target.value)}
    />
  ),
}));

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
  TooltipTrigger: ({ children }: { children: ReactNode }) => <>{children}</>,
  TooltipContent: () => null,
}));

vi.mock("lottie-react", () => ({
  default: () => <div data-testid="lottie" />,
}));

/** Stub out next/dynamic so GeocodeMapPreview renders a lightweight placeholder. */
vi.mock("next/dynamic", () => ({
  default: () => {
    const Stub = () => <div data-testid="geocode-map-preview-stub" />;
    return Stub;
  },
}));

vi.mock("@/stores/mapStore", () => ({
  useMapStore: (sel: (s: { pinningPatient: null }) => unknown) =>
    sel({ pinningPatient: null }),
}));

vi.mock("@/hooks/useCreatePatient", () => ({
  useCreatePatient: () => ({
    mutateAsync: vi.fn().mockResolvedValue({
      data: { patient: { id: "new-patient-id" } },
    }),
  }),
  useAttachCondition: () => ({
    mutateAsync: vi.fn().mockResolvedValue({}),
  }),
  isCreatePatientError: () => false,
}));

// -----------------------------------------------------------------------
// Imports (after mocks)
// -----------------------------------------------------------------------

import { PatientWizard } from "./PatientWizard";

function Wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

/**
 * Synthetic CNS that passes the Luhn checksum used by isValidCns.
 * LGPD: fictitious — not a real patient identifier.
 */
const VALID_CNS = "100000000000007";

/** Submit the active wizard step (footer button wired via form="wizard-step-form"). */
function submitStep() {
  fireEvent.click(
    document.querySelector('button[form="wizard-step-form"]') as HTMLElement,
  );
}

// -----------------------------------------------------------------------
// Tests
// -----------------------------------------------------------------------

describe("PatientWizard right-click flow", () => {
  it("prefills geocodedCoords from initialCoords: Endereço shows empty rua but manual picker", async () => {
    render(
      <Wrapper>
        <PatientWizard
          open
          mode={{ kind: "new", initialCoords: { lat: -30.09, lng: -51.22 } }}
          onClose={vi.fn()}
        />
      </Wrapper>,
    );

    // Step 1: Identidade — CNS input must be present
    expect(screen.getByTestId("cns-input")).toBeInTheDocument();

    // Fill mandatory Identidade fields and advance
    fireEvent.change(screen.getByTestId("cns-input"), {
      target: { value: VALID_CNS },
    });
    fireEvent.change(screen.getByLabelText("Nome completo"), {
      target: { value: "Maria Silva" },
    });
    submitStep();

    // Step 2: Endereço
    await waitFor(() => {
      expect(screen.getByLabelText("Rua")).toBeInTheDocument();
    });

    // Rua must be empty — right-click sets coords only, not address text
    expect((screen.getByLabelText("Rua") as HTMLInputElement).value).toBe("");

    // Manual picker must be visible because geoResult was seeded as "manual"
    // from ctx.geocodedCoords (right-click path: rua empty, coords set)
    expect(screen.getByTestId("geocode-manual-picker")).toBeInTheDocument();
  });
});
