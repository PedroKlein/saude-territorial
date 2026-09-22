"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const items = [
  { href: "/", label: "Visão geral" },
  { href: "/map", label: "Mapa" },
  { href: "/pacientes", label: "Pacientes" },
] as const;

export function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Navegação principal" className="flex items-center justify-center gap-5 sm:gap-7">
      {items.map(({ href, label }) => {
        const active = href === "/" ? pathname === href : pathname.startsWith(href);

        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "border-b-2 border-transparent py-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
              active && "border-brand text-brand",
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
