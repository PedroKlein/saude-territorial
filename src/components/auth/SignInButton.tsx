"use client";

import { signIn } from "@/lib/auth-client";

/**
 * Sign-in button that honors a `?redirect=` query param. When the 401
 * interceptor in `Providers` bounces an authenticated user here mid-session,
 * that param carries the original path so we can send them back after
 * a successful re-login instead of dumping them on /map.
 */
export function SignInButton() {
  return (
    <button
      type="button"
      className="cursor-pointer rounded-md bg-primary px-6 py-3 text-white font-medium hover:bg-primary-light hover:shadow-md active:scale-[0.98] transition-all"
      onClick={() => {
        // Read redirect at click time — avoids useSearchParams' Suspense
        // requirement and works uniformly under Vitest jsdom.
        const params = new URLSearchParams(window.location.search);
        const redirect = params.get("redirect");
        // Same-origin allow-list: reject protocol-relative URLs and anything
        // that isn't an in-app path starting with a single "/".
        const callbackURL =
          redirect && redirect.startsWith("/") && !redirect.startsWith("//")
            ? redirect
            : "/map";
        void signIn.social({ provider: "google", callbackURL });
      }}
    >
      Entrar com Google
    </button>
  );
}
