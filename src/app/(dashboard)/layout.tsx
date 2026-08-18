import Link from "next/link";
import { Users, Stethoscope } from "lucide-react";
import { Providers } from "./providers";
import { AddPatientButton } from "@/components/panels/AddPatientButton";

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
            <Link href="/map" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <div className="flex size-8 items-center justify-center rounded-lg bg-brand text-white">
                <Stethoscope className="size-4" />
              </div>
              <h1 className="text-xl font-bold text-primary">Saúde Territorial</h1>
            </Link>
            <nav className="flex items-center gap-4">
              <AddPatientButton />
              <Link
                href="/pacientes"
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary"
              >
                <Users className="size-4" /> Pacientes
              </Link>
              <Link
                href="/map"
                className="text-sm text-muted-foreground hover:text-primary"
              >
                Mapa
              </Link>
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
