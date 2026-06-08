import { defineConfig } from "drizzle-kit";
import path from "path";

const rawUrl = process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL;

if (!rawUrl) {
  throw new Error("No database URL found. Set SUPABASE_DB_URL or DATABASE_URL.");
}

function encodeDbUrl(url: string): string {
  const m = url.match(/^(postgresql:\/\/[^:]+:)(.+?)(@.+)$/);
  if (!m) return url;
  return m[1] + encodeURIComponent(m[2]) + m[3];
}

export default defineConfig({
  schema: path.join(__dirname, "./src/schema/index.ts"),
  dialect: "postgresql",
  dbCredentials: {
    url: encodeDbUrl(rawUrl),
  },
});
