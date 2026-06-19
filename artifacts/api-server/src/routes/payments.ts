import { Router, type IRouter } from "express";
import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { db, ordersTable, orderItemsTable, menuItemsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";
import { broadcast } from "../lib/sse";

const router: IRouter = Router();

const PAYMONGO_BASE = "https://api.paymongo.com/v1";

function paymongoAuth(): string {
  const key = process.env.PAYMONGO_SECRET_KEY ?? "";
  return `Basic ${Buffer.from(`${key}:`).toString("base64")}`;
}

interface CreateLinkBody {
  items: { menu_item_id: string; quantity: number }[];
  notes?: string | null;
}

// POST /payments/create-link — creates order + PayMongo payment link
router.post("/payments/create-link", requireAuth, async (req, res, next): Promise<void> => {
  try {
    const user = req.user!;
    const { items, notes } = req.body as CreateLinkBody;

    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: "items are required" });
      return;
    }

    // Fetch menu items to compute prices
    const menuItemIds = items.map((i) => i.menu_item_id);
    const menuItems = await db
      .select()
      .from(menuItemsTable)
      .where(eq(menuItemsTable.is_available, true));

    const menuMap = new Map(menuItems.map((m) => [m.id, m]));

    let totalAmount = 0;
    const orderItemValues: {
      id: string;
      order_id: string;
      menu_item_id: string;
      quantity: number;
      unit_price: string;
      subtotal: string;
    }[] = [];

    const orderId = randomUUID();

    for (const item of items) {
      const menuItem = menuMap.get(item.menu_item_id);
      if (!menuItem) {
        res.status(400).json({ error: `Menu item not found: ${item.menu_item_id}` });
        return;
      }
      if (!Number.isInteger(item.quantity) || item.quantity < 1) {
        res.status(400).json({ error: "quantity must be a positive integer" });
        return;
      }
      const unitPrice = Number(menuItem.price);
      const subtotal = unitPrice * item.quantity;
      totalAmount += subtotal;
      orderItemValues.push({
        id: randomUUID(),
        order_id: orderId,
        menu_item_id: item.menu_item_id,
        quantity: item.quantity,
        unit_price: unitPrice.toFixed(2),
        subtotal: subtotal.toFixed(2),
      });
    }

    // Create order in DB as pending
    await db.insert(ordersTable).values({
      id: orderId,
      customer_id: user.userId,
      status: "pending",
      total_amount: totalAmount.toFixed(2) as unknown as number,
      notes: notes ?? null,
    });

    await db.insert(orderItemsTable).values(orderItemValues);

    // Create PayMongo payment link
    const amountInCentavos = Math.round(totalAmount * 100);
    const paymongoRes = await fetch(`${PAYMONGO_BASE}/links`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: paymongoAuth(),
      },
      body: JSON.stringify({
        data: {
          attributes: {
            amount: amountInCentavos,
            description: `TableServe Order #${orderId.slice(0, 8).toUpperCase()}`,
            remarks: `order:${orderId}`,
          },
        },
      }),
    });

    if (!paymongoRes.ok) {
      const errBody = await paymongoRes.json().catch(() => ({}));
      console.error("PayMongo error:", errBody);
      // Roll back order if PayMongo fails
      await db.delete(orderItemsTable).where(eq(orderItemsTable.order_id, orderId));
      await db.delete(ordersTable).where(eq(ordersTable.id, orderId));
      res.status(502).json({ error: "Payment gateway error. Please try again." });
      return;
    }

    const paymongoData = (await paymongoRes.json()) as {
      data: { id: string; attributes: { checkout_url: string; status: string } };
    };

    const linkId = paymongoData.data.id;
    const checkoutUrl = paymongoData.data.attributes.checkout_url;

    broadcast({ type: "order:created", payload: { orderId } });

    res.status(201).json({ order_id: orderId, link_id: linkId, checkout_url: checkoutUrl });
  } catch (err) {
    next(err);
  }
});

// GET /payments/status/:linkId — check payment status and confirm order if paid
router.get("/payments/status/:linkId", requireAuth, async (req, res, next): Promise<void> => {
  try {
    const linkId = String(req.params.linkId);
    const orderId = String(req.query.order_id ?? "");

    if (!orderId) {
      res.status(400).json({ error: "order_id query param required" });
      return;
    }

    const paymongoRes = await fetch(`${PAYMONGO_BASE}/links/${linkId}`, {
      headers: { Authorization: paymongoAuth() },
    });

    if (!paymongoRes.ok) {
      res.status(502).json({ error: "Failed to check payment status" });
      return;
    }

    const paymongoData = (await paymongoRes.json()) as {
      data: { attributes: { status: string } };
    };

    const linkStatus = paymongoData.data.attributes.status;
    const paid = linkStatus === "paid";

    if (paid) {
      // Confirm the order
      const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId));
      if (order && order.status === "pending") {
        await db
          .update(ordersTable)
          .set({ status: "confirmed", updated_at: new Date() })
          .where(eq(ordersTable.id, orderId));
        broadcast({ type: "order:updated", payload: { orderId, status: "confirmed" } });
      }
    }

    res.json({ paid, link_status: linkStatus });
  } catch (err) {
    next(err);
  }
});

export default router;
