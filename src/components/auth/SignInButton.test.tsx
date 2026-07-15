/**
 * TDD Red Phase — SignInButton component contract
 *
 * These tests define the expected shape of components/auth/SignInButton.tsx.
 * They will FAIL until the implementation is written.
 *
 * Contracts:
 *  - Component renders a button with PT-BR text "Entrar com Google"
 *  - Clicking the button calls signIn.social({ provider: 'google' })
 *  - Component is a Client Component ('use client')
 *  - Button is accessible (role="button" + descriptive label)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// ---------------------------------------------------------------------------
// Mock better-auth/react — client-side auth hooks
// The real module requires a browser environment and network calls.
// ---------------------------------------------------------------------------

const mockSignInSocial = vi.fn();

vi.mock("better-auth/react", () => ({
  createAuthClient: vi.fn(() => ({
    useSession: vi.fn(() => ({ data: null, isPending: false })),
    signIn: {
      social: mockSignInSocial,
    },
    signOut: vi.fn(),
  })),
}));

// Mock the auth-client barrel so SignInButton imports work
vi.mock("@/lib/auth-client", () => ({
  signIn: {
    social: mockSignInSocial,
  },
  signOut: vi.fn(),
  useSession: vi.fn(() => ({ data: null, isPending: false })),
  authClient: {
    useSession: vi.fn(() => ({ data: null, isPending: false })),
    signIn: { social: mockSignInSocial },
    signOut: vi.fn(),
  },
}));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("SignInButton component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders a button element", async () => {
    const { SignInButton } = await import("@/components/auth/SignInButton");
    render(<SignInButton />);
    expect(screen.getByRole("button")).toBeDefined();
  });

  it("displays the PT-BR sign-in label 'Entrar com Google'", async () => {
    const { SignInButton } = await import("@/components/auth/SignInButton");
    render(<SignInButton />);
    expect(screen.getByText("Entrar com Google")).toBeDefined();
  });

  it("calls signIn.social with provider 'google' when clicked", async () => {
    const { SignInButton } = await import("@/components/auth/SignInButton");
    render(<SignInButton />);

    fireEvent.click(screen.getByRole("button"));

    expect(mockSignInSocial).toHaveBeenCalledTimes(1);
    expect(mockSignInSocial).toHaveBeenCalledWith(
      expect.objectContaining({ provider: "google" })
    );
  });

  it("does not call signIn during render (only on interaction)", async () => {
    const { SignInButton } = await import("@/components/auth/SignInButton");
    render(<SignInButton />);

    // Sign-in must not be triggered by mounting alone
    expect(mockSignInSocial).not.toHaveBeenCalled();
  });

  it("button is not disabled by default", async () => {
    const { SignInButton } = await import("@/components/auth/SignInButton");
    render(<SignInButton />);

    const button = screen.getByRole("button");
    expect((button as HTMLButtonElement).disabled).toBe(false);
  });
});
