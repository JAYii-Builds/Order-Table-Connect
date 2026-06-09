# TableServe

A full-stack web-based restaurant ordering and table reservation system with role-based access.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only, uses SUPABASE_DB_URL or DATABASE_URL)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React 19 + Vite + Tailwind CSS v4 (amber + dark charcoal theme)
- API: Express 5, JWT auth (bcrypt passwords, 7d token expiry)
- DB: PostgreSQL (Supabase) + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec → React Query hooks + Zod schemas)
- Build: esbuild (CJS bundle)
- Email: Resend

## Where things live

- `lib/db/src/schema/` — Drizzle table schemas (users, sessions, menu_items, orders, order_items, reservations)
- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth for API contract)
- `lib/api-client-react/src/generated/` — Generated React Query hooks (do not edit manually)
- `artifacts/api-server/src/routes/` — Express route handlers
- `artifacts/restaurant-app/src/pages/` — React pages per role
- `artifacts/restaurant-app/src/contexts/` — React contexts (auth, cart)
- `lib/db/drizzle/` — SQL migration files for Supabase

## Architecture decisions

- **No RLS on Supabase**: All auth/authz enforced at API layer via JWT + `requireAuth`/`requireRole` middleware. DB connection uses `postgres` superuser which bypasses RLS anyway.
- **DB URL priority**: `SUPABASE_DB_URL` takes precedence over `DATABASE_URL` (Replit-managed Postgres). See `lib/db/src/index.ts`.
- **Cart is localStorage-only**: Cart state lives in `CartProvider` + localStorage, never persisted to DB until checkout submits an order.
- **Reservation requires ₱200+ order**: Backend enforces minimum order amount for reservation creation.
- **JWT payload uses `userId` field**: `req.user.userId` (not `req.user.id`) — from `JwtPayload` in `lib/jwt.ts`.
- **`requireRole` takes spread args**: Call as `requireRole("staff", "manager")` not `requireRole(["staff", "manager"])`.

## Product

Six roles: customer, staff, kitchen_staff, manager, owner, admin.

**Customer**: Browse menu → Add to cart → Checkout (place order) → Reserve a table (if order ≥ ₱200) → View order history

**Manager**: Full menu CRUD (add/edit/delete items, toggle availability)

**Admin**: User management (view all users, change roles, deactivate/reactivate)

**Staff / Kitchen / Owner**: Dashboard (expandable in future phases)

## Supabase Migrations

Run in order in Supabase SQL Editor:
1. `lib/db/drizzle/0000_robust_talisman.sql` — users, sessions, menu_items (Phase 1)
2. `lib/db/drizzle/0001_orders_reservations.sql` — orders, order_items, reservations (Phase 2)

## User preferences

- Currency: Philippine Peso (₱)
- Design: amber primary + dark charcoal background
- No PayMongo/Semaphore integration yet

## Gotchas

- Always run `pnpm --filter @workspace/api-spec run codegen` after changing `openapi.yaml`
- Always run `pnpm run typecheck:libs` after changing `lib/db/src/` schemas
- The Replit sandbox blocks outbound TCP on port 5432, so `drizzle-kit push` to Supabase must be done by running SQL manually in Supabase's SQL Editor
- SUPABASE_DB_URL password has special chars (@#!) — handled via custom URL parser in `lib/db/src/index.ts`
