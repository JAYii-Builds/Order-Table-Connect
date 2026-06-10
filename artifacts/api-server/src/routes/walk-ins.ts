import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { randomUUID } from "crypto";
import { db, walkInCustomersTable } from "@workspace/db";
import { requireAuth, requireRole } from "../middlewares/auth";
import { broadcast } from "../lib/sse";

const router: IRouter = Router();

type WalkInStatus = "waiting" | "seated" | "done";
const VALID_STATUSES: WalkInStatus[] = ["waiting", "seated", "done"];

function serializeWalkIn(w: typeof walkInCustomersTable.$inferSelect) {
  return {
    id: w.id,
    name: w.name,
    party_size: w.party_size,
    arrival_time: w.arrival_time.toISOString(),
    status: w.status,
    notes: w.notes ?? null,
    created_by: w.created_by,
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
      const staff = req.user!;
      const { name, party_size, notes } = req.body as {
        name?: string;
        party_size?: number;
        notes?: string;
      };

      if (!name || typeof name !== "string" || name.trim() === "") {
        res.status(400).json({ error: "Name is required" });
        return;
      }
      if (!Number.isInteger(party_size) || (party_size as number) < 1) {
        res.status(400).json({ error: "party_size must be a positive integer" });
        return;
      }

      const [walkIn] = await db
        .insert(walkInCustomersTable)
        .values({
          id: randomUUID(),
          name: name.trim(),
          party_size: party_size as number,
          arrival_time: new Date(),
          status: "waiting",
          notes: notes?.trim() ?? null,
          created_by: staff.userId,
        })
        .returning();

      res.status(201).json(serializeWalkIn(walkIn));
      broadcast({ type: "walkin:created", payload: { walkInId: walkIn.id } });
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
        .from(walkInCustomersTable)
        .orderBy(desc(walkInCustomersTable.arrival_time));

      res.json(walkIns.map(serializeWalkIn));
    } catch (err) {
      next(err);
    }
  },
);

router.patch(
  "/walk-ins/:id/status",
  requireAuth,
  requireRole("staff", "manager", "owner", "admin"),
  async (req, res, next): Promise<void> => {
    try {
      const id = String(req.params.id);
      const { status } = req.body as { status?: string };

      if (!status || !VALID_STATUSES.includes(status as WalkInStatus)) {
        res.status(400).json({
          error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`,
        });
        return;
      }

      const [existing] = await db
        .select()
        .from(walkInCustomersTable)
        .where(eq(walkInCustomersTable.id, id));

      if (!existing) {
        res.status(404).json({ error: "Walk-in customer not found" });
        return;
      }

      const [updated] = await db
        .update(walkInCustomersTable)
        .set({ status: status as WalkInStatus, updated_at: new Date() })
        .where(eq(walkInCustomersTable.id, id))
        .returning();

      res.json(serializeWalkIn(updated));
      broadcast({ type: "walkin:updated", payload: { walkInId: id, status: updated.status } });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
