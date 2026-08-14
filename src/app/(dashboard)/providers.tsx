"use client";

import {
  MutationCache,
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

/**
 * Extracts an HTTP status from an error thrown by fetch-based query/mutation fns.
 *
 * Hooks in this repo don't share a single Error subclass:
 * - `useUpdatePatient` / `useCreatePatient` / `useDeletePatient` attach
 *   `.status` directly to the Error instance.
 * - `usePatient` / `usePatientData` throw plain Errors whose message contains
 *   the numeric status (`HTTP 401`, `Falha ao carregar dados: 401`).
 *
 * We accept both rather than forcing a codebase-wide error subclass rename.
 */
function extractStatus(err: unknown): number | undefined {
  if (err && typeof err === "object" && "status" in err) {
    const raw = (err as { status?: unknown }).status;
    if (typeof raw === "number") return raw;
  }
  if (err instanceof Error) {
    const m = /\b(\d{3})\b/.exec(err.message);
    if (m) return Number(m[1]);
  }
  return undefined;
}

/**
 * Guard against multiple concurrent 401s all triggering their own redirect.
 * Both the query and mutation caches fire `onError`, and TanStack Query
 * retries queries once by default — a stale-session refresh could easily
 * produce three 401s in flight.
 */
let isRedirectingToLogin = false;

function handleAuthError(err: unknown): void {
  if (typeof window === "undefined") return;
  if (isRedirectingToLogin) return;
  if (extractStatus(err) !== 401) return;

  // Never loop on the login page itself.
  if (window.location.pathname === "/login") return;

  isRedirectingToLogin = true;
  const redirect = encodeURIComponent(
    window.location.pathname + window.location.search,
  );
  // Full navigation on purpose: the auth cookie just went invalid; clearing
  // in-memory query state and mounted components via a fresh document load
  // is exactly the goal. router.push() would keep the QueryClient alive
  // with stale requests in flight and can't be called from a non-hook.
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  window.location.assign(`/login?redirect=${redirect}`);
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000,
            refetchOnWindowFocus: false,
          },
        },
        queryCache: new QueryCache({ onError: handleAuthError }),
        mutationCache: new MutationCache({ onError: handleAuthError }),
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
