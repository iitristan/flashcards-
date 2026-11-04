import "server-only";
import pg from "pg";
import { getDbPool, hasDatabaseUrl } from "@/lib/db";

export const hasNeonDatabaseUrl = hasDatabaseUrl;

export function getNeonPool(): pg.Pool {
  const pool = getDbPool();
  if (!pool) {
    throw new Error("DATABASE_URL is not configured.");
  }
  return pool;
}
