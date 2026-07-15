import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/supabase/types";

/**
 * Supabase browser client for use in Client Components.
 *
 * Creates a new client on every call — do NOT hoist this to module scope in
 * App Router; each render context should get a fresh instance.
 *
 * Supabase is a CACHE layer only. Never write patient names, CNS, addresses,
 * or health conditions to Supabase tables.
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
