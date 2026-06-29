import { pgTable, text, numeric, timestamp, pgEnum, boolean } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const orderStatusEnum = pgEnum("order_status", [
  "pending",
  "confirmed",
  "preparing",
  "ready",
  "delivered",
  "cancelled",
]);

export const ordersTable = pgTable("orders", {
  id: text("id").primaryKey(),
  customer_id: text("customer_id").notNull().references(() => usersTable.id),
  status: orderStatusEnum("status").notNull().default("pending"),
  total_amount: numeric("total_amount", { precision: 10, scale: 2 }).notNull(),
  notes: text("notes"),
  is_archived: boolean("is_archived").notNull().default(false),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type Order = typeof ordersTable.$inferSelect;
