import { Router, type IRouter } from "express";
import { lt, count, sql } from "drizzle-orm";
import {
  db,
  usersTable,
  sessionsTable,
  menuItemsTable,
  ordersTable,
  orderItemsTable,
  auditLogsTable,
  feedbackTable,
  refundsTable,
  tableReservationsTable,
} from "@workspace/db";
import { requireAuth, requireRole } from "../middlewares/auth";
import { logAudit } from "../lib/audit";

const router: IRouter = Router();

// GET /api/admin/maintenance/stats — system record counts
router.get(
  "/admin/maintenance/stats",
  requireAuth,
  requireRole("admin"),
  async (req, res, next): Promise<void> => {
    try {
      const [[users], [sessions], [menuItems], [orders], [orderItems], [reservations], [refunds], [feedback], [auditLogs]] =
        await Promise.all([
          db.select({ count: count() }).from(usersTable),
          db.select({ count: count() }).from(sessionsTable),
          db.select({ count: count() }).from(menuItemsTable),
          db.select({ count: count() }).from(ordersTable),
          db.select({ count: count() }).from(orderItemsTable),
          db.select({ count: count() }).from(tableReservationsTable),
          db.select({ count: count() }).from(refundsTable),
          db.select({ count: count() }).from(feedbackTable),
          db.select({ count: count() }).from(auditLogsTable),
        ]);

      const [expiredSessions] = await db
        .select({ count: count() })
        .from(sessionsTable)
        .where(lt(sessionsTable.expires_at, new Date()));

      res.json({
        users: users.count,
        sessions: sessions.count,
        expired_sessions: expiredSessions.count,
        menu_items: menuItems.count,
        orders: orders.count,
        order_items: orderItems.count,
        reservations: reservations.count,
        refunds: refunds.count,
        feedback: feedback.count,
        audit_logs: auditLogs.count,
      });
    } catch (err) {
      next(err);
    }
  },
);

// DELETE /api/admin/maintenance/sessions — clear expired sessions
router.delete(
  "/admin/maintenance/sessions",
  requireAuth,
  requireRole("admin"),
  async (req, res, next): Promise<void> => {
    try {
      const [{ count: before }] = await db.select({ count: count() }).from(sessionsTable).where(lt(sessionsTable.expires_at, new Date()));
      await db.delete(sessionsTable).where(lt(sessionsTable.expires_at, new Date()));
      logAudit(req.user!.userId, "Admin", "maintenance.clear_sessions", `Cleared ${before} expired sessions`);
      res.json({ deleted: before });
    } catch (err) {
      next(err);
    }
  },
);

// DELETE /api/admin/maintenance/audit-logs — clear audit logs older than 90 days
router.delete(
  "/admin/maintenance/audit-logs",
  requireAuth,
  requireRole("admin"),
  async (req, res, next): Promise<void> => {
    try {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 90);
      const [{ count: before }] = await db.select({ count: count() }).from(auditLogsTable).where(lt(auditLogsTable.created_at, cutoff));
      await db.delete(auditLogsTable).where(lt(auditLogsTable.created_at, cutoff));
      logAudit(req.user!.userId, "Admin", "maintenance.clear_audit_logs", `Cleared ${before} audit log entries older than 90 days`);
      res.json({ deleted: before });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
