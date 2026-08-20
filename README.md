# TableServe — Project Overview

A full-stack restaurant ordering and table reservation system for **TableServe**. Built with React, TypeScript, Express, and PostgreSQL — featuring a customer-facing ordering flow, role-based dashboards for 6 staff roles, and a full menu and user management suite.

---

## Live App Pages

| Route | Role | Description |
|---|---|---|
| `/` | Public | Landing page |
| `/login` | Public | Login form |
| `/register` | Public | Customer self-registration |
| `/customer/dashboard` | Customer | Order overview and quick links |
| `/customer/menu` | Customer | Browse menu items |
| `/customer/cart` | Customer | Cart review |
| `/customer/checkout` | Customer | Place order |
| `/customer/orders` | Customer | Order history |
| `/customer/reservations` | Customer | View and manage reservations |
| `/staff/dashboard` | Staff | Front-of-house operations view |
| `/kitchen/dashboard` | Kitchen Staff | Active order queue |
| `/manager/dashboard` | Manager | Sales and operations overview |
| `/manager/menu` | Manager | Full menu CRUD |
| `/owner/dashboard` | Owner | Business-wide stats |
| `/admin/dashboard` | Admin | System overview |
| `/admin/users` | Admin | User management (roles, activation) |

---

## Features

### Customer Flow
- **Menu browsing** — Browse available items by category with live availability status
- **Cart** — localStorage-backed cart; persists across page navigations without a backend round-trip
- **Checkout** — Places an order directly from the cart
- **Reservations** — Book a table after placing an order of ₱200 or more (enforced server-side)
- **Order history** — Full list of past orders with item breakdown

### Manager
- **Menu CRUD** — Add, edit, delete, and toggle availability of menu items

### Admin
- **User management** — View all users, reassign roles, deactivate and reactivate accounts

### Design
- Amber primary + dark charcoal background (`amber` / `#1c1917`)
- Fully responsive — mobile, tablet, desktop
- Radix UI primitives with Tailwind CSS v4
- Framer Motion animations throughout
- Currency: Philippine Peso (₱)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite 7 |
| Styling | Tailwind CSS v4, Radix UI, Shadcn/UI |
| Animations | Framer Motion |
| Icons | Lucide React, React Icons |
| Routing | Wouter |
| Backend | Node.js, Express v5 |
| Database | PostgreSQL + Drizzle ORM |
| API Layer | Zod validation (`zod/v4`), Orval-generated React Query hooks |
| Logging | Pino (structured JSON) |
| Auth | Custom bcrypt + JWT (Bearer token, 7-day expiry) |
| Email | Resend (optional — welcome emails on registration) |
| Package Manager | pnpm (workspace monorepo) |

---

## Project Structure

```
/
├── artifacts/
│   ├── restaurant-app/          # React frontend (Vite, port 19460 in dev)
│   │   └── src/
│   │       ├── pages/           # Route-level components grouped by role
│   │       │   ├── customer/    # dashboard, menu, cart, checkout, orders, reservations
│   │       │   ├── staff/       # dashboard
│   │       │   ├── kitchen/     # dashboard
│   │       │   ├── manager/     # dashboard, menu
│   │       │   ├── owner/       # dashboard
│   │       │   └── admin/       # dashboard, users
│   │       ├── components/      # Shared UI components + Radix/Shadcn primitives
│   │       ├── contexts/        # AuthProvider, CartProvider
│   │       └── lib/             # api-config, utilities
│   ├── api-server/              # Express backend (port 8080)
│   │   └── src/
│   │       ├── routes/          # auth, menu, orders, reservations, users, dashboard, events
│   │       ├── middlewares/     # requireAuth, requireRole
│   │       └── lib/             # jwt, logger, resend, sse
│   └── mockup-sandbox/          # UI component preview environment (port 8081)
├── lib/
│   ├── db/                      # Drizzle ORM schema + database client
│   │   └── src/schema/          # users, sessions, menu_items, orders, order_items, reservations
│   ├── api-spec/                # OpenAPI spec (openapi.yaml) — source of truth
│   ├── api-zod/                 # Auto-generated Zod schemas
│   └── api-client-react/        # Auto-generated React Query hooks + custom fetch
├── netlify.toml                 # Frontend deployment config (Netlify)
├── render.yaml                  # Backend deployment config (Render)
└── pnpm-workspace.yaml          # Monorepo workspace config
```

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_SECRET` | Yes | Secret used to sign and verify JWT tokens |
| `RESEND_API_KEY` | Optional | Resend API key for welcome emails on registration |
| `VITE_API_BASE_URL` | Optional | Absolute backend URL for production frontend (e.g. Render URL) |
| `ALLOWED_ORIGIN` | Optional | Allowed CORS origin in production (e.g. Netlify URL) |

---

## Running the Project

The project runs as two parallel services:

| Workflow | Command | Port |
|---|---|---|
| `artifacts/restaurant-app: web` | `pnpm --filter @workspace/restaurant-app run dev` | `19460` |
| `artifacts/api-server: API Server` | `pnpm --filter @workspace/api-server run dev` | `8080` |

Frontend API calls are proxied from `19460 → 8080` via Vite's dev proxy.

### Useful Commands

```bash
# Install all dependencies
pnpm install

# Push DB schema changes (dev only)
pnpm --filter @workspace/db run push

# Regenerate API hooks from OpenAPI spec
pnpm --filter @workspace/api-spec run codegen

# Full typecheck
pnpm run typecheck

# Production build (frontend)
pnpm --filter @workspace/restaurant-app run build

# Production build (backend)
pnpm --filter @workspace/api-server run build
```

---

## API Endpoints

### Auth
| Method | Route | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | Public | Register a new customer account |
| `POST` | `/api/auth/login` | Public | Login and receive a JWT |
| `POST` | `/api/auth/logout` | Required | Invalidate the current session |
| `GET` | `/api/auth/me` | Required | Get the authenticated user's profile |

### Menu
| Method | Route | Auth | Description |
|---|---|---|---|
| `GET` | `/api/menu` | Public | List all menu items |
| `GET` | `/api/menu/:id` | Public | Get a single menu item |
| `POST` | `/api/menu` | Manager | Create a menu item |
| `PATCH` | `/api/menu/:id` | Manager | Update a menu item |
| `DELETE` | `/api/menu/:id` | Manager | Delete a menu item |

### Orders
| Method | Route | Auth | Description |
|---|---|---|---|
| `POST` | `/api/orders` | Required | Place an order |
| `GET` | `/api/orders` | Required | List orders (scoped by role) |
| `GET` | `/api/orders/:id` | Required | Get order details |
| `PATCH` | `/api/orders/:id` | Required | Update order status |

### Reservations
| Method | Route | Auth | Description |
|---|---|---|---|
| `POST` | `/api/reservations` | Required | Create a reservation (requires ₱200+ order) |
| `GET` | `/api/reservations` | Required | List reservations (scoped by role) |
| `GET` | `/api/reservations/:id` | Required | Get reservation details |
| `PATCH` | `/api/reservations/:id` | Required | Update reservation status |

### Users
| Method | Route | Auth | Description |
|---|---|---|---|
| `GET` | `/api/users` | Admin | List all users |
| `GET` | `/api/users/:id` | Admin | Get a user |
| `PATCH` | `/api/users/:id` | Admin | Update role or active status |

### Dashboards
| Method | Route | Role | Description |
|---|---|---|---|
| `GET` | `/api/dashboard/customer` | Customer | Customer stats summary |
| `GET` | `/api/dashboard/staff` | Staff | Front-of-house summary |
| `GET` | `/api/dashboard/kitchen` | Kitchen Staff | Active order queue stats |
| `GET` | `/api/dashboard/manager` | Manager | Sales and menu stats |
| `GET` | `/api/dashboard/owner` | Owner | Business-wide metrics |
| `GET` | `/api/dashboard/admin` | Admin | System-wide summary |

### Other
| Method | Route | Description |
|---|---|---|
| `GET` | `/api/healthz` | Health check |
| `GET` | `/api/events` | Server-Sent Events stream for real-time updates |

---

## Deployment

The frontend deploys to **Netlify** and the backend to **Render**.

### Netlify (frontend)
- Build command: `pnpm --filter @workspace/restaurant-app run build`
- Publish directory: `artifacts/restaurant-app/dist/public`
- Set `VITE_API_BASE_URL` in Netlify's environment variables to point to your Render backend URL

### Render (backend)
- Build command: `pnpm install --frozen-lockfile && pnpm --filter @workspace/api-server run build`
- Start command: `node --enable-source-maps ./artifacts/api-server/dist/index.mjs`
- Set `DATABASE_URL`, `JWT_SECRET`, and `ALLOWED_ORIGIN` (your Netlify URL) in Render's environment variables

---

## Architecture Notes

- **Contract-first API** — `lib/api-spec/openapi.yaml` is the single source of truth; Orval generates both React Query hooks and Zod validators from it. Always run `pnpm --filter @workspace/api-spec run codegen` after any spec change.
- **No RLS on Supabase** — All auth and authorization is enforced at the API layer via JWT middleware (`requireAuth`, `requireRole`). The DB connection uses a superuser that bypasses RLS.
- **Cart is localStorage-only** — Cart state lives entirely in `CartProvider` + localStorage and is never persisted to the DB until checkout submits an order.
- **JWT payload uses `userId`** — The token payload field is `userId` (not `id`). Always access it as `req.user.userId` in route handlers.
- **`requireRole` takes spread args** — Call as `requireRole("staff", "manager")`, not `requireRole(["staff", "manager"])`.
- **Reservation minimum** — The backend enforces a ₱200 minimum order value before a reservation can be created. This cannot be bypassed from the frontend.
- **DB URL priority** — `SUPABASE_DB_URL` takes precedence over `DATABASE_URL` if both are set (see `lib/db/src/index.ts`).


