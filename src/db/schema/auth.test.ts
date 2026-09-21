import { getTableConfig } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";

import { account, session, user, verification } from "@/db/schema";

const expectedTables = [
  {
    model: "user",
    table: user,
    columns: ["id", "name", "email", "email_verified", "image", "created_at", "updated_at"],
    indexes: [],
    uniqueColumns: ["email"],
  },
  {
    model: "session",
    table: session,
    columns: [
      "id",
      "expires_at",
      "token",
      "created_at",
      "updated_at",
      "ip_address",
      "user_agent",
      "user_id",
    ],
    indexes: ["session_userId_idx"],
    uniqueColumns: ["token"],
  },
  {
    model: "account",
    table: account,
    columns: [
      "id",
      "account_id",
      "provider_id",
      "user_id",
      "access_token",
      "refresh_token",
      "id_token",
      "access_token_expires_at",
      "refresh_token_expires_at",
      "scope",
      "password",
      "created_at",
      "updated_at",
    ],
    indexes: ["account_userId_idx"],
    uniqueColumns: [],
  },
  {
    model: "verification",
    table: verification,
    columns: ["id", "identifier", "value", "expires_at", "created_at", "updated_at"],
    indexes: ["verification_identifier_idx"],
    uniqueColumns: [],
  },
] as const;

describe("Better Auth PostgreSQL schema", () => {
  it.each(expectedTables)(
    "matches the installed contract for $model",
    ({ table, columns, indexes, uniqueColumns }) => {
      const config = getTableConfig(table);

      expect(config.columns.map((column) => column.name)).toEqual(columns);
      expect(config.columns.filter((column) => column.primary).map((column) => column.name)).toEqual([
        "id",
      ]);
      expect(config.columns.filter((column) => column.isUnique).map((column) => column.name)).toEqual(
        uniqueColumns,
      );
      expect(config.indexes.map((index) => index.config.name)).toEqual(indexes);
      expect(config.enableRLS).toBe(true);
    },
  );

  it.each([
    { table: session, column: "user_id" },
    { table: account, column: "user_id" },
  ])("cascades $column references to the auth user", ({ table, column }) => {
    const [foreignKey] = getTableConfig(table).foreignKeys;
    const reference = foreignKey?.reference();

    expect(reference?.columns.map((item) => item.name)).toEqual([column]);
    expect(reference?.foreignTable).toBe(user);
    expect(reference?.foreignColumns.map((item) => item.name)).toEqual(["id"]);
    expect(foreignKey?.onDelete).toBe("cascade");
  });
});
