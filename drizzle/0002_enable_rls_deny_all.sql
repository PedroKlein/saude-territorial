-- 0002_enable_rls_deny_all
--
-- SPEC LOCKED #10 says "No RLS in MVP; compensating session gates in every
-- route." That is true for the Next.js layer, but Supabase auto-exposes every
-- public table via its PostgREST endpoint at `/rest/v1/<table>` using the
-- `anon` role — anyone with `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (which
-- ships in the browser bundle by design) can hit it directly and bypass the
-- Next.js session gate entirely.
--
-- Enabling RLS with no policies establishes default-deny for `anon` and
-- `authenticated`. Our Drizzle client connects as `postgres`
-- (`rolbypassrls = true`) so server-side reads keep working. Admin scripts
-- via `service_role` also bypass. This is Option B from
-- `plans/pivot-execution.md#pe-2` — the "RLS without policies" mitigation
-- that preserves LOCKED #10 (no policy complexity) while closing the
-- PostgREST hole.
--
-- Verification after apply:
--   curl -H "apikey: <anon>" -H "Authorization: Bearer <anon>" \
--     "https://<ref>.supabase.co/rest/v1/patients?limit=3"
--   → HTTP 200, body: []
--
--   pnpm dev → sign in → /api/patients → HTTP 200 with all rows (Drizzle
--   uses the postgres role which bypasses RLS).
--
-- Future work (post-MVP): when the pilot expands to multiple teams, add
-- named policies restricting per-team visibility. Do NOT drop these
-- `ENABLE ROW LEVEL SECURITY` statements — add policies on top.

ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.gestantes_data ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.tuberculose_data ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.tuberculose_consultas ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.has_data ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.geocode_cache ENABLE ROW LEVEL SECURITY;
