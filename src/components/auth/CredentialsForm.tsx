"use client";

import { useState } from "react";

import { signIn, signUp } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Email/password sign-in form — the default local-first auth path (no external
 * identity provider required). `mise run setup` seeds a dev user; its
 * credentials are shown as placeholders below.
 *
 * A "criar conta" toggle lets a fresh local instance register its first users
 * without any seeding.
 */
export function CredentialsForm() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function resolveCallback(): string {
    const redirect = new URLSearchParams(window.location.search).get("redirect");
    // Same-origin allow-list: reject protocol-relative and non-path values.
    return redirect && redirect.startsWith("/") && !redirect.startsWith("//")
      ? redirect
      : "/map";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const callbackURL = resolveCallback();

    const result =
      mode === "signup"
        ? await signUp.email({ email, password, name: name || email })
        : await signIn.email({ email, password });

    setPending(false);

    if (result.error) {
      setError(result.error.message ?? "Não foi possível entrar. Verifique os dados.");
      return;
    }
    window.location.assign(callbackURL);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-left">
      {mode === "signup" && (
        <div className="space-y-1.5">
          <Label htmlFor="name">Nome</Label>
          <Input
            id="name"
            type="text"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Seu nome"
          />
        </div>
      )}
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="dev@local.dev"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">Senha</Label>
        <Input
          id="password"
          type="password"
          required
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={mode === "signup" ? "mínimo 8 caracteres" : "dev12345"}
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "..." : mode === "signup" ? "Criar conta" : "Entrar"}
      </Button>

      <button
        type="button"
        className="w-full cursor-pointer text-center text-sm text-gray-500 hover:text-gray-700"
        onClick={() => {
          setError(null);
          setMode(mode === "signin" ? "signup" : "signin");
        }}
      >
        {mode === "signin" ? "Criar uma conta" : "Já tenho uma conta"}
      </button>
    </form>
  );
}
