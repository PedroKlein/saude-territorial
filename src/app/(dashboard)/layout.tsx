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
    <div>
      <header>
        <h1>Saúde Territorial</h1>
      </header>
      <main>{children}</main>
    </div>
  );
}
