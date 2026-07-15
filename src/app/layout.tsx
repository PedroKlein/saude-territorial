import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Saúde Territorial",
  description:
    "Plataforma de monitoramento georreferenciado em saúde para equipes de Atenção Primária à Saúde em Porto Alegre.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
