"use client";

import { signIn } from "@/lib/auth-client";

export function SignInButton() {
  return (
    <button
      type="button"
      onClick={() => signIn.social({ provider: "google" })}
    >
      Entrar com Google
    </button>
  );
}
