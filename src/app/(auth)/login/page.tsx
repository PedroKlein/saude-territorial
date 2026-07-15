import { SignInButton } from "@/components/auth/SignInButton";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-8">
      <div className="w-full max-w-sm rounded-lg border bg-white p-8 shadow-sm text-center">
        <h1 className="text-2xl font-bold text-primary">Saúde Territorial</h1>
        <p className="mt-2 text-sm text-gray-500">
          Monitoramento georeferenciado para equipes de Atenção Primária
        </p>
        <div className="mt-6">
          <SignInButton />
        </div>
      </div>
    </main>
  );
}
