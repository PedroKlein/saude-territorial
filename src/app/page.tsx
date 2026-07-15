import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-4xl font-bold text-primary">Saúde Territorial</h1>
      <p className="max-w-prose text-center text-lg text-muted-foreground">
        Plataforma de monitoramento georreferenciado para equipes de Atenção
        Primária à Saúde — GAT 4, US Moab Caldas, Porto Alegre.
      </p>
      <nav className="mt-4 flex flex-col items-center gap-3">
        <Link
          href="/map"
          className="rounded-md bg-primary px-6 py-2 text-sm font-medium text-white hover:bg-primary/90"
        >
          Acessar Mapa
        </Link>
        <Link
          href="/login"
          className="text-sm text-muted-foreground underline hover:text-primary"
        >
          Entrar com Google
        </Link>
        <Link
          href="/settings"
          className="text-sm text-muted-foreground underline hover:text-primary"
        >
          Configurações
        </Link>
      </nav>
    </main>
  );
}
