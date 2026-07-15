"use client";

import { signIn } from "@/lib/auth-client";

export function SignInButton() {
  return (
    <button
      type="button"
      className="cursor-pointer rounded-md bg-primary px-6 py-3 text-white font-medium hover:bg-primary-light hover:shadow-md active:scale-[0.98] transition-all"
      onClick={() => signIn.social({ provider: "google" })}
    >
      Entrar com Google
    </button>
  );
}
