import { pgTable, text, numeric, integer } from "drizzle-orm/pg-core";
import { ordersTable } from "./orders";
import { menuItemsTable } from "./menu-items";

export const orderItemsTable = pgTable("order_items", {
  id: text("id").primaryKey(),
  order_id: text("order_id").notNull().references(() => ordersTable.id),
  menu_item_id: text("menu_item_id").notNull().references(() => menuItemsTable.id),
  quantity: integer("quantity").notNull(),
  unit_price: numeric("unit_price", { precision: 10, scale: 2 }).notNull(),
  subtotal: numeric("subtotal", { precision: 10, scale: 2 }).notNull(),
});

export type OrderItem = typeof orderItemsTable.$inferSelect;
