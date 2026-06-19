import { Router, type IRouter } from "express";
import { eq, and, desc, avg } from "drizzle-orm";
import { randomUUID } from "crypto";
import { db, feedbackTable, ordersTable, usersTable } from "@workspace/db";
import { requireAuth, requireRole } from "../middlewares/auth";

const router: IRouter = Router();

// POST /feedback — customer submits rating for a delivered order
router.post("/feedback", requireAuth, requireRole("customer"), async (req, res, next): Promise<void> => {
  try {
    const customerId = req.user!.userId;
    const { order_id, rating, comment } = req.body as {
      order_id?: string;
      rating?: number;
      comment?: string;
    };

    if (!order_id || rating === undefined) {
      res.status(400).json({ error: "order_id and rating are required" });
      return;
    }
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      res.status(400).json({ error: "rating must be an integer between 1 and 5" });
      return;
    }

    const [order] = await db
      .select()
      .from(ordersTable)
      .where(and(eq(ordersTable.id, order_id), eq(ordersTable.customer_id, customerId)));

    if (!order) {
      res.status(404).json({ error: "Order not found" });
      return;
    }
    if (order.status !== "delivered") {
      res.status(400).json({ error: "Feedback can only be submitted for delivered orders" });
      return;
    }

    const [existing] = await db
      .select()
      .from(feedbackTable)
      .where(and(eq(feedbackTable.order_id, order_id), eq(feedbackTable.customer_id, customerId)));

    if (existing) {
      res.status(409).json({ error: "You have already submitted feedback for this order" });
      return;
    }

    const [fb] = await db
      .insert(feedbackTable)
      .values({
        id: randomUUID(),
        order_id,
        customer_id: customerId,
        rating,
        comment: comment?.trim() || null,
      })
      .returning();

    res.status(201).json({
      id: fb.id,
      order_id: fb.order_id,
      rating: fb.rating,
      comment: fb.comment ?? null,
      created_at: fb.created_at.toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

// GET /feedback/my — customer sees their own feedback
router.get("/feedback/my", requireAuth, requireRole("customer"), async (req, res, next): Promise<void> => {
  try {
    const rows = await db
      .select()
      .from(feedbackTable)
      .where(eq(feedbackTable.customer_id, req.user!.userId))
      .orderBy(desc(feedbackTable.created_at));

    res.json(rows.map((r) => ({
      id: r.id,
      order_id: r.order_id,
      rating: r.rating,
      comment: r.comment ?? null,
      created_at: r.created_at.toISOString(),
    })));
  } catch (err) {
    next(err);
  }
});

// GET /feedback — manager/admin sees all feedback with customer info
router.get(
  "/feedback",
  requireAuth,
  requireRole("manager", "owner", "admin"),
  async (_req, res, next): Promise<void> => {
    try {
      const rows = await db
        .select({
          id: feedbackTable.id,
          order_id: feedbackTable.order_id,
          customer_id: feedbackTable.customer_id,
          rating: feedbackTable.rating,
          comment: feedbackTable.comment,
          created_at: feedbackTable.created_at,
          customer_name: usersTable.full_name,
          customer_email: usersTable.email,
        })
        .from(feedbackTable)
        .leftJoin(usersTable, eq(feedbackTable.customer_id, usersTable.id))
        .orderBy(desc(feedbackTable.created_at));

      const [avgRow] = await db
        .select({ avg: avg(feedbackTable.rating) })
        .from(feedbackTable);

      res.json({
        average_rating: avgRow?.avg ? parseFloat(String(avgRow.avg)) : null,
        items: rows.map((r) => ({
          id: r.id,
          order_id: r.order_id,
          customer_id: r.customer_id,
          customer_name: r.customer_name ?? "Unknown",
          rating: r.rating,
          comment: r.comment ?? null,
          created_at: r.created_at.toISOString(),
        })),
      });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
