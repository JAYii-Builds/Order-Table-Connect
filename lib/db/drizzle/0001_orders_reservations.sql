-- Phase 2 migration: orders, order_items, reservations
-- Run this in your Supabase SQL Editor

CREATE TYPE "order_status" AS ENUM('pending','confirmed','preparing','ready','delivered','cancelled');
CREATE TYPE "reservation_status" AS ENUM('pending','confirmed','cancelled','completed');

CREATE TABLE "orders" (
  "id" text PRIMARY KEY NOT NULL,
  "customer_id" text NOT NULL REFERENCES "users"("id"),
  "status" "order_status" NOT NULL DEFAULT 'pending',
  "total_amount" numeric(10,2) NOT NULL,
  "notes" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE "order_items" (
  "id" text PRIMARY KEY NOT NULL,
  "order_id" text NOT NULL REFERENCES "orders"("id"),
  "menu_item_id" text NOT NULL REFERENCES "menu_items"("id"),
  "quantity" integer NOT NULL,
  "unit_price" numeric(10,2) NOT NULL,
  "subtotal" numeric(10,2) NOT NULL
);

CREATE TABLE "reservations" (
  "id" text PRIMARY KEY NOT NULL,
  "customer_id" text NOT NULL REFERENCES "users"("id"),
  "order_id" text REFERENCES "orders"("id"),
  "reservation_date" text NOT NULL,
  "reservation_time" text NOT NULL,
  "guest_count" integer NOT NULL,
  "status" "reservation_status" NOT NULL DEFAULT 'pending',
  "notes" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);
