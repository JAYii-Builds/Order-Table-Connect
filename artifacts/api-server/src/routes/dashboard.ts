import { Router, type IRouter } from "express";
import { count, eq, and, gt, gte, sum, sql, ne, inArray } from "drizzle-orm";
import { db, usersTable, sessionsTable, ordersTable, walkInsTable, tableReservationsTable } from "@workspace/db";
import { requireAuth, requireRole } from "../middlewares/auth";

const router: IRouter = Router();

function mockActivity(role: string) {
  const now = new Date();
  const items = [
    { id: "1", description: `Welcome to the ${role} dashboard`, type: "info", timestamp: now.toISOString() },
    { id: "2", description: "System is running normally", type: "system", timestamp: new Date(now.getTime() - 60000).toISOString() },
    { id: "3", description: "Last login was successful", type: "auth", timestamp: new Date(now.getTime() - 120000).toISOString() },
  ];
  return items;
}

function todayStart(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function monthStart(): Date {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

router.get(
  "/dashboard/customer",
  requireAuth,
  requireRole("customer"),
  async (req, res): Promise<void> => {
    res.json({
      role: "customer",
      total_orders: 0,
      pending_reservations: 0,
      loyalty_points: 0,
      recent_activity: mockActivity("customer"),
    });
  }
);

router.get(
  "/dashboard/staff",
  requireAuth,
  requireRole("staff"),
  async (req, res): Promise<void> => {
    const todayStr = todayDateString();

    const [seatedWalkIns, seatedReservations, pendingOrders, todaysReservations] = await Promise.all([
      db.select({ count: count() }).from(walkInsTable).where(eq(walkInsTable.status, "seated")),
      db.select({ count: count() }).from(tableReservationsTable).where(eq(tableReservationsTable.status, "seated")),
      db
        .select({ count: count() })
        .from(ordersTable)
        .where(and(inArray(ordersTable.status, ["pending", "confirmed"]), eq(ordersTable.is_archived, false))),
      db
        .select({ count: count() })
        .from(tableReservationsTable)
        .where(
          and(
            eq(tableReservationsTable.reservation_date, todayStr),
            inArray(tableReservationsTable.status, ["pending", "confirmed"]),
          ),
        ),
    ]);

    res.json({
      role: "staff",
      active_tables: Number(seatedWalkIns[0]?.count ?? 0) + Number(seatedReservations[0]?.count ?? 0),
      pending_orders: Number(pendingOrders[0]?.count ?? 0),
      todays_reservations: Number(todaysReservations[0]?.count ?? 0),
      recent_activity: mockActivity("staff"),
    });
  }
);

router.get(
  "/dashboard/kitchen",
  requireAuth,
  requireRole("kitchen_staff"),
  async (req, res): Promise<void> => {
    const start = todayStart();

    const [queueRows, completedRow, avgRow] = await Promise.all([
      db
        .select({ count: count() })
        .from(ordersTable)
        .where(inArray(ordersTable.status, ["confirmed", "preparing"])),

      db
        .select({ count: count() })
        .from(ordersTable)
        .where(and(gte(ordersTable.created_at, start), eq(ordersTable.status, "ready"))),

      db
        .select({
          avg_minutes: sql<number>`COALESCE(AVG(EXTRACT(EPOCH FROM (${ordersTable.updated_at} - ${ordersTable.created_at})) / 60), 0)`,
        })
        .from(ordersTable)
        .where(and(gte(ordersTable.created_at, start), eq(ordersTable.status, "ready"))),
    ]);

    res.json({
      role: "kitchen_staff",
      orders_in_queue: Number(queueRows[0]?.count ?? 0),
      orders_completed_today: Number(completedRow[0]?.count ?? 0),
      avg_prep_time_minutes: Math.round(Number(avgRow[0]?.avg_minutes ?? 0) * 10) / 10,
      recent_activity: mockActivity("kitchen staff"),
    });
  }
);

router.get(
  "/dashboard/manager",
  requireAuth,
  requireRole("manager"),
  async (req, res): Promise<void> => {
    const start = todayStart();

    const [staffCount, orderRows, statusRows, fulfillmentRow] = await Promise.all([
      db
        .select({ count: count() })
        .from(usersTable)
        .where(and(eq(usersTable.role, "staff"), eq(usersTable.is_active, true))),

      db
        .select({
          total_revenue: sum(ordersTable.total_amount),
          total_orders: count(),
        })
        .from(ordersTable)
        .where(and(gte(ordersTable.created_at, start), ne(ordersTable.status, "cancelled"))),

      db
        .select({ status: ordersTable.status, cnt: count() })
        .from(ordersTable)
        .where(gte(ordersTable.created_at, start))
        .groupBy(ordersTable.status),

      db
        .select({
          avg_minutes: sql<number>`COALESCE(AVG(EXTRACT(EPOCH FROM (${ordersTable.updated_at} - ${ordersTable.created_at})) / 60), 0)`,
        })
        .from(ordersTable)
        .where(and(gte(ordersTable.created_at, start), eq(ordersTable.status, "delivered"))),
    ]);

    const counts = { pending: 0, confirmed: 0, preparing: 0, ready: 0, delivered: 0, cancelled: 0 };
    for (const row of statusRows) {
      if (row.status in counts) counts[row.status as keyof typeof counts] = Number(row.cnt);
    }

    res.json({
      role: "manager",
      total_revenue_today: Number(orderRows[0]?.total_revenue ?? 0),
      total_orders_today: Number(orderRows[0]?.total_orders ?? 0),
      staff_on_duty: Number(staffCount[0]?.count ?? 0),
      avg_fulfillment_minutes: Math.round(Number(fulfillmentRow[0]?.avg_minutes ?? 0) * 10) / 10,
      order_counts_by_status: counts,
      recent_activity: mockActivity("manager"),
    });
  }
);

router.get(
  "/dashboard/owner",
  requireAuth,
  requireRole("owner"),
  async (req, res): Promise<void> => {
    const start = monthStart();

    const [customerCount, staffCount, monthlyOrders] = await Promise.all([
      db.select({ count: count() }).from(usersTable).where(eq(usersTable.role, "customer")),
      db
        .select({ count: count() })
        .from(usersTable)
        .where(and(eq(usersTable.is_active, true))),
      db
        .select({ total_revenue: sum(ordersTable.total_amount), total_orders: count() })
        .from(ordersTable)
        .where(and(gte(ordersTable.created_at, start), ne(ordersTable.status, "cancelled"))),
    ]);

    res.json({
      role: "owner",
      total_revenue_month: Number(monthlyOrders[0]?.total_revenue ?? 0),
      total_orders_month: Number(monthlyOrders[0]?.total_orders ?? 0),
      total_customers: customerCount[0]?.count ?? 0,
      total_staff: staffCount[0]?.count ?? 0,
      recent_activity: mockActivity("owner"),
    });
  }
);

router.get(
  "/dashboard/admin",
  requireAuth,
  requireRole("admin"),
  async (req, res): Promise<void> => {
    const [userCount, sessionCount] = await Promise.all([
      db.select({ count: count() }).from(usersTable),
      db
        .select({ count: count() })
        .from(sessionsTable)
        .where(
          and(
            eq(sessionsTable.is_active, true),
            gt(sessionsTable.expires_at, new Date())
          )
        ),
    ]);

    res.json({
      role: "admin",
      total_users: userCount[0]?.count ?? 0,
      active_sessions: sessionCount[0]?.count ?? 0,
      system_status: "healthy",
      recent_activity: mockActivity("admin"),
    });
  }
);

export default router;
