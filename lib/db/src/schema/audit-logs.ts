import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const auditLogsTable = pgTable("audit_logs", {
  id: text("id").primaryKey(),
  actor_id: text("actor_id").references(() => usersTable.id),
  actor_name: text("actor_name").notNull(),
  action: text("action").notNull(),
  details: text("details").notNull().default(""),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type AuditLog = typeof auditLogsTable.$inferSelect;
