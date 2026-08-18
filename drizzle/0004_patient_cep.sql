-- 0004_patient_cep
--
-- Adds `cep` to `patients` so the address module can pre-fill rua/bairro from
-- ViaCEP and store the postal code for downstream reporting. The existing
-- `geocode_reference` column already carries free-form landmark notes; its
-- semantics are widened by the app (no longer strictly "manual pin"-only),
-- so no new column is needed for that.
--
-- Format is enforced at the API boundary (Zod: 8-digit or NNNNN-NNN). No
-- CHECK constraint in SQL — a synthetic dev row may legitimately store an
-- unformatted value while migrations run against a mixed cohort.

ALTER TABLE "patients" ADD COLUMN "cep" TEXT;
