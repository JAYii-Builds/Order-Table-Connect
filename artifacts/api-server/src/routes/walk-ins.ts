import { Router, type IRouter } from "express";
import { eq, desc, or, ne } from "drizzle-orm";
import { randomUUID } from "crypto";
import { db, walkInsTable } from "@workspace/db";
import { requireAuth, requireRole } from "../middlewares/auth";
import { broadcast } from "../lib/sse";

const router: IRouter = Router();

type WalkInStatus = "waiting" | "seated" | "completed" | "cancelled";

function serializeWalkIn(w: typeof walkInsTable.$inferSelect) {
  return {
    id: w.id,
    customer_name: w.customer_name,
    party_size: w.party_size,
    status: w.status,
    notes: w.notes ?? null,
    table_id: w.table_id ?? null,
    created_at: w.created_at.toISOString(),
    updated_at: w.updated_at.toISOString(),
  };
}

router.post(
  "/walk-ins",
  requireAuth,
  requireRole("staff", "manager", "owner", "admin"),
  async (req, res, next): Promise<void> => {
    try {
      const { customer_name, party_size, notes, table_id } = req.body as {
        customer_name?: string;
        party_size?: number;
        notes?: string;
        table_id?: string;
      };

      if (!customer_name || party_size === undefined) {
        res.status(400).json({ error: "customer_name and party_size are required" });
        return;
      }

      if (!Number.isInteger(party_size) || party_size < 1) {
        res.status(400).json({ error: "party_size must be a positive integer" });
        return;
      }

      const [walkIn] = await db
        .insert(walkInsTable)
        .values({
          id: randomUUID(),
          customer_name: customer_name.trim(),
          party_size,
          status: "waiting",
          notes: notes ?? null,
          table_id: table_id ?? null,
        })
        .returning();

      res.status(201).json(serializeWalkIn(walkIn));
      broadcast({ type: "walk-in:created", payload: { walkInId: walkIn.id } });
    } catch (err) {
      next(err);
    }
  },
);

router.get(
  "/walk-ins",
  requireAuth,
  requireRole("staff", "manager", "owner", "admin"),
  async (req, res, next): Promise<void> => {
    try {
      const walkIns = await db
        .select()
        .from(walkInsTable)
        .where(or(eq(walkInsTable.status, "waiting"), eq(walkInsTable.status, "seated")))
        .orderBy(desc(walkInsTable.created_at));

      res.json(walkIns.map(serializeWalkIn));
    } catch (err) {
      next(err);
    }
  },
);

router.patch(
  "/walk-ins/:id",
  requireAuth,
  requireRole("staff", "manager", "owner", "admin"),
  async (req, res, next): Promise<void> => {
    try {
      const id = String(req.params.id);
      const { status, notes, table_id } = req.body as {
        status?: WalkInStatus;
        notes?: string | null;
        table_id?: string | null;
      };

      const [walkIn] = await db
        .select()
        .from(walkInsTable)
        .where(eq(walkInsTable.id, id));

      if (!walkIn) {
        res.status(404).json({ error: "Walk-in not found" });
        return;
      }

      const validStatuses: WalkInStatus[] = ["waiting", "seated", "completed", "cancelled"];
      if (status !== undefined && !validStatuses.includes(status)) {
        res.status(400).json({ error: `status must be one of: ${validStatuses.join(", ")}` });
        return;
      }

      const updates: Record<string, unknown> = { updated_at: new Date() };
      if (status !== undefined) updates.status = status;
      if (notes !== undefined) updates.notes = notes;
      if (table_id !== undefined) updates.table_id = table_id;

      const [updated] = await db
        .update(walkInsTable)
        .set(updates)
        .where(eq(walkInsTable.id, id))
        .returning();

      res.json(serializeWalkIn(updated));
      broadcast({ type: "walk-in:updated", payload: { walkInId: id, status: updated.status } });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
