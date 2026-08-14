/**
 * Postgres error-code helpers.
 *
 * Drizzle/postgres-js surfaces Postgres SQLSTATE errors with a `.code`
 * property on the thrown error object. We use string constants (not enums)
 * because SQLSTATE codes are stable identifiers defined by the SQL spec.
 *
 * Reference: https://www.postgresql.org/docs/current/errcodes-appendix.html
 */

/** SQLSTATE 23505 — unique constraint violation. */
export const PG_UNIQUE_VIOLATION = "23505";

/** SQLSTATE 23503 — foreign key violation. */
export const PG_FK_VIOLATION = "23503";

/** SQLSTATE 22P02 — invalid text representation (e.g. malformed UUID). */
export const PG_INVALID_TEXT = "22P02";

/** True when `err` carries the Postgres unique-constraint SQLSTATE. */
export function isPgUniqueViolation(err: unknown): boolean {
  return isPgError(err, PG_UNIQUE_VIOLATION);
}

/** True when `err` carries the Postgres foreign-key SQLSTATE. */
export function isPgForeignKeyViolation(err: unknown): boolean {
  return isPgError(err, PG_FK_VIOLATION);
}

function isPgError(err: unknown, code: string): boolean {
  if (typeof err !== "object" || err === null) return false;
  const maybe = err as { code?: unknown; cause?: unknown };
  if (typeof maybe.code === "string" && maybe.code === code) return true;
  // Drizzle wraps postgres-js errors; walk one layer of `.cause`.
  if (maybe.cause) return isPgError(maybe.cause, code);
  return false;
}

// ---------------------------------------------------------------------------
// Param validation
// ---------------------------------------------------------------------------

// RFC 4122 UUID (any version). Cheap regex check so we can return a proper
// 404/400 for malformed route params instead of blowing up in Postgres and
// producing a generic 500. Adopted from the postgres-js source (identical
// regex to their internal validator).
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}
