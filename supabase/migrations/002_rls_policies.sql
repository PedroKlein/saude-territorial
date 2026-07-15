-- Migration: 002_rls_policies
-- Row Level Security policies for all cache tables.
--
-- Design principles:
--  - coordinates_cache: shared read/write for all authenticated users
--    (geocoded coords have no PII value alone; sharing avoids duplicate geocoding)
--  - All other tables: users can only access their own rows (user_id = auth.uid())

-- ─────────────────────────────────────────────────────────────────────────────
-- Enable RLS on all tables
-- ─────────────────────────────────────────────────────────────────────────────
alter table coordinates_cache   enable row level security;
alter table sync_metadata       enable row level security;
alter table user_preferences    enable row level security;
alter table manual_pins         enable row level security;

-- ─────────────────────────────────────────────────────────────────────────────
-- coordinates_cache policies
-- All authenticated users can read and insert.
-- Updates and deletes are intentionally blocked to keep the cache append-only;
-- address changes trigger delete-then-insert via the geocoding invalidation flow.
-- ─────────────────────────────────────────────────────────────────────────────
create policy "coordinates_cache_select"
  on coordinates_cache
  for select
  to authenticated
  using (true);

create policy "coordinates_cache_insert"
  on coordinates_cache
  for insert
  to authenticated
  with check (true);

-- UPDATE is blocked: use delete + insert for cache invalidation.
-- DELETE is handled explicitly by the geocoding layer (not a blanket policy).

-- ─────────────────────────────────────────────────────────────────────────────
-- sync_metadata policies
-- Each user can only read/write their own sync records.
-- ─────────────────────────────────────────────────────────────────────────────
create policy "sync_metadata_select"
  on sync_metadata
  for select
  to authenticated
  using (user_id = auth.uid());

create policy "sync_metadata_insert"
  on sync_metadata
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "sync_metadata_update"
  on sync_metadata
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "sync_metadata_delete"
  on sync_metadata
  for delete
  to authenticated
  using (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────────
-- user_preferences policies
-- Each user can only read/write their own preference row.
-- ─────────────────────────────────────────────────────────────────────────────
create policy "user_preferences_select"
  on user_preferences
  for select
  to authenticated
  using (user_id = auth.uid());

create policy "user_preferences_insert"
  on user_preferences
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "user_preferences_update"
  on user_preferences
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "user_preferences_delete"
  on user_preferences
  for delete
  to authenticated
  using (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────────
-- manual_pins policies
-- Each user can only read/write their own pins.
-- ─────────────────────────────────────────────────────────────────────────────
create policy "manual_pins_select"
  on manual_pins
  for select
  to authenticated
  using (user_id = auth.uid());

create policy "manual_pins_insert"
  on manual_pins
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "manual_pins_update"
  on manual_pins
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "manual_pins_delete"
  on manual_pins
  for delete
  to authenticated
  using (user_id = auth.uid());
