import { pgTable, text, numeric, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { ordersTable } from "./orders";

export const refundStatusEnum = pgEnum("refund_status", [
  "pending",
  "manager_approved",
  "owner_approved",
  "rejected",
  "completed",
]);

export const refundsTable = pgTable("refunds", {
  id: text("id").primaryKey(),
  order_id: text("order_id")
    .notNull()
    .references(() => ordersTable.id),
  customer_id: text("customer_id")
    .notNull()
    .references(() => usersTable.id),
  reason: text("reason").notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  status: refundStatusEnum("status").notNull().default("pending"),
  requested_at: timestamp("requested_at", { withTimezone: true }).notNull().defaultNow(),
  resolved_at: timestamp("resolved_at", { withTimezone: true }),
});

export type Refund = typeof refundsTable.$inferSelect;
