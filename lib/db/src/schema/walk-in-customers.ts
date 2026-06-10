import { pgTable, text, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const walkInStatusEnum = pgEnum("walk_in_status", ["waiting", "seated", "done"]);

export const walkInCustomersTable = pgTable("walk_in_customers", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  party_size: integer("party_size").notNull(),
  arrival_time: timestamp("arrival_time", { withTimezone: true }).notNull(),
  status: walkInStatusEnum("status").notNull().default("waiting"),
  notes: text("notes"),
  created_by: text("created_by")
    .notNull()
    .references(() => usersTable.id),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type WalkInCustomer = typeof walkInCustomersTable.$inferSelect;
