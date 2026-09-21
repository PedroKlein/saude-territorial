// @vitest-environment node

import { PGlite } from "@electric-sql/pglite";
import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import migrationJournal from "../../drizzle/meta/_journal.json";
import * as schema from "./schema";

const { gestantesData, patients } = schema;

// SYNTHETIC DATA — not real patients
const syntheticPatient = {
  cns: "000000000000001",
  nomeCompleto: "PACIENTE_TESTE_PGLITE",
  bairro: "Bairro Sintético",
};

const rolledBackPatient = {
  cns: "000000000000002",
  nomeCompleto: "PACIENTE_TESTE_ROLLBACK",
};

describe("PGlite PostgreSQL compatibility", () => {
  const client = new PGlite();
  const db = drizzle(client, { schema });

  beforeAll(async () => {
    await migrate(db, { migrationsFolder: path.resolve(process.cwd(), "drizzle") });
  });

  afterAll(async () => {
    await client.close();
  });

  it("applies every committed migration unchanged", async () => {
    const result = await client.query<{ count: number }>(
      "select count(*)::int as count from drizzle.__drizzle_migrations",
    );

    expect(result.rows[0]?.count).toBe(migrationJournal.entries.length);
  });

  it("supports relational read, insert/returning, update, delete, and rollback", async () => {
    const [inserted] = await db
      .insert(patients)
      .values(syntheticPatient)
      .returning({ id: patients.id });

    expect(inserted?.id).toBeDefined();
    if (!inserted) throw new Error("Synthetic insert returned no row");

    await db.insert(gestantesData).values({
      patientId: inserted.id,
      risco: "alto",
      numeroConsultas: 1,
    });

    const related = await db.query.patients.findFirst({
      where: eq(patients.id, inserted.id),
      with: { gestantes: true },
    });

    expect(related?.gestantes.risco).toBe("alto");

    const [updated] = await db
      .update(patients)
      .set({ bairro: "Bairro Sintético Atualizado" })
      .where(eq(patients.id, inserted.id))
      .returning({ bairro: patients.bairro });

    expect(updated?.bairro).toBe("Bairro Sintético Atualizado");

    await expect(
      db.transaction(async (tx) => {
        await tx.insert(patients).values(rolledBackPatient);
        throw new Error("Synthetic rollback");
      }),
    ).rejects.toThrow("Synthetic rollback");

    const rollbackCount = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(patients)
      .where(eq(patients.cns, rolledBackPatient.cns));

    expect(rollbackCount[0]?.count).toBe(0);

    const deleted = await db
      .delete(patients)
      .where(eq(patients.id, inserted.id))
      .returning({ id: patients.id });

    expect(deleted).toEqual([{ id: inserted.id }]);
    expect(
      await db.query.patients.findFirst({
        where: eq(patients.id, inserted.id),
      }),
    ).toBeUndefined();
  });
});
