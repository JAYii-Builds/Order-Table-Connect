import { Router, type IRouter } from "express";
import { eq, desc, inArray, and } from "drizzle-orm";
import { randomUUID } from "crypto";
import { db, ordersTable, orderItemsTable, menuItemsTable, usersTable } from "@workspace/db";
import { requireAuth, requireRole } from "../middlewares/auth";
import { broadcast } from "../lib/sse";
import { sendOrderConfirmedEmail } from "../lib/resend";
import { sendSMS } from "../lib/sms";

const router: IRouter = Router();

type OrderStatus = "pending" | "confirmed" | "preparing" | "ready" | "delivered" | "cancelled";
const VALID_STATUSES: OrderStatus[] = [
  "pending",
  "confirmed",
  "preparing",
  "ready",
  "delivered",
  "cancelled",
];

type ItemRow = {
  id: string;
  order_id: string;
  menu_item_id: string;
  quantity: number;
  unit_price: string;
  subtotal: string;
  menu_item_name: string | null;
};

function serializeOrder(order: typeof ordersTable.$inferSelect, items: ItemRow[]) {
  return {
    id: order.id,
    customer_id: order.customer_id,
    status: order.status,
    total_amount: parseFloat(order.total_amount),
    notes: order.notes ?? null,
    created_at: order.created_at.toISOString(),
    updated_at: order.updated_at.toISOString(),
    items: items
      .filter((i) => i.order_id === order.id)
      .map((i) => ({
        id: i.id,
        order_id: i.order_id,
        menu_item_id: i.menu_item_id,
        menu_item_name: i.menu_item_name ?? "",
        quantity: i.quantity,
        unit_price: parseFloat(i.unit_price),
        subtotal: parseFloat(i.subtotal),
      })),
  };
}

async function fetchItemsForOrders(orderIds: string[]): Promise<ItemRow[]> {
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

router.post("/orders", requireAuth, async (req, res, next): Promise<void> => {
  try {
    const customer = req.user!;
    const { items, notes } = req.body as {
      items?: { menu_item_id: string; quantity: number }[];
      notes?: string;
    };

    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: "Order must have at least one item" });
      return;
    }

    const menuItemIds = items.map((i) => i.menu_item_id);
    const menuItems = await db
      .select()
      .from(menuItemsTable)
      .where(inArray(menuItemsTable.id, menuItemIds));

    for (const item of items) {
      const mi = menuItems.find((m) => m.id === item.menu_item_id);
      if (!mi) {
        res.status(400).json({ error: `Menu item not found: ${item.menu_item_id}` });
        return;
      }
      if (!mi.is_available) {
        res.status(400).json({ error: `"${mi.name}" is currently unavailable` });
        return;
      }
      if (!Number.isInteger(item.quantity) || item.quantity < 1) {
        res.status(400).json({ error: "Quantity must be at least 1" });
        return;
      }
    }

    const total = items.reduce((sum, item) => {
      const mi = menuItems.find((m) => m.id === item.menu_item_id)!;
      return sum + Number(mi.price) * item.quantity;
    }, 0);

    const orderId = randomUUID();

    const [order] = await db
      .insert(ordersTable)
      .values({
        id: orderId,
        customer_id: customer.userId,
        status: "pending",
        total_amount: total.toFixed(2),
        notes: notes ?? null,
      })
      .returning();

    const orderItemValues = items.map((item) => {
      const mi = menuItems.find((m) => m.id === item.menu_item_id)!;
      const unitPrice = Number(mi.price);
      return {
        id: randomUUID(),
        order_id: orderId,
        menu_item_id: item.menu_item_id,
        quantity: item.quantity,
        unit_price: unitPrice.toFixed(2),
        subtotal: (unitPrice * item.quantity).toFixed(2),
      };
    });

    const insertedItems = await db
      .insert(orderItemsTable)
      .values(orderItemValues)
      .returning();

    const enrichedItems: ItemRow[] = insertedItems.map((oi) => ({
      ...oi,
      menu_item_name: menuItems.find((m) => m.id === oi.menu_item_id)?.name ?? "",
    }));

    const serialized = serializeOrder(order, enrichedItems);
    res.status(201).json(serialized);
    broadcast({ type: "order:created", payload: { orderId, customerId: customer.userId } });
  } catch (err) {
    next(err);
  }
});

router.get("/orders", requireAuth, async (req, res, next): Promise<void> => {
  try {
    const user = req.user!;
    const isStaff = ["staff", "kitchen_staff", "manager", "owner", "admin"].includes(user.role);

    const orders = isStaff
      ? await db.select().from(ordersTable).where(eq(ordersTable.is_archived, false)).orderBy(desc(ordersTable.created_at))
      : await db
          .select()
          .from(ordersTable)
          .where(eq(ordersTable.customer_id, user.userId))
          .orderBy(desc(ordersTable.created_at));

    if (orders.length === 0) {
      res.json([]);
      return;
    }

    const orderIds = orders.map((o) => o.id);
    const allItems = await fetchItemsForOrders(orderIds);

    res.json(orders.map((o) => serializeOrder(o, allItems)));
  } catch (err) {
    next(err);
  }
});

router.get("/orders/:id", requireAuth, async (req, res, next): Promise<void> => {
  try {
    const user = req.user!;
    const id = String(req.params.id);

    const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, id));

    if (!order) {
      res.status(404).json({ error: "Order not found" });
      return;
    }

    const isStaff = ["staff", "kitchen_staff", "manager", "owner", "admin"].includes(user.role);
    if (!isStaff && order.customer_id !== user.userId) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const items = await fetchItemsForOrders([id]);
    res.json(serializeOrder(order, items));
  } catch (err) {
    next(err);
  }
});

router.patch(
  "/orders/:id/status",
  requireAuth,
  requireRole("staff", "kitchen_staff", "manager", "owner", "admin"),
  async (req, res, next): Promise<void> => {
    try {
      const id = String(req.params.id);
      const { status } = req.body as { status?: string };

      if (!status || !VALID_STATUSES.includes(status as OrderStatus)) {
        res
          .status(400)
          .json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}` });
        return;
      }

      const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, id));
      if (!order) {
        res.status(404).json({ error: "Order not found" });
        return;
      }

      const [updated] = await db
        .update(ordersTable)
        .set({ status: status as OrderStatus, updated_at: new Date() })
        .where(eq(ordersTable.id, id))
        .returning();

      const items = await fetchItemsForOrders([id]);
      const serialized = serializeOrder(updated, items);
      res.json(serialized);
      broadcast({ type: "order:updated", payload: { orderId: id, status: updated.status } });

      if (status === "confirmed") {
        const [customer] = await db
          .select({ email: usersTable.email, full_name: usersTable.full_name, phone: usersTable.phone })
          .from(usersTable)
          .where(eq(usersTable.id, order.customer_id))
          .limit(1);
        if (customer) {
          sendOrderConfirmedEmail(customer.email, customer.full_name, id, parseFloat(order.total_amount)).catch(() => {});
          if (customer.phone) sendSMS(customer.phone, `Hi ${customer.full_name}, your TableServe order #${id.slice(0, 8).toUpperCase()} has been confirmed! Total: ₱${parseFloat(order.total_amount).toFixed(2)}`).catch(() => {});
        }
      }
    } catch (err) {
      next(err);
    }
  },
);

export default router;
