"use client";

import { useSession, signOut } from "@/lib/auth-client";

export function UserMenu() {
  const { data: session, isPending } = useSession();

  if (isPending || !session) return null;

  const user = session.user;

  return (
    <div className="flex items-center gap-2">
      {user.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={user.image}
          alt={user.name ?? "Usuário"}
          className="h-8 w-8 rounded-full"
          referrerPolicy="no-referrer"
        />
      ) : (
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
          {user.name?.charAt(0).toUpperCase() ?? "U"}
        </div>
      )}
      <button
        type="button"
        className="text-sm text-muted-foreground hover:text-foreground"
        onClick={() => signOut()}
      >
        Sair
      </button>
    </div>
  );
}
