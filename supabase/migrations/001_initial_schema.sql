-- Migration: 001_initial_schema
-- Supabase cache layer schema for saude-territorial.
--
-- This schema stores ONLY derived/cached data.
-- Patient names, CNS, health conditions, and raw sheet data are NEVER stored here.
-- Source of truth for patient data is Google Sheets.

-- ─────────────────────────────────────────────────────────────────────────────
-- coordinates_cache
-- Maps a normalised address hash to geocoded lat/lng coordinates.
-- Shared across all authenticated users (no user_id column).
-- Invalidated by the geocoding layer when an address field changes in Sheets.
-- ─────────────────────────────────────────────────────────────────────────────
create table coordinates_cache (
  id            uuid         primary key default gen_random_uuid(),
  address_hash  text         unique not null,  -- SHA-256 of normalised address string
  lat           float8       not null,
  lng           float8       not null,
  confidence    float4       not null default 0,
  raw_address   text         not null,
  created_at    timestamptz  not null default now(),
  updated_at    timestamptz  not null default now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- sync_metadata
-- Tracks the last successful sync per (user, spreadsheet, tab) triple.
-- Allows progressive load: the client shows cached data while fresh Sheets
-- data loads in the background.
-- ─────────────────────────────────────────────────────────────────────────────
create table sync_metadata (
  id              uuid         primary key default gen_random_uuid(),
  user_id         uuid         not null,
  spreadsheet_id  text         not null,
  tab_name        text         not null,
  last_synced_at  timestamptz  not null default now(),
  row_count       int          not null default 0,
  status          text         not null default 'ok',  -- 'ok' | 'error' | 'syncing'
  unique (user_id, spreadsheet_id, tab_name)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- user_preferences
-- Stores per-user app preferences: default layers, last map position, etc.
-- One row per user (unique user_id).
-- ─────────────────────────────────────────────────────────────────────────────
create table user_preferences (
  id              uuid         primary key default gen_random_uuid(),
  user_id         uuid         unique not null,
  spreadsheet_id  text,
  active_layers   jsonb,        -- string array of layer ids the user had enabled
  map_center      jsonb,        -- { lat: number, lng: number }
  map_zoom        int,
  created_at      timestamptz  not null default now(),
  updated_at      timestamptz  not null default now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- manual_pins
-- User-supplied coordinate corrections for patients whose address could not be
-- automatically geocoded. Stores CNS (patient identifier) + coordinates only —
-- no names, no health data.
-- ─────────────────────────────────────────────────────────────────────────────
create table manual_pins (
  id              uuid         primary key default gen_random_uuid(),
  user_id         uuid         not null,
  patient_cns     text         not null,   -- CNS is the minimal identifier needed
  lat             float8       not null,
  lng             float8       not null,
  reference_text  text,                    -- Optional landmark note (street corner, etc.)
  created_at      timestamptz  not null default now()
);
