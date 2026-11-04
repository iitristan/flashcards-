import "server-only";
import pg from "pg";

const globalForNeon = globalThis as typeof globalThis & {
  neonPool?: pg.Pool;
};

export const hasNeonDatabaseUrl = Boolean(
  process.env.DATABASE_URL?.trim(),
);

export function getNeonPool(): pg.Pool {
  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) {
    throw new Error("DATABASE_URL is not configured.");
  }

  globalForNeon.neonPool ??= new pg.Pool({
    connectionString,
    max: 5,
  });
  return globalForNeon.neonPool;
}
