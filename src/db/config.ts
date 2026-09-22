import path from "node:path";

export const DEFAULT_PGLITE_DATA_DIR = ".data/pglite";

export function getPgliteDataDir(
  env: {
    readonly NODE_ENV?: string;
    readonly PGLITE_DATA_DIR?: string;
  } = process.env,
): string {
  const configured = env.PGLITE_DATA_DIR ?? DEFAULT_PGLITE_DATA_DIR;
  const normalized = path.normalize(configured);
  if (
    path.isAbsolute(configured) ||
    normalized === ".data" ||
    !normalized.startsWith(`.data${path.sep}`)
  ) {
    throw new Error("PGLITE_DATA_DIR must be a relative path inside .data/.");
  }
  return normalized;
}

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
