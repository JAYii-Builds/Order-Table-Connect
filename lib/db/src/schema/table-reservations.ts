import { pgTable, text, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";

export const tableReservationStatusEnum = pgEnum("table_reservation_status", [
  "pending",
  "confirmed",
  "seated",
  "cancelled",
  "no_show",
]);

export const tableReservationsTable = pgTable("table_reservations", {
  id: text("id").primaryKey(),
  customer_name: text("customer_name").notNull(),
  contact_info: text("contact_info").notNull(),
  party_size: integer("party_size").notNull(),
  reservation_date: text("reservation_date").notNull(),
  reservation_time: text("reservation_time").notNull(),
  table_id: text("table_id"),
  status: tableReservationStatusEnum("status").notNull().default("pending"),
  notes: text("notes"),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type TableReservation = typeof tableReservationsTable.$inferSelect;
