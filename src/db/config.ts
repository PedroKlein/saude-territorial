export const PGLITE_DATA_DIR = ".data/pglite";

export type DatabaseDriver = "pglite" | "postgres";

export function getDatabaseDriver(env: NodeJS.ProcessEnv = process.env): DatabaseDriver {
  const configured = env.DATABASE_DRIVER;
  if (configured !== undefined && configured !== "pglite" && configured !== "postgres") {
    throw new Error(`Unsupported DATABASE_DRIVER: ${configured}`);
  }

  const selected = configured ?? (env.NODE_ENV === "production" ? "postgres" : "pglite");
  if (env.NODE_ENV === "production" && selected === "pglite") {
    throw new Error("DATABASE_DRIVER=pglite is not supported in production.");
  }

  return selected;
}
