/**
 * PatientDetailPanel — smoke tests (UP-2.2/2.3/2.4)
 *
 * Covers:
 *  1. Returns null when selectedPatient is null
 *  2. Renders identity block + one card per non-null extension
 *  3. Patient with gestante + has renders exactly 2 cards
 *  4. Clicking "Editar" flips to edit mode (inputs appear)
 *  5. Clicking "Remover condição" opens the confirm dialog
 *
 * LGPD: test fixtures use fictitious data; no real patient info in logs.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

// ---------------------------------------------------------------------------
// Module mocks — must be hoisted before imports
// ---------------------------------------------------------------------------

const mocks = vi.hoisted(() => ({
  selectedPatient: null as string | null,
  setSelectedPatient: vi.fn(),
  usePatient: vi.fn(),
  deletePatient: { mutateAsync: vi.fn(), isPending: false },
  deleteCondition: { mutateAsync: vi.fn(), isPending: false },
  updatePatient: { mutateAsync: vi.fn(), isPending: false },
}));

vi.mock("@/stores/mapStore", () => ({
  useMapStore: (sel: (s: {
    selectedPatient: string | null;
    setSelectedPatient: typeof mocks.setSelectedPatient;
  }) => unknown) =>
    sel({
      selectedPatient: mocks.selectedPatient,
      setSelectedPatient: mocks.setSelectedPatient,
    }),
}));

vi.mock("@/hooks/usePatient", () => ({
  usePatient: (id: string | null) => mocks.usePatient(id),
}));

vi.mock("@/hooks/useDeletePatient", () => ({
  useDeletePatient: () => mocks.deletePatient,
  useDeleteCondition: () => mocks.deleteCondition,
}));

vi.mock("@/hooks/useUpdatePatient", () => ({
  useUpdatePatient: () => mocks.updatePatient,
}));

// Panel transitively imports PatientWizard → StepSucesso → lottie-react.
// JSDOM has no canvas, so stub Lottie out for this file too.
vi.mock("lottie-react", () => ({ default: () => null }));

// StepEndereco lazy-loads a react-leaflet MapContainer via next/dynamic.
// Return a no-op so the wizard import chain doesn't try to render Leaflet.
vi.mock("next/dynamic", () => ({
  default: () => (() => null) as unknown,
}));

// Stub motion/react so animations don't affect test output
vi.mock("motion/react", () => ({
  AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, ...props }: React.ComponentProps<"div">) => (
      <div {...props}>{children}</div>
    ),
  },
}));

// Stub lottie-react — lottie-web crashes in JSDOM (no HTMLCanvasElement.getContext).
// PatientDetailPanel now transitively imports lottie-react via PatientWizard → StepSucesso.
vi.mock("lottie-react", () => ({
  default: () => null,
}));

// Stub PatientWizard so the panel tests stay focused on the panel itself.
vi.mock("@/components/wizard/PatientWizard", () => ({
  PatientWizard: () => null,
}));

// Stub Radix dropdown-menu so content renders inline (no portal in JSDOM)
vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: ReactNode }) => <>{children}</>,
  DropdownMenuTrigger: ({ children }: { children: ReactNode }) => <>{children}</>,
  DropdownMenuContent: ({ children }: { children: ReactNode }) => (
    <div data-testid="dropdown-content">{children}</div>
  ),
  DropdownMenuItem: ({
    children,
    onClick,
    className,
  }: {
    children: ReactNode;
    onClick?: () => void;
    className?: string;
  }) => (
    <button type="button" onClick={onClick} className={className}>
      {children}
    </button>
  ),
}));

// ---------------------------------------------------------------------------
// Import component under test (after mocks)
// ---------------------------------------------------------------------------

import { PatientDetailPanel } from "./PatientDetailPanel";
import type { UnifiedPatient } from "@/app/api/patients/[id]/route";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

function Wrapper({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={createQueryClient()}>
      {children}
    </QueryClientProvider>
  );
}

/** Minimal UnifiedPatient fixture. LGPD: fictitious data. */
const BASE_PATIENT: UnifiedPatient = {
  id: "test-patient-uuid-001",
  cns: "111222333444555",
  nomeCompleto: "Paciente Sintético Teste",
  dataNascimento: "15/03/1990",
  idade: 34,
  telefone: "51999990000",
  rua: "Rua das Flores",
  numero: "42",
  complemento: null,
  bairro: "Jardim",
  cep: null,
  microarea: "MA1",
  lat: -30.034,
  lng: -51.217,
  geocodeStatus: "geocoded",
  geocodeReference: null,
  vulnerabilidades: null,
  updatedAt: "01/08/2026",
  gestante: null,
  tuberculose: null,
  has: null,
};

const GESTANTE_CONDITION: Record<string, unknown> = {
  dum: "01/01/2026",
  dpp: "07/10/2026",
  risco: "habitual",
  ig: 30,
  igAbertura: null,
  dataUltimaConsulta: "01/07/2026",
  dataProximaConsulta: "01/08/2026",
  numeroConsultas: 6,
  pressaoArterial: "120/80",
  vacinaDtpa: "sim",
  hasPreviaTag: null,
  diabetesPreviaTag: null,
  updatedAt: "01/08/2026",
};

const HAS_CONDITION: Record<string, unknown> = {
  dataUltimaConsulta: "01/06/2026",
  dataProximaConsulta: "01/09/2026",
  dataUltimaAfericaoPa: "01/07/2026",
  pressaoArterial: "140/90",
  registroNotas: null,
  encaminhamentos: null,
  updatedAt: "01/08/2026",
};

// ---------------------------------------------------------------------------
// Test setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  mocks.selectedPatient = null;
  mocks.setSelectedPatient.mockReset();
  mocks.usePatient.mockReset();
  mocks.deletePatient.mutateAsync.mockReset();
  mocks.deleteCondition.mutateAsync.mockReset();
  mocks.updatePatient.mutateAsync.mockReset();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("PatientDetailPanel", () => {
  it("renders nothing when selectedPatient is null", () => {
    mocks.selectedPatient = null;
    const { container } = render(<PatientDetailPanel />, { wrapper: Wrapper });
    expect(container.firstChild).toBeNull();
  });

  it("shows loading skeleton while usePatient is loading", () => {
    mocks.selectedPatient = "test-patient-uuid-001";
    mocks.usePatient.mockReturnValue({ data: undefined, isLoading: true, isError: false, refetch: vi.fn() });

    render(<PatientDetailPanel />, { wrapper: Wrapper });

    // Skeleton has no patient name
    expect(screen.queryByText("Paciente Sintético Teste")).not.toBeInTheDocument();
  });

  it("shows error state when usePatient errors", () => {
    mocks.selectedPatient = "test-patient-uuid-001";
    mocks.usePatient.mockReturnValue({ data: undefined, isLoading: false, isError: true, refetch: vi.fn() });

    render(<PatientDetailPanel />, { wrapper: Wrapper });

    expect(screen.getByText(/Tentar novamente/i)).toBeInTheDocument();
  });

  it("renders identity block with patient name and CNS when patient loads", () => {
    mocks.selectedPatient = "test-patient-uuid-001";
    mocks.usePatient.mockReturnValue({
      data: BASE_PATIENT,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    render(<PatientDetailPanel />, { wrapper: Wrapper });

    expect(screen.getByText("Paciente Sintético Teste")).toBeInTheDocument();
    expect(screen.getByText("111222333444555")).toBeInTheDocument();
  });

  it("renders no condition cards when patient has no conditions", () => {
    mocks.selectedPatient = "test-patient-uuid-001";
    mocks.usePatient.mockReturnValue({
      data: BASE_PATIENT,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    render(<PatientDetailPanel />, { wrapper: Wrapper });

    expect(screen.queryByText("Gestante")).not.toBeInTheDocument();
    expect(screen.queryByText("Tuberculose")).not.toBeInTheDocument();
    expect(screen.queryByText("HAS — Hipertensão")).not.toBeInTheDocument();
  });

  it("renders one card per non-null extension", () => {
    mocks.selectedPatient = "test-patient-uuid-001";
    mocks.usePatient.mockReturnValue({
      data: { ...BASE_PATIENT, gestante: GESTANTE_CONDITION },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    render(<PatientDetailPanel />, { wrapper: Wrapper });

    expect(screen.getByText("Gestante")).toBeInTheDocument();
    expect(screen.queryByText("Tuberculose")).not.toBeInTheDocument();
    expect(screen.queryByText("HAS — Hipertensão")).not.toBeInTheDocument();
  });

  it("renders exactly 2 cards for patient with gestante + has", () => {
    mocks.selectedPatient = "test-patient-uuid-001";
    mocks.usePatient.mockReturnValue({
      data: {
        ...BASE_PATIENT,
        gestante: GESTANTE_CONDITION,
        has: HAS_CONDITION,
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    render(<PatientDetailPanel />, { wrapper: Wrapper });

    expect(screen.getByText("Gestante")).toBeInTheDocument();
    expect(screen.getByText("HAS — Hipertensão")).toBeInTheDocument();
    expect(screen.queryByText("Tuberculose")).not.toBeInTheDocument();
  });

  it("clicking Editar flips panel into edit mode (inputs appear)", async () => {
    mocks.selectedPatient = "test-patient-uuid-001";
    mocks.usePatient.mockReturnValue({
      data: BASE_PATIENT,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    render(<PatientDetailPanel />, { wrapper: Wrapper });

    // Find and click the edit pencil icon button
    const editBtn = screen.getByLabelText("Editar paciente");
    fireEvent.click(editBtn);

    await waitFor(() => {
      // In edit mode, the header shows "Editar paciente"
      expect(screen.getByText("Editar paciente")).toBeInTheDocument();
      // The Name field becomes an input
      expect(screen.getByLabelText("Nome completo")).toBeInTheDocument();
    });
  });

  it("clicking 'Remover condição' opens the confirm dialog", async () => {
    mocks.selectedPatient = "test-patient-uuid-001";
    mocks.usePatient.mockReturnValue({
      data: { ...BASE_PATIENT, gestante: GESTANTE_CONDITION },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    render(<PatientDetailPanel />, { wrapper: Wrapper });

    // With the inlined dropdown mock, "Remover condição" button is always in the DOM
    const removeButtons = screen.getAllByText(/Remover condição/i);
    // Click the first one — the dropdown item button
    fireEvent.click(removeButtons[0]);

    await waitFor(() => {
      // The ConfirmDialog body text appears after clicking
      expect(
        screen.getByText(/Os demais dados permanecem/i),
      ).toBeInTheDocument();
      // The confirm action button
      expect(screen.getByText("Remover")).toBeInTheDocument();
    });
  });

  it("Excluir paciente button opens patient delete confirm dialog", async () => {
    mocks.selectedPatient = "test-patient-uuid-001";
    mocks.usePatient.mockReturnValue({
      data: BASE_PATIENT,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    render(<PatientDetailPanel />, { wrapper: Wrapper });

    const deleteBtn = screen.getByText("Excluir");
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(screen.getByText("Excluir paciente")).toBeInTheDocument();
    });
  });
});
