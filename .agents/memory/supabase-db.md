---
name: Supabase DB connection setup
description: How the DB client connects to Supabase, special char password handling, no RLS decision
---

**DB URL priority:** `lib/db/src/index.ts` checks `SUPABASE_DB_URL` first, falls back to `DATABASE_URL` (Replit-managed Helium). `DATABASE_URL` is runtime-managed by Replit and cannot be overwritten.

**Password special chars:** The Supabase password contains `@`, `#`, `!`. The DB client uses a custom `parseDbUrl()` that extracts components and passes them as individual `pg.PoolConfig` fields (user, password, host, port, database) rather than a connection string, to avoid URL-parsing failures. Drizzle config uses `encodeURIComponent()` on the password portion.

**SSL:** SSL is enabled with `{ rejectUnauthorized: false }` when host contains `supabase.co`.

**No RLS:** Row Level Security is NOT enabled on Supabase tables.
**Why:** All auth/authz is enforced at the Express API layer (JWT middleware + requireRole). The DB connection uses the `postgres` superuser which bypasses RLS anyway. No client ever connects to Supabase directly.

**Migrations:** Replit sandbox blocks outbound TCP on port 5432, so `drizzle-kit push` to Supabase fails. SQL migration files are in `lib/db/drizzle/` and must be run manually in Supabase SQL Editor.
