import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, usersTable, sessionsTable } from "@workspace/db";
import { LoginBody, RegisterBody } from "@workspace/api-zod";
import { signToken } from "../lib/jwt";
import { sendWelcomeEmail } from "../lib/resend";
import { requireAuth } from "../middlewares/auth";
import { logger } from "../lib/logger";
import crypto from "node:crypto";

const router: IRouter = Router();

function generateId(): string {
  return crypto.randomUUID();
}

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { email, password } = parsed.data;

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email.toLowerCase()))
    .limit(1);

  if (!user) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  if (!user.is_active) {
    res.status(401).json({ error: "Account is deactivated" });
    return;
  }

  const passwordValid = await bcrypt.compare(password, user.password_hash);
  if (!passwordValid) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const sessionId = generateId();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const token = signToken({
    userId: user.id,
    email: user.email,
    role: user.role,
    sessionId,
  });

  const tokenHash = hashToken(token);

  await db.insert(sessionsTable).values({
    id: sessionId,
    user_id: user.id,
    token_hash: tokenHash,
    is_active: true,
    expires_at: expiresAt,
    last_used_at: new Date(),
  });

  req.log.info({ userId: user.id, role: user.role }, "User logged in");

  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      phone: user.phone,
      created_at: user.created_at.toISOString(),
      is_active: user.is_active,
    },
  });
});

router.post("/auth/register", async (req, res): Promise<void> => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { email, password, full_name, phone } = parsed.data;

  const [existing] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.email, email.toLowerCase()))
    .limit(1);

  if (existing) {
    res.status(409).json({ error: "Email already in use" });
    return;
  }

  const password_hash = await bcrypt.hash(password, 12);
  const userId = generateId();

  const [user] = await db
    .insert(usersTable)
    .values({
      id: userId,
      email: email.toLowerCase(),
      password_hash,
      full_name,
      phone: phone ?? null,
      role: "customer",
      is_active: true,
    })
    .returning();

  const sessionId = generateId();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const token = signToken({
    userId: user.id,
    email: user.email,
    role: user.role,
    sessionId,
  });

  const tokenHash = hashToken(token);

  await db.insert(sessionsTable).values({
    id: sessionId,
    user_id: user.id,
    token_hash: tokenHash,
    is_active: true,
    expires_at: expiresAt,
    last_used_at: new Date(),
  });

  sendWelcomeEmail(user.email, user.full_name).catch((err) =>
    logger.warn({ err }, "Failed to send welcome email")
  );

  req.log.info({ userId: user.id }, "New customer registered");

  res.status(201).json({
    token,
    user: {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      phone: user.phone,
      created_at: user.created_at.toISOString(),
      is_active: user.is_active,
    },
  });
});

router.post("/auth/logout", requireAuth, async (req, res): Promise<void> => {
  if (req.user?.sessionId) {
    await db
      .update(sessionsTable)
      .set({ is_active: false })
      .where(eq(sessionsTable.id, req.user.sessionId));
  }

  res.json({ message: "Logged out successfully" });
});

router.get("/auth/me", requireAuth, async (req, res): Promise<void> => {
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, req.user!.userId))
    .limit(1);

  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }

  res.json({
    id: user.id,
    email: user.email,
    full_name: user.full_name,
    role: user.role,
    phone: user.phone,
    created_at: user.created_at.toISOString(),
    is_active: user.is_active,
  });
});

// POST /auth/change-password — any authenticated user
router.post("/auth/change-password", requireAuth, async (req, res): Promise<void> => {
  const { current_password, new_password } = req.body as {
    current_password?: string;
    new_password?: string;
  };

  if (!current_password || !new_password) {
    res.status(400).json({ error: "current_password and new_password are required" });
    return;
  }
  if (new_password.length < 6) {
    res.status(400).json({ error: "new_password must be at least 6 characters" });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, req.user!.userId))
    .limit(1);

  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }

  const valid = await bcrypt.compare(current_password, user.password_hash);
  if (!valid) {
    res.status(401).json({ error: "Current password is incorrect" });
    return;
  }

  const password_hash = await bcrypt.hash(new_password, 12);
  await db.update(usersTable).set({ password_hash }).where(eq(usersTable.id, user.id));

  res.json({ message: "Password changed successfully" });
});

export default router;
