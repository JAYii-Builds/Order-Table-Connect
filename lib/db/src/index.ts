import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

const rawUrl = process.env.DATABASE_URL;

if (!rawUrl) {
  throw new Error(
    "No database URL found. Set DATABASE_URL.",
  );
}

function parseDbUrl(url: string): pg.PoolConfig {
  const m = url.match(/^postgresql:\/\/([^:]+):(.+)@([^:/@]+):(\d+)\/(.+)$/);
  if (!m) {
    return { connectionString: url };
  }
  const [, user, password, host, portStr, database] = m;
  const port = parseInt(portStr, 10);
  return { user, password, host, port, database };
}

export const pool = new Pool(parseDbUrl(rawUrl));
export const db = drizzle(pool, { schema });

export * from "./schema";
