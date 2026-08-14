/**
 * SignInButton — Client Component contract.
 *
 * Verifies the OAuth button renders correctly, calls Better Auth on click,
 * and forwards a same-origin `?redirect` param as the OAuth callbackURL so
 * the 401 interceptor in Providers can round-trip the user back to their
 * original page after re-login.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// ---------------------------------------------------------------------------
// Mocks — better-auth/react needs a browser env; the auth-client barrel
// wraps it. We stub both so no network / cookie machinery boots.
// ---------------------------------------------------------------------------

// vi.mock factories are hoisted above module-level lets, so the mock ref
// must be hoisted too. vi.hoisted() is the sanctioned way in Vitest 3+.
const { mockSignInSocial } = vi.hoisted(() => ({
  mockSignInSocial: vi.fn(),
}));

vi.mock("better-auth/react", () => ({
  createAuthClient: vi.fn(() => ({
    useSession: vi.fn(() => ({ data: null, isPending: false })),
    signIn: { social: mockSignInSocial },
    signOut: vi.fn(),
  })),
}));

vi.mock("@/lib/auth-client", () => ({
  signIn: { social: mockSignInSocial },
  signOut: vi.fn(),
  useSession: vi.fn(() => ({ data: null, isPending: false })),
  authClient: {
    useSession: vi.fn(() => ({ data: null, isPending: false })),
    signIn: { social: mockSignInSocial },
    signOut: vi.fn(),
  },
}));

// vi.mock hoists to the top of the file, so this static import resolves
// against the mocks above, not the real modules.
import { SignInButton } from "@/components/auth/SignInButton";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Temporarily override `window.location`, restoring after the callback. */
function withLocation(href: string, run: () => void): void {
  const original = window.location;
  Object.defineProperty(window, "location", {
    configurable: true,
    writable: true,
    value: new URL(href) as unknown as Location,
  });
  try {
    run();
  } finally {
    Object.defineProperty(window, "location", {
      configurable: true,
      writable: true,
      value: original,
    });
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("SignInButton component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders a button element", () => {
    render(<SignInButton />);
    expect(screen.getByRole("button")).toBeDefined();
  });

  it("displays the PT-BR sign-in label 'Entrar com Google'", () => {
    render(<SignInButton />);
    expect(screen.getByText("Entrar com Google")).toBeDefined();
  });

  it("calls signIn.social with provider 'google' when clicked", () => {
    render(<SignInButton />);
    fireEvent.click(screen.getByRole("button"));
    expect(mockSignInSocial).toHaveBeenCalledTimes(1);
    expect(mockSignInSocial).toHaveBeenCalledWith(
      expect.objectContaining({ provider: "google" }),
    );
  });

  it("does not call signIn during render (only on interaction)", () => {
    render(<SignInButton />);
    expect(mockSignInSocial).not.toHaveBeenCalled();
  });

  it("button is not disabled by default", () => {
    render(<SignInButton />);
    const button = screen.getByRole("button");
    expect((button as HTMLButtonElement).disabled).toBe(false);
  });

  it("passes ?redirect path as callbackURL for same-origin returns", () => {
    withLocation("http://localhost/login?redirect=%2Fmap%3Fpatient%3Dabc", () => {
      render(<SignInButton />);
      fireEvent.click(screen.getByRole("button"));
      expect(mockSignInSocial).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: "google",
          callbackURL: "/map?patient=abc",
        }),
      );
    });
  });

  it("rejects protocol-relative redirect (open-redirect defense)", () => {
    withLocation("http://localhost/login?redirect=%2F%2Fevil.example.com", () => {
      render(<SignInButton />);
      fireEvent.click(screen.getByRole("button"));
      expect(mockSignInSocial).toHaveBeenCalledWith(
        expect.objectContaining({ callbackURL: "/map" }),
      );
    });
  });

  it("falls back to /map when no ?redirect is present", () => {
    withLocation("http://localhost/login", () => {
      render(<SignInButton />);
      fireEvent.click(screen.getByRole("button"));
      expect(mockSignInSocial).toHaveBeenCalledWith(
        expect.objectContaining({ callbackURL: "/map" }),
      );
    });
  });
});
