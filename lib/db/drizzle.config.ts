import { defineConfig } from "drizzle-kit";
import path from "path";

const rawUrl = process.env.DATABASE_URL;

if (!rawUrl) {
  throw new Error("No database URL found. Set DATABASE_URL.");
}

export default defineConfig({
  schema: path.join(__dirname, "./src/schema/index.ts"),
  dialect: "postgresql",
  dbCredentials: {
    url: rawUrl,
  },
});
