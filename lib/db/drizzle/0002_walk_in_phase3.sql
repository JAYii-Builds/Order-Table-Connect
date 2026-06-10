-- Phase 3 migration: walk-in customer tracking and POS orders
-- Run this in your Supabase SQL Editor

CREATE TYPE "walk_in_status" AS ENUM('waiting', 'seated', 'done');
CREATE TYPE "order_type" AS ENUM('regular', 'walk_in');

CREATE TABLE "walk_in_customers" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "party_size" integer NOT NULL,
  "arrival_time" timestamp with time zone NOT NULL,
  "status" "walk_in_status" NOT NULL DEFAULT 'waiting',
  "notes" text,
  "created_by" text NOT NULL REFERENCES "users"("id"),
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE "orders"
  ADD COLUMN "order_type" "order_type" NOT NULL DEFAULT 'regular',
  ADD COLUMN "walk_in_customer_id" text REFERENCES "walk_in_customers"("id");
