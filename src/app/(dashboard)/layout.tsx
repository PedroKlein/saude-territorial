import Link from "next/link";
import { Settings, Stethoscope } from "lucide-react";

import { Providers } from "./providers";
import { DashboardNav } from "@/components/navigation/DashboardNav";
import { AddPatientButton } from "@/components/panels/AddPatientButton";
import { Button } from "@/components/ui/button";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Providers>
      <div className="flex h-screen flex-col bg-background">
        <header className="z-50 shrink-0 border-b bg-card shadow-xs">
          <div className="mx-auto grid w-full max-w-7xl grid-cols-[1fr_auto] items-center gap-x-3 gap-y-3 px-4 py-3 sm:grid-cols-[1fr_auto_1fr] sm:px-6">
            <Link
              href="/"
              className="flex min-w-0 items-center gap-2 transition-opacity hover:opacity-80"
            >
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand text-primary-foreground">
                <Stethoscope className="size-4" aria-hidden="true" />
              </div>
              <span className="truncate text-base font-semibold tracking-tight text-foreground sm:text-lg">
                Saúde Territorial
              </span>
            </Link>

            <div className="col-span-2 row-start-2 sm:col-span-1 sm:col-start-2 sm:row-start-1">
              <DashboardNav />
            </div>

            <div className="col-start-2 row-start-1 flex items-center justify-self-end gap-2 sm:col-start-3">
              <AddPatientButton compactOnMobile />
              <Button asChild variant="secondary" size="icon" className="rounded-full">
                <Link href="/settings" aria-label="Configurações">
                  <Settings aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </div>
        </header>
        <main className="relative min-h-0 flex-1 overflow-hidden">{children}</main>
      </div>
    </Providers>
  );
}
