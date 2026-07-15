import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/supabase/types";

/**
 * Supabase server client for use in Server Components and Route Handlers.
 *
 * Uses the getAll/setAll cookie adapter — never individual get/set/remove,
 * which break when Supabase chunks cookies across multiple headers.
 *
 * The setAll silently ignores cookie-set failures that occur inside Server
 * Components (which cannot mutate response cookies); proxy.ts handles the
 * session refresh leg that actually needs to set cookies.
 *
 * Supabase is a CACHE layer only. Never write patient names, CNS, addresses,
 * or health conditions to Supabase tables.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
