# saude-territorial: functional specification

What the system does, how its data is modeled, and the rules that drive alerts. For setup and commands see the [README](./README.md); for decisions and their rationale see the ADRs under [`docs/adr/`](./docs/adr/).

## Overview

The US Moab Caldas team tracks patients across about ten monitoring spreadsheets (gestantes, tuberculose, diabetes, hipertensão, acamados, and others). None of them have a map, so the team can't see where patients cluster, which cases are urgent, or how to plan an efficient round of home visits. They also want to correct street names and nudge pin locations, which a spreadsheet handles poorly.

This app puts the same records on an interactive map. A Community Health Agent (ACS) edits patient data in the app, with one map layer per condition, urgency highlighting, route planning, and draggable pins for addresses that don't geocode cleanly.

Audience: ACS, nurses, and preceptors at US Moab Caldas.

MVP scope: map, layers, static alerts, patient CRUD, and territory overlays. No mobile, no cross-instance sync, no real time. See "Scope" below, and `docs/roadmap.md` for what comes next.

## Data model

Postgres is the source of truth, reached through Drizzle ORM (see `docs/adr/ADR-002-drizzle-orm.md`). The schema lives in `src/db/schema/*.ts`; `drizzle-kit` generates migrations into `drizzle/`.

### Base plus extension tables

One `patients` row holds the fields every patient shares. Each condition gets its own extension table keyed by `patient_id` (foreign key, cascade delete).

| Table | Holds | Key |
|---|---|---|
| `patients` | CNS, name, address, coordinates | `id UUID PK`, `cns UNIQUE` |
| `gestantes_data` | DUM, DPP, IG, risco, prenatal follow-up | `patient_id PK/FK` |
| `tuberculose_data` | type, baciloscopia, clinical form, contacts | `patient_id PK/FK` |
| `has_data` | last consultation date, blood-pressure monitoring | `patient_id PK/FK` |
| future: `dm_data`, `acamados_data`, ... | analogous | `patient_id PK/FK` |

`patients` also carries `lat`, `lng`, and `geocode_status` (one of `geocoded`, `manual`, `unresolved`) for the geocoding flow. New columns and layers are tracked in `docs/roadmap.md`.

### CNS deduplication

CNS is unique in `patients`. Creating a patient with a CNS that already exists shows "This CNS already belongs to Fulana. Add a condition to the existing patient?", which keeps one patient as one pin with multiple condition badges.

### Access rules

The MVP has no row-level-security policies: every authenticated user reads and writes the shared team dataset. The compensating controls are a session check on every route, destructive DB scripts gated by `scripts/verify-non-prod-db.ts`, and an LGPD guard that requires synthetic data for any seed. Named RLS policies come later, when the pilot expands to multiple teams. The `drizzle/0002` migration already enables RLS with no policies as a backstop.

## Data flow

Read: the page mounts, `usePatientData` (TanStack Query) calls `GET /api/patients`, and the route handler queries through Drizzle and returns patients grouped by layer. The cache holds a 5-minute staleTime and refetches on window focus.

Write: an edit in the panel calls `POST`, `PATCH`, or `DELETE /api/patients/[id]`. The handler checks the session, runs the Drizzle mutation, and returns the updated patient. On success the client invalidates the patient cache and refetches.

Geocoding: saving an address calls Nominatim. A confident hit stores `lat/lng` and sets `geocode_status = geocoded`. Failure or low confidence prompts the user to drop a pin, which sets `geocode_status = manual`. The user can drag any pin later; that persists the new coordinates and keeps the status `manual`.

## Authentication

Email/password is the default and needs no external service. Google OAuth is optional and identity-only (`openid email profile`, no Sheets or Drive scopes), wired only when `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are both set. See `docs/adr/ADR-001-drop-sheets.md`.

`proxy.ts` redirects unauthenticated users to `/login` and protects the dashboard routes. Any account the team creates can sign in; per-microárea authorization is post-MVP.

## Layers

Each layer is a health condition, defined in code in `src/config/layers.config.ts`. Each entry sets its icon, color, the columns shown in the detail panel, and whether clustering and heatmap are enabled.

Priority MVP layers are Gestantes, Tuberculose, and HAS. DM and Acamados exist in the config but carry no data yet.

Per layer you can toggle it from the sidebar, cluster its markers at low zoom, switch to a heatmap density view, and filter by microárea, alert level, or free text. A separate "Alertas" view shows every patient with an active urgency, regardless of condition.

## Alerts

Rules live in code (`src/config/alert-rules.config.ts`); a configurable UI is post-MVP. The engine (`src/lib/alerts/engine.ts`) supports the operators `>`, `<`, `>=`, `<=`, `=`, `!=`, `older_than_days`, and `is_empty`.

The four MVP rules:

| Layer | Column | Operator | Value | Level |
|---|---|---|---|---|
| Gestantes | IG (weeks) | `>` | 40 | red |
| Gestantes | risco | `=` | alto | yellow |
| Tuberculose | data_ultima_atualizacao | `older_than_days` | 30 | red |
| HAS | data_ultima_consulta | `older_than_days` | 180 | yellow |

Markers get a colored border at their highest active level, a priority list orders patients by urgency, and a small dashboard counts patients per level.

## Routing

A "Traçar rota" button in the detail panel asks OSRM for a walking or driving route from US Moab Caldas to the patient and draws it on the map. Day planning selects several patients for one optimized route, with manual reordering and an estimated total time.

## Territories

GeoJSON files under `territories/` load as a Leaflet overlay. Microárea polygons are colored per ACS, and hovering shows the microárea name. Editing boundaries on the map is post-MVP.

## UI

A header sits above a sidebar and the map. The sidebar holds layer toggles, filters, and route tools; the map shows markers, clusters, or a heatmap. Clicking a marker slides in a detail panel with the patient's data and route controls.

Three view modes: individual markers (clustered at low zoom), a heatmap by area, and an alerts-only cross-layer filter.

## Scope

In the MVP:

- Email/password auth, Google optional
- Patient CRUD in the app
- Leaflet map with per-layer markers
- Three layers: Gestantes, TB, HAS
- Layer toggles and an optional heatmap
- Filters by microárea, alert level, and text
- Static alerts with a visual highlight
- Territory overlays
- Manual pins for addresses that don't geocode
- Route from a patient to US Moab Caldas

Out of the MVP: mobile and tablet, cross-instance sync, real time, e-SUS APS integration, automatic spreadsheet import (deferred, see ADR-001), ACS-created layers, and any AI-based normalization or prioritization.

Implementation order lives in `docs/roadmap.md`. This document fixes the architecture.

## Design decisions

Current as of August 2026; the ADRs carry the full rationale.

1. Postgres is the source of truth (ADR-001). Google Sheets is not read at runtime.
2. Drizzle ORM is the only data-access path (ADR-002). No Supabase SDK is used; Postgres is reached through `src/db/client.ts`.
3. Migrations are generated by `drizzle-kit` and committed to `drizzle/`.
4. Auth is email/password with optional identity-only Google. No Sheets scope, no on-behalf Google API calls.
5. Patients are edited in the app through `PATCH /api/patients/[id]`.
6. Layers are defined in code (`src/config/layers.config.ts`).
7. Alert rules are static, in code (`src/config/alert-rules.config.ts`).
8. CNS is the unique patient key; a collision offers "add condition to the existing patient".
9. Conditions use the base-plus-extension pattern: one `patients` table plus one table per condition.
10. No RLS policies in the MVP; session gates and non-prod script gates compensate.
11. Geocoding blocks on save, with a manual pin fallback; pins stay draggable afterward.
12. Runs locally on Docker Postgres and deploys to any Node host with any Postgres.

## References

- `docs/adr/ADR-001-drop-sheets.md`: why Google Sheets was dropped
- `docs/adr/ADR-002-drizzle-orm.md`: why Drizzle was chosen
- `docs/roadmap.md`: post-MVP work
- [extensao-gat4](https://github.com/PedroKlein/extensao-gat4): sister repo with domain docs, prototypes, and synthetic seed data
- [Drizzle](https://orm.drizzle.team), [react-leaflet](https://react-leaflet.js.org/), [shadcn/ui](https://ui.shadcn.com/), [OSRM](http://project-osrm.org/docs/), [Nominatim](https://nominatim.org/release-docs/develop/api/Search/)
