import { pgTable, text, numeric, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { walkInCustomersTable } from "./walk-in-customers";

export const orderStatusEnum = pgEnum("order_status", [
  "pending",
  "confirmed",
  "preparing",
  "ready",
  "delivered",
  "cancelled",
]);

export const orderTypeEnum = pgEnum("order_type", ["regular", "walk_in"]);

export const ordersTable = pgTable("orders", {
  id: text("id").primaryKey(),
  customer_id: text("customer_id").notNull().references(() => usersTable.id),
  status: orderStatusEnum("status").notNull().default("pending"),
  order_type: orderTypeEnum("order_type").notNull().default("regular"),
  walk_in_customer_id: text("walk_in_customer_id").references(() => walkInCustomersTable.id),
  total_amount: numeric("total_amount", { precision: 10, scale: 2 }).notNull(),
  notes: text("notes"),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type Order = typeof ordersTable.$inferSelect;
