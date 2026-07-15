"use client";

import { signIn } from "@/lib/auth-client";

export function SignInButton() {
  return (
    <button
      type="button"
      className="rounded-md bg-primary px-6 py-3 text-white font-medium hover:bg-primary-light transition-colors"
      onClick={() => signIn.social({ provider: "google" })}
    >
      Entrar com Google
    </button>
  );
}
