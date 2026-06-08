import { Router, type IRouter } from "express";
import { count, eq, and, gt } from "drizzle-orm";
import { db, usersTable, sessionsTable } from "@workspace/db";
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
    res.json({
      role: "staff",
      active_tables: 0,
      pending_orders: 0,
      todays_reservations: 0,
      recent_activity: mockActivity("staff"),
    });
  }
);

router.get(
  "/dashboard/kitchen",
  requireAuth,
  requireRole("kitchen_staff"),
  async (req, res): Promise<void> => {
    res.json({
      role: "kitchen_staff",
      orders_in_queue: 0,
      orders_completed_today: 0,
      avg_prep_time_minutes: 0,
      recent_activity: mockActivity("kitchen staff"),
    });
  }
);

router.get(
  "/dashboard/manager",
  requireAuth,
  requireRole("manager"),
  async (req, res): Promise<void> => {
    const staffCount = await db
      .select({ count: count() })
      .from(usersTable)
      .where(and(eq(usersTable.role, "staff"), eq(usersTable.is_active, true)));

    res.json({
      role: "manager",
      total_revenue_today: 0,
      total_orders_today: 0,
      staff_on_duty: staffCount[0]?.count ?? 0,
      pending_issues: 0,
      recent_activity: mockActivity("manager"),
    });
  }
);

router.get(
  "/dashboard/owner",
  requireAuth,
  requireRole("owner"),
  async (req, res): Promise<void> => {
    const [customerCount, staffCount] = await Promise.all([
      db.select({ count: count() }).from(usersTable).where(eq(usersTable.role, "customer")),
      db.select({ count: count() }).from(usersTable).where(
        and(
          eq(usersTable.is_active, true)
        )
      ),
    ]);

    res.json({
      role: "owner",
      total_revenue_month: 0,
      total_orders_month: 0,
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
