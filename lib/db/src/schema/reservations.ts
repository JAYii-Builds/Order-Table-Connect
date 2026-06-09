import { pgTable, text, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { ordersTable } from "./orders";

export const reservationStatusEnum = pgEnum("reservation_status", [
  "pending",
  "confirmed",
  "cancelled",
  "completed",
]);

export const reservationsTable = pgTable("reservations", {
  id: text("id").primaryKey(),
  customer_id: text("customer_id").notNull().references(() => usersTable.id),
  order_id: text("order_id").references(() => ordersTable.id),
  reservation_date: text("reservation_date").notNull(),
  reservation_time: text("reservation_time").notNull(),
  guest_count: integer("guest_count").notNull(),
  status: reservationStatusEnum("status").notNull().default("pending"),
  notes: text("notes"),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type Reservation = typeof reservationsTable.$inferSelect;
