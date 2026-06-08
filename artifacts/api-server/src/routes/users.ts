import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { GetUserParams, UpdateUserBody, UpdateUserParams } from "@workspace/api-zod";
import { requireAuth, requireRole } from "../middlewares/auth";

const router: IRouter = Router();

router.get(
  "/users",
  requireAuth,
  requireRole("admin", "owner", "manager"),
  async (_req, res): Promise<void> => {
    const users = await db
      .select({
        id: usersTable.id,
        email: usersTable.email,
        full_name: usersTable.full_name,
        role: usersTable.role,
        phone: usersTable.phone,
        is_active: usersTable.is_active,
        created_at: usersTable.created_at,
      })
      .from(usersTable)
      .orderBy(usersTable.created_at);

    res.json(
      users.map((u) => ({ ...u, created_at: u.created_at.toISOString() }))
    );
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
    .select({
      id: usersTable.id,
      email: usersTable.email,
      full_name: usersTable.full_name,
      role: usersTable.role,
      phone: usersTable.phone,
      is_active: usersTable.is_active,
      created_at: usersTable.created_at,
    })
    .from(usersTable)
    .where(eq(usersTable.id, params.data.id))
    .limit(1);

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json({ ...user, created_at: user.created_at.toISOString() });
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
  const isAdmin = req.user?.role === "admin" || req.user?.role === "owner";

  if (!isSelf && !isAdmin) {
    res.status(403).json({ error: "Insufficient permissions" });
    return;
  }

  const updateData: Record<string, unknown> = {};
  if (body.data.full_name !== undefined) updateData.full_name = body.data.full_name;
  if (body.data.phone !== undefined) updateData.phone = body.data.phone;
  if (body.data.is_active !== undefined && isAdmin) {
    updateData.is_active = body.data.is_active;
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

  res.json({
    id: updated.id,
    email: updated.email,
    full_name: updated.full_name,
    role: updated.role,
    phone: updated.phone,
    is_active: updated.is_active,
    created_at: updated.created_at.toISOString(),
  });
});

export default router;
