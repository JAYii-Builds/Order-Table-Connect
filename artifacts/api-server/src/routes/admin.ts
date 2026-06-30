import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
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
          password_hash: u.password_hash,
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

// POST /admin/restore — restore data from a JSON backup export
router.post(
  "/admin/restore",
  requireAuth,
  requireRole("admin"),
  async (req, res, next): Promise<void> => {
    try {
      const actor = req.user!;
      const backup = req.body as {
        exported_at?: string;
        users?: { id: string; email: string; password_hash?: string; full_name: string; role: string; phone?: string | null; is_active: boolean; created_at: string }[];
        menu_items?: { id: string; name: string; description?: string | null; price: string; category: string; is_available: boolean; sort_order: number }[];
        orders?: { id: string; customer_id: string; status: string; total_amount: string; notes?: string | null; created_at: string }[];
        order_items?: { id: string; order_id: string; menu_item_id: string; quantity: number; unit_price: string; subtotal: string }[];
        table_reservations?: { id: string; customer_id?: string | null; customer_name: string; contact_info: string; party_size: number; reservation_date: string; reservation_time: string; table_id?: string | null; status: string; notes?: string | null; created_at: string }[];
      };

      if (!backup || typeof backup !== "object" || !backup.exported_at) {
        res.status(400).json({ error: "Invalid backup file format" });
        return;
      }

      const VALID_ROLES_SET = new Set(["customer", "staff", "kitchen_staff", "manager", "owner", "admin"]);
      const VALID_ORDER_STATUSES = new Set(["pending", "confirmed", "preparing", "ready", "delivered", "cancelled"]);
      const VALID_RES_STATUSES = new Set(["pending", "confirmed", "seated", "cancelled", "no_show"]);
      const VALID_CATEGORIES = new Set(["appetizer", "main", "dessert", "drink", "side", "special"]);

      const users = (backup.users ?? []).filter(
        (u) => u.id && u.email && u.full_name && VALID_ROLES_SET.has(u.role),
      );
      const menuItems = (backup.menu_items ?? []).filter(
        (m) => m.id && m.name && m.price && VALID_CATEGORIES.has(m.category),
      );
      const orders = (backup.orders ?? []).filter(
        (o) => o.id && o.customer_id && o.total_amount && VALID_ORDER_STATUSES.has(o.status),
      );
      const orderItems = (backup.order_items ?? []).filter(
        (i) => i.id && i.order_id && i.menu_item_id && i.quantity && i.subtotal,
      );
      const tableReservations = (backup.table_reservations ?? []).filter(
        (r) => r.id && r.customer_name && r.contact_info && r.reservation_date && VALID_RES_STATUSES.has(r.status),
      );

      await db.transaction(async (tx) => {
        if (menuItems.length > 0) {
          await tx
            .insert(menuItemsTable)
            .values(
              menuItems.map((m) => ({
                id: m.id,
                name: m.name,
                description: m.description ?? null,
                price: m.price,
                category: m.category as "appetizer" | "main" | "dessert" | "drink" | "side" | "special",
                is_available: m.is_available,
                sort_order: m.sort_order,
              })),
            )
            .onConflictDoUpdate({
              target: menuItemsTable.id,
              set: {
                name: sql`excluded.name`,
                description: sql`excluded.description`,
                price: sql`excluded.price`,
                category: sql`excluded.category`,
                is_available: sql`excluded.is_available`,
                sort_order: sql`excluded.sort_order`,
              },
            });
        }

        if (users.length > 0) {
          await tx
            .insert(usersTable)
            .values(
              users.map((u) => ({
                id: u.id,
                email: u.email.toLowerCase().trim(),
                password_hash: u.password_hash ?? "$2a$12$placeholder.hash.that.will.not.match.any.password",
                full_name: u.full_name,
                role: u.role as "customer" | "staff" | "kitchen_staff" | "manager" | "owner" | "admin",
                phone: u.phone ?? null,
                is_active: u.is_active,
                created_at: new Date(u.created_at),
              })),
            )
            .onConflictDoUpdate({
              target: usersTable.id,
              set: {
                email: sql`excluded.email`,
                full_name: sql`excluded.full_name`,
                role: sql`excluded.role`,
                phone: sql`excluded.phone`,
                is_active: sql`excluded.is_active`,
              },
            });
        }

        if (orders.length > 0) {
          await tx
            .insert(ordersTable)
            .values(
              orders.map((o) => ({
                id: o.id,
                customer_id: o.customer_id,
                status: o.status as "pending" | "confirmed" | "preparing" | "ready" | "delivered" | "cancelled",
                total_amount: o.total_amount,
                notes: o.notes ?? null,
                created_at: new Date(o.created_at),
              })),
            )
            .onConflictDoUpdate({
              target: ordersTable.id,
              set: {
                status: sql`excluded.status`,
                total_amount: sql`excluded.total_amount`,
                notes: sql`excluded.notes`,
              },
            });
        }

        if (orderItems.length > 0) {
          await tx
            .insert(orderItemsTable)
            .values(
              orderItems.map((i) => ({
                id: i.id,
                order_id: i.order_id,
                menu_item_id: i.menu_item_id,
                quantity: i.quantity,
                unit_price: i.unit_price,
                subtotal: i.subtotal,
              })),
            )
            .onConflictDoUpdate({
              target: orderItemsTable.id,
              set: {
                quantity: sql`excluded.quantity`,
                unit_price: sql`excluded.unit_price`,
                subtotal: sql`excluded.subtotal`,
              },
            });
        }

        if (tableReservations.length > 0) {
          await tx
            .insert(tableReservationsTable)
            .values(
              tableReservations.map((r) => ({
                id: r.id,
                customer_id: r.customer_id ?? null,
                customer_name: r.customer_name,
                contact_info: r.contact_info,
                party_size: r.party_size,
                reservation_date: r.reservation_date,
                reservation_time: r.reservation_time,
                table_id: r.table_id ?? null,
                status: r.status as "pending" | "confirmed" | "seated" | "cancelled" | "no_show",
                notes: r.notes ?? null,
                created_at: new Date(r.created_at),
              })),
            )
            .onConflictDoUpdate({
              target: tableReservationsTable.id,
              set: {
                status: sql`excluded.status`,
                table_id: sql`excluded.table_id`,
                notes: sql`excluded.notes`,
              },
            });
        }
      });

      logAudit(
        actor.userId,
        actor.email,
        "system.restored",
        `Restored backup from ${backup.exported_at}: ${users.length} users, ${menuItems.length} menu items, ${orders.length} orders, ${orderItems.length} order items, ${tableReservations.length} reservations`,
      );

      res.json({
        success: true,
        restored: {
          users: users.length,
          menu_items: menuItems.length,
          orders: orders.length,
          order_items: orderItems.length,
          table_reservations: tableReservations.length,
        },
      });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
