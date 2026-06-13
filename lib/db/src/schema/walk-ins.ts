import { pgTable, text, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";

export const walkInStatusEnum = pgEnum("walk_in_status", [
  "waiting",
  "seated",
  "completed",
  "cancelled",
]);

export const walkInsTable = pgTable("walk_ins", {
  id: text("id").primaryKey(),
  customer_name: text("customer_name").notNull(),
  party_size: integer("party_size").notNull(),
  status: walkInStatusEnum("status").notNull().default("waiting"),
  notes: text("notes"),
  table_id: text("table_id"),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type WalkIn = typeof walkInsTable.$inferSelect;
