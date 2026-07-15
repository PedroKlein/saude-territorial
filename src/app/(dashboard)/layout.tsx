import Link from "next/link";
import { Providers } from "./providers";

/**
 * Layout do painel principal (dashboard).
 * Envolve todas as páginas autenticadas com cabeçalho e área de conteúdo.
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Providers>
      <div className="flex h-screen flex-col bg-gray-50">
        <header className="shrink-0 border-b bg-white px-6 py-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-primary">Saúde Territorial</h1>
            <nav className="flex items-center gap-4">
              <Link
                href="/settings"
                className="text-sm text-muted-foreground hover:text-primary"
              >
                Configurações
              </Link>
            </nav>
          </div>
        </header>
        <main className="relative flex-1 overflow-hidden">{children}</main>
      </div>
    </Providers>
  );
}
