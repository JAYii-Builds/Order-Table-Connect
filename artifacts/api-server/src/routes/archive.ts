import { Router, type IRouter } from "express";
import { eq, and, or, inArray, desc } from "drizzle-orm";
import { db, ordersTable, orderItemsTable, menuItemsTable } from "@workspace/db";
import { requireAuth, requireRole } from "../middlewares/auth";
import { logAudit } from "../lib/audit";

const router: IRouter = Router();

async function fetchItemsForOrders(orderIds: string[]) {
  if (orderIds.length === 0) return [];
  return db
    .select({
      id: orderItemsTable.id,
      order_id: orderItemsTable.order_id,
      menu_item_id: orderItemsTable.menu_item_id,
      quantity: orderItemsTable.quantity,
      unit_price: orderItemsTable.unit_price,
      subtotal: orderItemsTable.subtotal,
      menu_item_name: menuItemsTable.name,
    })
    .from(orderItemsTable)
    .leftJoin(menuItemsTable, eq(orderItemsTable.menu_item_id, menuItemsTable.id))
    .where(inArray(orderItemsTable.order_id, orderIds));
}

// GET /api/archive — list archived orders with items
router.get(
  "/archive",
  requireAuth,
  requireRole("manager", "admin"),
  async (req, res, next): Promise<void> => {
    try {
      const orders = await db
        .select()
        .from(ordersTable)
        .where(eq(ordersTable.is_archived, true))
        .orderBy(desc(ordersTable.created_at));

      const items = await fetchItemsForOrders(orders.map((o) => o.id));

      const itemsByOrder = items.reduce(
        (acc, item) => {
          if (!acc[item.order_id]) acc[item.order_id] = [];
          acc[item.order_id].push(item);
          return acc;
        },
        {} as Record<string, typeof items>,
      );

      res.json(
        orders.map((o) => ({
          id: o.id,
          customer_id: o.customer_id,
          status: o.status,
          total_amount: parseFloat(o.total_amount),
          notes: o.notes ?? null,
          created_at: o.created_at.toISOString(),
          updated_at: o.updated_at.toISOString(),
          items: (itemsByOrder[o.id] ?? []).map((i) => ({
            id: i.id,
            menu_item_name: i.menu_item_name ?? "",
            quantity: i.quantity,
            subtotal: parseFloat(i.subtotal),
          })),
        })),
      );
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/archive/:id — archive a single order
router.post(
  "/archive/:id",
  requireAuth,
  requireRole("manager", "admin"),
  async (req, res, next): Promise<void> => {
    try {
      const id = String(req.params.id);
      const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, id)).limit(1);

      if (!order) {
        res.status(404).json({ error: "Order not found" });
        return;
      }
      if (!["delivered", "cancelled"].includes(order.status)) {
        res.status(400).json({ error: "Only delivered or cancelled orders can be archived" });
        return;
      }

      await db.update(ordersTable).set({ is_archived: true }).where(eq(ordersTable.id, id));
      logAudit(req.user!.userId, "Manager", "order.archived", `Order ${id.slice(0, 8).toUpperCase()} archived`);
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  },
);

// DELETE /api/archive/:id — restore an archived order
router.delete(
  "/archive/:id",
  requireAuth,
  requireRole("manager", "admin"),
  async (req, res, next): Promise<void> => {
    try {
      const id = String(req.params.id);
      await db.update(ordersTable).set({ is_archived: false }).where(eq(ordersTable.id, id));
      logAudit(req.user!.userId, "Manager", "order.restored", `Order ${id.slice(0, 8).toUpperCase()} restored from archive`);
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/archive/bulk — archive all delivered + cancelled orders at once
router.post(
  "/archive/bulk",
  requireAuth,
  requireRole("manager", "admin"),
  async (req, res, next): Promise<void> => {
    try {
      await db
        .update(ordersTable)
        .set({ is_archived: true })
        .where(
          and(
            or(eq(ordersTable.status, "delivered"), eq(ordersTable.status, "cancelled"))!,
            eq(ordersTable.is_archived, false),
          ),
        );
      logAudit(req.user!.userId, "Manager", "order.bulk_archived", "Bulk archived all completed/cancelled orders");
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
