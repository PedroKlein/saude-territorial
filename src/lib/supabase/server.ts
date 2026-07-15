import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/supabase/types";

/**
 * Supabase server client for use in Server Components and Route Handlers.
 *
 * Uses the secret key (SUPABASE_SECRET_KEY) for server-side operations
 * which bypasses RLS — appropriate for cache writes and internal operations.
 * Falls back to publishable key if secret is not available.
 *
 * Supabase is a CACHE layer only. Never write patient names, CNS, addresses,
 * or health conditions to Supabase tables.
 */
export async function createClient() {
  const cookieStore = await cookies();

  const supabaseKey =
    process.env.SUPABASE_SECRET_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Components cannot set cookies.
            // proxy.ts handles session refresh — this is safe to ignore here.
          }
        },
      },
    }
  );
}
