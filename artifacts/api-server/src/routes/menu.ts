import { Router, type IRouter } from "express";
import { eq, asc } from "drizzle-orm";
import { randomUUID } from "crypto";
import { db, menuItemsTable } from "@workspace/db";
import { requireAuth, requireRole } from "../middlewares/auth";
import { logAudit } from "../lib/audit";

const router: IRouter = Router();

type MenuCategory = "appetizer" | "main" | "dessert" | "drink" | "side" | "special";
const VALID_CATEGORIES: MenuCategory[] = ["appetizer", "main", "dessert", "drink", "side", "special"];

function serializeItem(item: typeof menuItemsTable.$inferSelect) {
  return {
    id: item.id,
    name: item.name,
    description: item.description ?? null,
    price: parseFloat(item.price),
    category: item.category,
    image_url: item.image_url ?? null,
    is_available: item.is_available,
    sort_order: item.sort_order,
    created_at: item.created_at.toISOString(),
    updated_at: item.updated_at.toISOString(),
  };
}

router.get("/menu", async (req, res): Promise<void> => {
  const { category, available_only } = req.query;

  let query = db.select().from(menuItemsTable).$dynamic();

  if (category && typeof category === "string") {
    if (!VALID_CATEGORIES.includes(category as MenuCategory)) {
      res.status(400).json({ error: "Invalid category" });
      return;
    }
    query = query.where(eq(menuItemsTable.category, category as MenuCategory));
  }

  if (available_only === "true") {
    query = query.where(eq(menuItemsTable.is_available, true));
  }

  const items = await query.orderBy(asc(menuItemsTable.sort_order), asc(menuItemsTable.name));
  res.json(items.map(serializeItem));
});

router.get("/menu/:id", async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

  const [item] = await db
    .select()
    .from(menuItemsTable)
    .where(eq(menuItemsTable.id, id))
    .limit(1);

  if (!item) {
    res.status(404).json({ error: "Menu item not found" });
    return;
  }

  res.json(serializeItem(item));
});

router.post(
  "/menu",
  requireAuth,
  requireRole("manager", "owner", "admin"),
  async (req, res): Promise<void> => {
    const { name, description, price, category, image_url, is_available, sort_order } = req.body as {
      name?: string;
      description?: string | null;
      price?: number;
      category?: string;
      image_url?: string | null;
      is_available?: boolean;
      sort_order?: number;
    };

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      res.status(400).json({ error: "name is required" });
      return;
    }
    if (price === undefined || typeof price !== "number" || price < 0) {
      res.status(400).json({ error: "price must be a non-negative number" });
      return;
    }
    if (!category || !VALID_CATEGORIES.includes(category as MenuCategory)) {
      res.status(400).json({ error: `category must be one of: ${VALID_CATEGORIES.join(", ")}` });
      return;
    }

    const [created] = await db
      .insert(menuItemsTable)
      .values({
        id: randomUUID(),
        name: name.trim(),
        description: description ?? null,
        price: price.toFixed(2),
        category: category as MenuCategory,
        image_url: image_url ?? null,
        is_available: is_available !== undefined ? is_available : true,
        sort_order: sort_order ?? 0,
      })
      .returning();

    logAudit(req.user!.userId, req.user!.email, "menu.created", `Created menu item "${name.trim()}" (₱${price.toFixed(2)})`);
    res.status(201).json(serializeItem(created));
  }
);

router.patch(
  "/menu/:id",
  requireAuth,
  requireRole("manager", "owner", "admin"),
  async (req, res): Promise<void> => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    const updateData: Record<string, unknown> = {};
    const body = req.body as Record<string, unknown>;

    if ("name" in body) {
      if (typeof body.name !== "string" || body.name.trim().length === 0) {
        res.status(400).json({ error: "name must be a non-empty string" });
        return;
      }
      updateData.name = body.name.trim();
    }
    if ("description" in body) updateData.description = body.description ?? null;
    if ("price" in body) {
      const p = Number(body.price);
      if (isNaN(p) || p < 0) {
        res.status(400).json({ error: "price must be a non-negative number" });
        return;
      }
      updateData.price = p.toFixed(2);
    }
    if ("category" in body) {
      if (!VALID_CATEGORIES.includes(body.category as MenuCategory)) {
        res.status(400).json({ error: "Invalid category" });
        return;
      }
      updateData.category = body.category;
    }
    if ("image_url" in body) updateData.image_url = body.image_url ?? null;
    if ("is_available" in body) updateData.is_available = Boolean(body.is_available);
    if ("sort_order" in body) updateData.sort_order = Number(body.sort_order) || 0;

    if (Object.keys(updateData).length === 0) {
      res.status(400).json({ error: "No valid fields to update" });
      return;
    }

    const [updated] = await db
      .update(menuItemsTable)
      .set(updateData)
      .where(eq(menuItemsTable.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Menu item not found" });
      return;
    }

    logAudit(req.user!.userId, req.user!.email, "menu.updated", `Updated menu item "${updated.name}"`);
    res.json(serializeItem(updated));
  }
);

router.delete(
  "/menu/:id",
  requireAuth,
  requireRole("manager", "owner", "admin"),
  async (req, res): Promise<void> => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    const [deleted] = await db
      .delete(menuItemsTable)
      .where(eq(menuItemsTable.id, id))
      .returning();

    if (!deleted) {
      res.status(404).json({ error: "Menu item not found" });
      return;
    }

    logAudit(req.user!.userId, req.user!.email, "menu.deleted", `Deleted menu item "${deleted.name}"`);
    res.json({ message: "Menu item deleted" });
  }
);

export default router;
