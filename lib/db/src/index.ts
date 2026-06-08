import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

const rawUrl = process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL;

if (!rawUrl) {
  throw new Error(
    "No database URL found. Set SUPABASE_DB_URL or DATABASE_URL.",
  );
}

function parseDbUrl(url: string): pg.PoolConfig {
  const m = url.match(/^postgresql:\/\/([^:]+):(.+)@([^:/@]+):(\d+)\/(.+)$/);
  if (!m) {
    return { connectionString: url };
  }
  const [, user, password, host, portStr, database] = m;
  const port = parseInt(portStr, 10);
  const ssl = host.includes("supabase.co") ? { rejectUnauthorized: false } : undefined;
  return { user, password, host, port, database, ssl };
}

export const pool = new Pool(parseDbUrl(rawUrl));
export const db = drizzle(pool, { schema });

export * from "./schema";
