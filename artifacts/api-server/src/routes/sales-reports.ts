import { Router, type IRouter } from "express";
import { gte, and, eq, sql } from "drizzle-orm";
import { db, ordersTable, orderItemsTable, menuItemsTable } from "@workspace/db";
import { requireAuth, requireRole } from "../middlewares/auth";

const router: IRouter = Router();

function periodStart(period: string): Date {
  const now = new Date();
  if (period === "today") {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }
  if (period === "week") {
    const d = new Date(now);
    d.setDate(d.getDate() - 6);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  // month
  const d = new Date(now);
  d.setDate(d.getDate() - 29);
  d.setHours(0, 0, 0, 0);
  return d;
}

// GET /sales/reports?period=today|week|month
router.get(
  "/sales/reports",
  requireAuth,
  requireRole("manager", "owner", "admin"),
  async (req, res, next): Promise<void> => {
    try {
      const period = (req.query.period as string) || "today";
      const from = periodStart(period);

      // Revenue + order counts in period, grouped by day
      const dailyRows = await db
        .select({
          day: sql<string>`DATE(${ordersTable.created_at})`.as("day"),
          revenue: sql<string>`COALESCE(SUM(${ordersTable.total_amount}), 0)`.as("revenue"),
          order_count: sql<number>`COUNT(*)`.as("order_count"),
        })
        .from(ordersTable)
        .where(
          and(
            gte(ordersTable.created_at, from),
            eq(ordersTable.status, "delivered"),
          ),
        )
        .groupBy(sql`DATE(${ordersTable.created_at})`)
        .orderBy(sql`DATE(${ordersTable.created_at})`);

      // Top items by quantity sold
      const topItems = await db
        .select({
          menu_item_id: orderItemsTable.menu_item_id,
          name: menuItemsTable.name,
          quantity: sql<number>`SUM(${orderItemsTable.quantity})`.as("quantity"),
          revenue: sql<string>`SUM(${orderItemsTable.subtotal})`.as("revenue"),
        })
        .from(orderItemsTable)
        .innerJoin(ordersTable, eq(orderItemsTable.order_id, ordersTable.id))
        .innerJoin(menuItemsTable, eq(orderItemsTable.menu_item_id, menuItemsTable.id))
        .where(
          and(
            gte(ordersTable.created_at, from),
            eq(ordersTable.status, "delivered"),
          ),
        )
        .groupBy(orderItemsTable.menu_item_id, menuItemsTable.name)
        .orderBy(sql`SUM(${orderItemsTable.quantity}) DESC`)
        .limit(10);

      const totalRevenue = dailyRows.reduce((s, r) => s + Number(r.revenue), 0);
      const totalOrders = dailyRows.reduce((s, r) => s + Number(r.order_count), 0);

      res.json({
        period,
        from: from.toISOString(),
        total_revenue: totalRevenue,
        total_orders: totalOrders,
        daily: dailyRows.map((r) => ({
          day: r.day,
          revenue: Number(r.revenue),
          order_count: Number(r.order_count),
        })),
        top_items: topItems.map((r) => ({
          menu_item_id: r.menu_item_id,
          name: r.name,
          quantity: Number(r.quantity),
          revenue: Number(r.revenue),
        })),
      });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
