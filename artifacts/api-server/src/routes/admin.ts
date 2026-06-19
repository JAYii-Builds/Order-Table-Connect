import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import {
  db,
  usersTable,
  menuItemsTable,
  ordersTable,
  orderItemsTable,
  tableReservationsTable,
} from "@workspace/db";
import { requireAuth, requireRole } from "../middlewares/auth";
import { logAudit } from "../lib/audit";

const router: IRouter = Router();

const VALID_ROLES = ["customer", "staff", "kitchen_staff", "manager", "owner", "admin"] as const;

// POST /admin/users — admin creates a new user account of any role
router.post(
  "/admin/users",
  requireAuth,
  requireRole("admin"),
  async (req, res, next): Promise<void> => {
    try {
      const actor = req.user!;
      const { full_name, email, role, password, phone } = req.body as {
        full_name?: string;
        email?: string;
        role?: string;
        password?: string;
        phone?: string;
      };

      if (!full_name?.trim() || !email?.trim() || !role || !password) {
        res.status(400).json({ error: "full_name, email, role, and password are required" });
        return;
      }
      if (!VALID_ROLES.includes(role as (typeof VALID_ROLES)[number])) {
        res.status(400).json({ error: "Invalid role" });
        return;
      }
      if (password.length < 6) {
        res.status(400).json({ error: "Password must be at least 6 characters" });
        return;
      }

      const [existing] = await db
        .select({ id: usersTable.id })
        .from(usersTable)
        .where(eq(usersTable.email, email.toLowerCase().trim()))
        .limit(1);

      if (existing) {
        res.status(409).json({ error: "Email already in use" });
        return;
      }

      const password_hash = await bcrypt.hash(password, 12);
      const [user] = await db
        .insert(usersTable)
        .values({
          id: randomUUID(),
          email: email.toLowerCase().trim(),
          password_hash,
          full_name: full_name.trim(),
          role: role as (typeof VALID_ROLES)[number],
          phone: phone?.trim() || null,
          is_active: true,
        })
        .returning();

      logAudit(
        actor.userId,
        actor.email,
        "user.created",
        `Created ${role} account for ${full_name.trim()} (${email.toLowerCase().trim()})`,
      );

      res.status(201).json({
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        phone: user.phone,
        is_active: user.is_active,
        created_at: user.created_at.toISOString(),
      });
    } catch (err) {
      next(err);
    }
  },
);

// DELETE /admin/users/:id — admin deletes a user (hard delete; fails gracefully if FK constrained)
router.delete(
  "/admin/users/:id",
  requireAuth,
  requireRole("admin"),
  async (req, res, next): Promise<void> => {
    try {
      const actor = req.user!;
      const id = String(req.params.id);

      if (id === actor.userId) {
        res.status(400).json({ error: "You cannot delete your own account" });
        return;
      }

      const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
      if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      try {
        await db.delete(usersTable).where(eq(usersTable.id, id));
      } catch {
        // FK constraint — deactivate instead
        await db.update(usersTable).set({ is_active: false }).where(eq(usersTable.id, id));
        logAudit(
          actor.userId,
          actor.email,
          "user.deactivated",
          `Deactivated ${user.role} account ${user.email} (had associated data)`,
        );
        res.json({ message: "User has associated data and was deactivated instead of deleted" });
        return;
      }

      logAudit(actor.userId, actor.email, "user.deleted", `Deleted ${user.role} account ${user.email}`);
      res.json({ message: "User deleted" });
    } catch (err) {
      next(err);
    }
  },
);

// GET /admin/export — export all data as JSON (admin only)
router.get(
  "/admin/export",
  requireAuth,
  requireRole("admin"),
  async (_req, res, next): Promise<void> => {
    try {
      const [users, menuItems, orders, orderItems, tableReservations] = await Promise.all([
        db.select().from(usersTable),
        db.select().from(menuItemsTable),
        db.select().from(ordersTable),
        db.select().from(orderItemsTable),
        db.select().from(tableReservationsTable),
      ]);

      const payload = {
        exported_at: new Date().toISOString(),
        users: users.map((u) => ({
          id: u.id,
          email: u.email,
          full_name: u.full_name,
          role: u.role,
          phone: u.phone,
          is_active: u.is_active,
          created_at: u.created_at.toISOString(),
        })),
        menu_items: menuItems.map((m) => ({
          id: m.id,
          name: m.name,
          description: m.description,
          price: m.price,
          category: m.category,
          is_available: m.is_available,
          sort_order: m.sort_order,
        })),
        orders: orders.map((o) => ({
          id: o.id,
          customer_id: o.customer_id,
          status: o.status,
          total_amount: o.total_amount,
          notes: o.notes,
          created_at: o.created_at.toISOString(),
        })),
        order_items: orderItems.map((i) => ({
          id: i.id,
          order_id: i.order_id,
          menu_item_id: i.menu_item_id,
          quantity: i.quantity,
          unit_price: i.unit_price,
          subtotal: i.subtotal,
        })),
        table_reservations: tableReservations.map((r) => ({
          id: r.id,
          customer_id: r.customer_id,
          customer_name: r.customer_name,
          contact_info: r.contact_info,
          party_size: r.party_size,
          reservation_date: r.reservation_date,
          reservation_time: r.reservation_time,
          table_id: r.table_id,
          status: r.status,
          notes: r.notes,
          created_at: r.created_at.toISOString(),
        })),
      };

      res.setHeader("Content-Type", "application/json");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="tableserve-export-${new Date().toISOString().slice(0, 10)}.json"`,
      );
      res.json(payload);
    } catch (err) {
      next(err);
    }
  },
);

export default router;
