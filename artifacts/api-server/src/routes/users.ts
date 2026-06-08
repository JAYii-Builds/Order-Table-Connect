import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { GetUserParams, UpdateUserBody, UpdateUserParams } from "@workspace/api-zod";
import { requireAuth, requireRole } from "../middlewares/auth";

const router: IRouter = Router();

const USER_ROLES = ["customer", "staff", "kitchen_staff", "manager", "owner", "admin"] as const;

function serializeUser(u: typeof usersTable.$inferSelect) {
  return {
    id: u.id,
    email: u.email,
    full_name: u.full_name,
    role: u.role,
    phone: u.phone,
    is_active: u.is_active,
    created_at: u.created_at.toISOString(),
  };
}

router.get(
  "/users",
  requireAuth,
  requireRole("admin", "owner", "manager"),
  async (_req, res): Promise<void> => {
    const users = await db
      .select()
      .from(usersTable)
      .orderBy(usersTable.created_at);

    res.json(users.map(serializeUser));
  }
);

router.get("/users/:id", requireAuth, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetUserParams.safeParse({ id: rawId });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, params.data.id))
    .limit(1);

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json(serializeUser(user));
});

router.patch("/users/:id", requireAuth, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = UpdateUserParams.safeParse({ id: rawId });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = UpdateUserBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const isSelf = req.user?.userId === params.data.id;
  const isAdmin = req.user?.role === "admin";
  const isOwner = req.user?.role === "owner";
  const canManageUsers = isAdmin || isOwner;

  if (!isSelf && !canManageUsers) {
    res.status(403).json({ error: "Insufficient permissions" });
    return;
  }

  const updateData: Record<string, unknown> = {};

  if (body.data.full_name !== undefined) updateData.full_name = body.data.full_name;
  if (body.data.phone !== undefined) updateData.phone = body.data.phone;

  if (body.data.is_active !== undefined && canManageUsers) {
    updateData.is_active = body.data.is_active;
  }

  if (body.data.role !== undefined && canManageUsers) {
    if (!USER_ROLES.includes(body.data.role as (typeof USER_ROLES)[number])) {
      res.status(400).json({ error: "Invalid role" });
      return;
    }
    if (body.data.role === "admin" && !isAdmin) {
      res.status(403).json({ error: "Only admins can assign the admin role" });
      return;
    }
    updateData.role = body.data.role;
  }

  if (Object.keys(updateData).length === 0) {
    res.status(400).json({ error: "No valid fields to update" });
    return;
  }

  const [updated] = await db
    .update(usersTable)
    .set(updateData)
    .where(eq(usersTable.id, params.data.id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json(serializeUser(updated));
});

export default router;
