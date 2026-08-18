/**
 * CredentialsForm — email/password login contract.
 *
 * Verifies the form calls Better Auth's email sign-in with the entered
 * credentials, switches to sign-up mode, and surfaces server errors inline.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const { mockSignInEmail, mockSignUpEmail } = vi.hoisted(() => ({
  mockSignInEmail: vi.fn(),
  mockSignUpEmail: vi.fn(),
}));

vi.mock("@/lib/auth-client", () => ({
  signIn: { email: mockSignInEmail },
  signUp: { email: mockSignUpEmail },
  signOut: vi.fn(),
  useSession: vi.fn(() => ({ data: null, isPending: false })),
}));

import { CredentialsForm } from "@/components/auth/CredentialsForm";

describe("CredentialsForm", () => {
  beforeEach(() => {
    mockSignInEmail.mockReset();
    mockSignUpEmail.mockReset();
  });

  it("signs in with the entered email and password", async () => {
    mockSignInEmail.mockResolvedValue({ data: {}, error: null });
    render(<CredentialsForm />);

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "dev@local" } });
    fireEvent.change(screen.getByLabelText("Senha"), { target: { value: "dev12345" } });
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));

    await waitFor(() => {
      expect(mockSignInEmail).toHaveBeenCalledWith({
        email: "dev@local",
        password: "dev12345",
      });
    });
    expect(mockSignUpEmail).not.toHaveBeenCalled();
  });

  it("toggles to sign-up mode and registers", async () => {
    mockSignUpEmail.mockResolvedValue({ data: {}, error: null });
    render(<CredentialsForm />);

    fireEvent.click(screen.getByRole("button", { name: "Criar uma conta" }));
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "new@local" } });
    fireEvent.change(screen.getByLabelText("Senha"), { target: { value: "secret123" } });
    fireEvent.click(screen.getByRole("button", { name: "Criar conta" }));

    await waitFor(() => {
      expect(mockSignUpEmail).toHaveBeenCalledWith({
        email: "new@local",
        password: "secret123",
        name: "new@local",
      });
    });
  });

  it("surfaces a server error without navigating", async () => {
    mockSignInEmail.mockResolvedValue({ error: { message: "Credenciais inválidas" } });
    render(<CredentialsForm />);

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "x@local" } });
    fireEvent.change(screen.getByLabelText("Senha"), { target: { value: "wrong" } });
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));

    expect(await screen.findByText("Credenciais inválidas")).toBeInTheDocument();
  });
});
