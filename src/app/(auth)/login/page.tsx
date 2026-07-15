import { SignInButton } from "@/components/auth/SignInButton";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-2xl font-bold">Saúde Territorial</h1>
      <p className="text-muted-foreground text-sm">
        Acesse com sua conta Google para continuar
      </p>
      <SignInButton />
    </main>
  );
}
