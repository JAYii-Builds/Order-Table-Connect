import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { randomUUID } from "crypto";
import { db, reservationsTable, ordersTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

const MIN_ORDER_AMOUNT = 200;

type ReservationStatus = "pending" | "confirmed" | "cancelled" | "completed";

function serializeReservation(r: typeof reservationsTable.$inferSelect) {
  return {
    id: r.id,
    customer_id: r.customer_id,
    order_id: r.order_id ?? null,
    reservation_date: r.reservation_date,
    reservation_time: r.reservation_time,
    guest_count: r.guest_count,
    status: r.status,
    notes: r.notes ?? null,
    created_at: r.created_at.toISOString(),
    updated_at: r.updated_at.toISOString(),
  };
}

router.post("/reservations", requireAuth, async (req, res, next): Promise<void> => {
  try {
    const customer = req.user!;
    const { order_id, reservation_date, reservation_time, guest_count, notes } = req.body as {
      order_id?: string;
      reservation_date?: string;
      reservation_time?: string;
      guest_count?: number;
      notes?: string;
    };

    if (!reservation_date || !reservation_time || guest_count === undefined) {
      res
        .status(400)
        .json({ error: "reservation_date, reservation_time, and guest_count are required" });
      return;
    }

    if (!Number.isInteger(guest_count) || guest_count < 1) {
      res.status(400).json({ error: "guest_count must be at least 1" });
      return;
    }

    if (!order_id) {
      res.status(400).json({
        error: `An order of at least ₱${MIN_ORDER_AMOUNT} is required to make a reservation`,
      });
      return;
    }

    const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, order_id));

    if (!order) {
      res.status(404).json({ error: "Order not found" });
      return;
    }

    if (order.customer_id !== customer.userId) {
      res.status(403).json({ error: "You can only link your own orders" });
      return;
    }

    if (Number(order.total_amount) < MIN_ORDER_AMOUNT) {
      res.status(400).json({
        error: `Order total must be at least ₱${MIN_ORDER_AMOUNT} to make a reservation. Your order total is ₱${Number(order.total_amount).toFixed(2)}.`,
      });
      return;
    }

    const [reservation] = await db
      .insert(reservationsTable)
      .values({
        id: randomUUID(),
        customer_id: customer.userId,
        order_id,
        reservation_date,
        reservation_time,
        guest_count,
        status: "pending",
        notes: notes ?? null,
      })
      .returning();

    res.status(201).json(serializeReservation(reservation));
  } catch (err) {
    next(err);
  }
});

router.get("/reservations", requireAuth, async (req, res, next): Promise<void> => {
  try {
    const user = req.user!;
    const isStaff = ["staff", "manager", "owner", "admin"].includes(user.role);

    const reservations = isStaff
      ? await db.select().from(reservationsTable).orderBy(desc(reservationsTable.created_at))
      : await db
          .select()
          .from(reservationsTable)
          .where(eq(reservationsTable.customer_id, user.userId))
          .orderBy(desc(reservationsTable.created_at));

    res.json(reservations.map(serializeReservation));
  } catch (err) {
    next(err);
  }
});

router.get("/reservations/:id", requireAuth, async (req, res, next): Promise<void> => {
  try {
    const user = req.user!;
    const id = String(req.params.id);

    const [reservation] = await db
      .select()
      .from(reservationsTable)
      .where(eq(reservationsTable.id, id));

    if (!reservation) {
      res.status(404).json({ error: "Reservation not found" });
      return;
    }

    const isStaff = ["staff", "manager", "owner", "admin"].includes(user.role);
    if (!isStaff && reservation.customer_id !== user.userId) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    res.json(serializeReservation(reservation));
  } catch (err) {
    next(err);
  }
});

router.patch("/reservations/:id", requireAuth, async (req, res, next): Promise<void> => {
  try {
    const user = req.user!;
    const id = String(req.params.id);
    const { status, notes } = req.body as {
      status?: ReservationStatus;
      notes?: string | null;
    };

    const [reservation] = await db
      .select()
      .from(reservationsTable)
      .where(eq(reservationsTable.id, id));

    if (!reservation) {
      res.status(404).json({ error: "Reservation not found" });
      return;
    }

    const isStaff = ["staff", "manager", "owner", "admin"].includes(user.role);
    if (!isStaff) {
      if (reservation.customer_id !== user.userId) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
      if (status && status !== "cancelled") {
        res.status(403).json({ error: "Customers can only cancel their reservations" });
        return;
      }
    }

    const updates: Record<string, unknown> = { updated_at: new Date() };
    if (status !== undefined) updates.status = status;
    if (notes !== undefined) updates.notes = notes;

    const [updated] = await db
      .update(reservationsTable)
      .set(updates)
      .where(eq(reservationsTable.id, id))
      .returning();

    res.json(serializeReservation(updated));
  } catch (err) {
    next(err);
  }
});

export default router;
