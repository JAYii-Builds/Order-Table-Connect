import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { eq, desc, and, ne } from "drizzle-orm";
import { randomUUID } from "crypto";
import { db, tableReservationsTable } from "@workspace/db";
import { requireAuth, requireRole } from "../middlewares/auth";
import { verifyToken } from "../lib/jwt";
import { broadcast } from "../lib/sse";

const router: IRouter = Router();

type TableReservationStatus = "pending" | "confirmed" | "seated" | "cancelled" | "no_show";

function serializeTableReservation(r: typeof tableReservationsTable.$inferSelect) {
  return {
    id: r.id,
    customer_id: r.customer_id ?? null,
    customer_name: r.customer_name,
    contact_info: r.contact_info,
    party_size: r.party_size,
    reservation_date: r.reservation_date,
    reservation_time: r.reservation_time,
    table_id: r.table_id ?? null,
    status: r.status,
    notes: r.notes ?? null,
    created_at: r.created_at.toISOString(),
    updated_at: r.updated_at.toISOString(),
  };
}

// Middleware that attaches user if a valid Bearer token is present, but doesn't
// reject unauthenticated requests — allows the POST to be public while still
// capturing the user ID for logged-in customers.
function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    try {
      req.user = verifyToken(authHeader.slice(7));
    } catch {
      // invalid token — treat as unauthenticated guest
    }
  }
  next();
}

// POST /table-reservations — public (guests) or authenticated (customers)
router.post("/table-reservations", optionalAuth, async (req, res, next): Promise<void> => {
  try {
    const { customer_name, contact_info, party_size, reservation_date, reservation_time, notes } =
      req.body as {
        customer_name?: string;
        contact_info?: string;
        party_size?: number;
        reservation_date?: string;
        reservation_time?: string;
        notes?: string;
      };

    if (!customer_name || !contact_info || party_size === undefined || !reservation_date || !reservation_time) {
      res.status(400).json({
        error: "customer_name, contact_info, party_size, reservation_date, and reservation_time are required",
      });
      return;
    }

    if (!Number.isInteger(party_size) || party_size < 1) {
      res.status(400).json({ error: "party_size must be a positive integer" });
      return;
    }

    // Slot capacity check (demo limit: 10 active reservations per slot)
    const sameSlotCount = await db
      .select()
      .from(tableReservationsTable)
      .where(
        and(
          eq(tableReservationsTable.reservation_date, reservation_date),
          eq(tableReservationsTable.reservation_time, reservation_time),
          ne(tableReservationsTable.status, "cancelled"),
          ne(tableReservationsTable.status, "no_show"),
        ),
      );

    if (sameSlotCount.length >= 10) {
      res.status(409).json({ error: "This time slot is fully booked. Please choose another time." });
      return;
    }

    // Capture customer_id when request comes from a logged-in customer
    const customerId =
      req.user && req.user.role === "customer" ? req.user.userId : null;

    const [reservation] = await db
      .insert(tableReservationsTable)
      .values({
        id: randomUUID(),
        customer_id: customerId,
        customer_name: customer_name.trim(),
        contact_info: contact_info.trim(),
        party_size,
        reservation_date,
        reservation_time,
        status: "pending",
        notes: notes?.trim() ?? null,
        table_id: null,
      })
      .returning();

    res.status(201).json(serializeTableReservation(reservation));
    broadcast({ type: "table-reservation:created", payload: { reservationId: reservation.id } });
  } catch (err) {
    next(err);
  }
});

// GET /table-reservations/my — customer sees their own reservations (by customer_id)
router.get(
  "/table-reservations/my",
  requireAuth,
  async (req, res, next): Promise<void> => {
    try {
      const userId = req.user!.userId;

      const rows = await db
        .select()
        .from(tableReservationsTable)
        .where(eq(tableReservationsTable.customer_id, userId))
        .orderBy(desc(tableReservationsTable.created_at));

      res.json(rows.map(serializeTableReservation));
    } catch (err) {
      next(err);
    }
  },
);

// GET /table-reservations — staff sees all reservations
router.get(
  "/table-reservations",
  requireAuth,
  requireRole("staff", "manager", "owner", "admin"),
  async (req, res, next): Promise<void> => {
    try {
      const { date } = req.query as { date?: string };

      const rows = date
        ? await db
            .select()
            .from(tableReservationsTable)
            .where(eq(tableReservationsTable.reservation_date, date))
            .orderBy(tableReservationsTable.reservation_time)
        : await db
            .select()
            .from(tableReservationsTable)
            .orderBy(desc(tableReservationsTable.created_at));

      res.json(rows.map(serializeTableReservation));
    } catch (err) {
      next(err);
    }
  },
);

// PATCH /table-reservations/:id — staff only
router.patch(
  "/table-reservations/:id",
  requireAuth,
  requireRole("staff", "manager", "owner", "admin"),
  async (req, res, next): Promise<void> => {
    try {
      const id = String(req.params.id);
      const { status, table_id, notes } = req.body as {
        status?: TableReservationStatus;
        table_id?: string | null;
        notes?: string | null;
      };

      const [reservation] = await db
        .select()
        .from(tableReservationsTable)
        .where(eq(tableReservationsTable.id, id));

      if (!reservation) {
        res.status(404).json({ error: "Reservation not found" });
        return;
      }

      const validStatuses: TableReservationStatus[] = [
        "pending", "confirmed", "seated", "cancelled", "no_show",
      ];
      if (status !== undefined && !validStatuses.includes(status)) {
        res.status(400).json({ error: `status must be one of: ${validStatuses.join(", ")}` });
        return;
      }

      const updates: Record<string, unknown> = { updated_at: new Date() };
      if (status !== undefined) updates.status = status;
      if (table_id !== undefined) updates.table_id = table_id;
      if (notes !== undefined) updates.notes = notes;

      const [updated] = await db
        .update(tableReservationsTable)
        .set(updates)
        .where(eq(tableReservationsTable.id, id))
        .returning();

      res.json(serializeTableReservation(updated));
      broadcast({
        type: "table-reservation:updated",
        payload: { reservationId: id, status: updated.status },
      });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
