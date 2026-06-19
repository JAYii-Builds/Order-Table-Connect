import { Router, type IRouter } from "express";
import { desc } from "drizzle-orm";
import { db, auditLogsTable } from "@workspace/db";
import { requireAuth, requireRole } from "../middlewares/auth";

const router: IRouter = Router();

// GET /audit-logs — admin only, latest 200 entries
router.get(
  "/audit-logs",
  requireAuth,
  requireRole("admin"),
  async (_req, res, next): Promise<void> => {
    try {
      const rows = await db
        .select()
        .from(auditLogsTable)
        .orderBy(desc(auditLogsTable.created_at))
        .limit(200);

      res.json(
        rows.map((r) => ({
          id: r.id,
          actor_id: r.actor_id,
          actor_name: r.actor_name,
          action: r.action,
          details: r.details,
          created_at: r.created_at.toISOString(),
        })),
      );
    } catch (err) {
      next(err);
    }
  },
);

export default router;
