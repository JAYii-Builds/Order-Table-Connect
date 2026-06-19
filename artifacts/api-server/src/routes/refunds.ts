import { Router, type IRouter } from "express";
import { eq, and, desc } from "drizzle-orm";
import { randomUUID } from "crypto";
import { db, refundsTable, ordersTable, usersTable } from "@workspace/db";
import { requireAuth, requireRole } from "../middlewares/auth";
import { broadcast } from "../lib/sse";
import { logAudit } from "../lib/audit";
import { sendRefundApprovedEmail, sendRefundRejectedEmail } from "../lib/resend";
import { sendSMS } from "../lib/sms";

const router: IRouter = Router();

// Refunds >= this amount (in pesos) require owner approval
const HIGH_VALUE_THRESHOLD = 500;

type RefundStatus = "pending" | "manager_approved" | "owner_approved" | "rejected" | "completed";

function serializeRefund(r: typeof refundsTable.$inferSelect) {
  return {
    id: r.id,
    order_id: r.order_id,
    customer_id: r.customer_id,
    reason: r.reason,
    amount: Number(r.amount),
    status: r.status,
    requested_at: r.requested_at.toISOString(),
    resolved_at: r.resolved_at?.toISOString() ?? null,
  };
}

// POST /refunds — customer requests a refund on a delivered or confirmed order
router.post("/refunds", requireAuth, requireRole("customer"), async (req, res, next): Promise<void> => {
  try {
    const { order_id, reason } = req.body as { order_id?: string; reason?: string };
    const customerId = req.user!.userId;

    if (!order_id || !reason?.trim()) {
      res.status(400).json({ error: "order_id and reason are required" });
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

    if (order.status !== "delivered" && order.status !== "confirmed") {
      res.status(400).json({ error: "Refunds can only be requested for confirmed or delivered orders" });
      return;
    }

    // Check if a pending/approved refund already exists for this order
    const [existing] = await db
      .select()
      .from(refundsTable)
      .where(and(
        eq(refundsTable.order_id, order_id),
        eq(refundsTable.customer_id, customerId),
      ));

    if (existing && existing.status !== "rejected") {
      res.status(409).json({ error: "A refund request already exists for this order" });
      return;
    }

    const [refund] = await db
      .insert(refundsTable)
      .values({
        id: randomUUID(),
        order_id,
        customer_id: customerId,
        reason: reason.trim(),
        amount: order.total_amount,
        status: "pending",
      })
      .returning();

    res.status(201).json(serializeRefund(refund));
    broadcast({ type: "refund:created", payload: { refundId: refund.id } });
  } catch (err) {
    next(err);
  }
});

// GET /refunds/my — customer sees their own refunds
router.get("/refunds/my", requireAuth, requireRole("customer"), async (req, res, next): Promise<void> => {
  try {
    const rows = await db
      .select()
      .from(refundsTable)
      .where(eq(refundsTable.customer_id, req.user!.userId))
      .orderBy(desc(refundsTable.requested_at));

    res.json(rows.map(serializeRefund));
  } catch (err) {
    next(err);
  }
});

// GET /refunds — manager/owner sees all refunds, optional ?status= filter
router.get(
  "/refunds",
  requireAuth,
  requireRole("manager", "owner", "admin"),
  async (req, res, next): Promise<void> => {
    try {
      const { status } = req.query as { status?: string };

      const rows = status
        ? await db
            .select()
            .from(refundsTable)
            .where(eq(refundsTable.status, status as RefundStatus))
            .orderBy(desc(refundsTable.requested_at))
        : await db
            .select()
            .from(refundsTable)
            .orderBy(desc(refundsTable.requested_at));

      res.json(rows.map(serializeRefund));
    } catch (err) {
      next(err);
    }
  },
);

// PATCH /refunds/:id — manager or owner updates status
router.patch(
  "/refunds/:id",
  requireAuth,
  requireRole("manager", "owner", "admin"),
  async (req, res, next): Promise<void> => {
    try {
      const id = String(req.params.id);
      const { action } = req.body as { action?: "approve" | "reject" };
      const actorRole = req.user!.role;

      if (!action || !["approve", "reject"].includes(action)) {
        res.status(400).json({ error: "action must be 'approve' or 'reject'" });
        return;
      }

      const [refund] = await db
        .select()
        .from(refundsTable)
        .where(eq(refundsTable.id, id));

      if (!refund) {
        res.status(404).json({ error: "Refund not found" });
        return;
      }

      let nextStatus: RefundStatus;

      if (actorRole === "manager" || actorRole === "admin") {
        if (refund.status !== "pending") {
          res.status(400).json({ error: "Manager can only act on pending refunds" });
          return;
        }
        if (action === "reject") {
          nextStatus = "rejected";
        } else {
          // Auto-complete if below threshold, escalate to owner if at/above
          nextStatus = Number(refund.amount) < HIGH_VALUE_THRESHOLD ? "completed" : "manager_approved";
        }
      } else if (actorRole === "owner") {
        if (refund.status !== "manager_approved") {
          res.status(400).json({ error: "Owner can only act on manager-approved refunds" });
          return;
        }
        nextStatus = action === "approve" ? "completed" : "rejected";
      } else {
        res.status(403).json({ error: "Insufficient permissions" });
        return;
      }

      const [updated] = await db
        .update(refundsTable)
        .set({
          status: nextStatus,
          resolved_at: ["rejected", "completed"].includes(nextStatus) ? new Date() : null,
        })
        .where(eq(refundsTable.id, id))
        .returning();

      res.json(serializeRefund(updated));
      broadcast({ type: "refund:updated", payload: { refundId: id, status: nextStatus } });

      const actor = req.user!;
      logAudit(
        actor.userId,
        actor.email,
        nextStatus === "rejected" ? "refund.rejected" : nextStatus === "manager_approved" ? "refund.escalated" : "refund.approved",
        `Refund #${id.slice(0, 8)} for ₱${Number(refund.amount).toFixed(2)} — status: ${nextStatus}`,
      );

      if (nextStatus === "completed" || nextStatus === "rejected") {
        const [customer] = await db
          .select({ email: usersTable.email, full_name: usersTable.full_name, phone: usersTable.phone })
          .from(usersTable)
          .where(eq(usersTable.id, refund.customer_id))
          .limit(1);
        if (customer) {
          const amt = Number(refund.amount);
          if (nextStatus === "completed") {
            sendRefundApprovedEmail(customer.email, customer.full_name, amt).catch(() => {});
            if (customer.phone) sendSMS(customer.phone, `Hi ${customer.full_name}, your TableServe refund of ₱${amt.toFixed(2)} has been approved!`).catch(() => {});
          } else {
            sendRefundRejectedEmail(customer.email, customer.full_name, amt).catch(() => {});
            if (customer.phone) sendSMS(customer.phone, `Hi ${customer.full_name}, your TableServe refund request of ₱${amt.toFixed(2)} was not approved.`).catch(() => {});
          }
        }
      }
    } catch (err) {
      next(err);
    }
  },
);

export default router;
