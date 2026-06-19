import { pgTable, text, integer, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { ordersTable } from "./orders";

export const feedbackTable = pgTable("feedback", {
  id: text("id").primaryKey(),
  order_id: text("order_id").notNull().references(() => ordersTable.id),
  customer_id: text("customer_id").notNull().references(() => usersTable.id),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Feedback = typeof feedbackTable.$inferSelect;
