---
name: JWT payload shape and requireRole usage
description: JwtPayload uses userId not id; requireRole takes spread args
---

The `JwtPayload` interface (in `artifacts/api-server/src/lib/jwt.ts`) uses `userId`, not `id`.

**Rule:** Always use `req.user!.userId` in route handlers, never `req.user!.id`.

**Why:** The field was named `userId` at the time the auth system was built. Using `.id` causes a TS error `Property 'id' does not exist on type 'JwtPayload'`.

`requireRole` in `middlewares/auth.ts` takes rest/spread args, not an array:
- Correct: `requireRole("staff", "kitchen_staff", "manager")`
- Wrong: `requireRole(["staff", "kitchen_staff", "manager"])`

**Why:** The signature is `function requireRole(...roles: string[])`.

Also: `req.params.id` in Express 5 types is `string | string[]`. Always cast: `const id = String(req.params.id)`.
