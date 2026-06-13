import React, { useState } from "react";
import {
  Minus,
  Plus,
  Trash2,
  ShoppingBag,
  CheckCircle2,
  Loader2,
  UtensilsCrossed,
  RotateCcw,
  ClipboardList,
} from "lucide-react";
import {
  useListMenuItems,
  getListMenuItemsQueryKey,
  useCreateOrder,
  getListOrdersQueryKey,
  type MenuItem,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CartItem {
  menuItem: MenuItem;
  quantity: number;
}

// ─── Category config ──────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  all: "All",
  appetizer: "Appetizers",
  main: "Mains",
  dessert: "Desserts",
  drink: "Drinks",
  side: "Sides",
  special: "Specials",
};

const CATEGORY_ORDER = ["all", "appetizer", "main", "dessert", "drink", "side", "special"];

// ─── Menu item card ───────────────────────────────────────────────────────────

function MenuItemCard({
  item,
  quantity,
  onAdd,
  onRemove,
}: {
  item: MenuItem;
  quantity: number;
  onAdd: () => void;
  onRemove: () => void;
}) {
  return (
    <div
      className={`bg-background border rounded-xl p-3.5 flex flex-col gap-2.5 transition-all ${
        !item.is_available ? "opacity-40 pointer-events-none" : "border-border hover:border-primary/40"
      } ${quantity > 0 ? "border-primary/40 ring-1 ring-primary/20" : ""}`}
    >
      {item.image_url ? (
        <img
          src={item.image_url}
          alt={item.name}
          className="w-full h-24 object-cover rounded-lg"
        />
      ) : (
        <div className="w-full h-24 bg-muted/40 rounded-lg flex items-center justify-center">
          <UtensilsCrossed className="h-8 w-8 text-muted-foreground/20" />
        </div>
      )}

      <div className="flex-1">
        <p className="font-semibold text-foreground text-sm leading-tight">{item.name}</p>
        {item.description && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{item.description}</p>
        )}
        <p className="font-bold text-primary text-sm mt-1.5">₱{Number(item.price).toFixed(2)}</p>
      </div>

      {!item.is_available ? (
        <div className="w-full py-1.5 rounded-lg text-center text-xs text-muted-foreground bg-muted/40">
          Unavailable
        </div>
      ) : quantity === 0 ? (
        <button
          onClick={onAdd}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          Add
        </button>
      ) : (
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={onRemove}
            className="h-7 w-7 flex items-center justify-center rounded-lg bg-muted hover:bg-destructive/10 hover:text-destructive text-muted-foreground transition-colors"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <span className="font-bold text-sm text-foreground w-6 text-center">{quantity}</span>
          <button
            onClick={onAdd}
            className="h-7 w-7 flex items-center justify-center rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Order success state ──────────────────────────────────────────────────────

function OrderSuccess({ orderId, onNewOrder }: { orderId: string; onNewOrder: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-5 p-8 text-center">
      <div className="h-16 w-16 rounded-full bg-chart-2/15 flex items-center justify-center">
        <CheckCircle2 className="h-8 w-8 text-chart-2" />
      </div>
      <div>
        <p className="text-lg font-bold text-foreground">Order Placed!</p>
        <p className="text-xs text-muted-foreground font-mono mt-1">
          #{orderId.slice(0, 8).toUpperCase()}
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          The order has been sent to the kitchen queue.
        </p>
      </div>
      <button
        onClick={onNewOrder}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
      >
        <RotateCcw className="h-4 w-4" />
        Start New Order
      </button>
    </div>
  );
}

// ─── Main POS page ────────────────────────────────────────────────────────────

export default function StaffPosPage() {
  const queryClient = useQueryClient();

  const [cart, setCart] = useState<CartItem[]>([]);
  const [notes, setNotes] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [placedOrderId, setPlacedOrderId] = useState<string | null>(null);

  const { data: menuItems = [], isLoading: menuLoading } = useListMenuItems(
    { available_only: false },
    { query: { queryKey: getListMenuItemsQueryKey({ available_only: false }) } }
  );

  const createOrderMutation = useCreateOrder();

  const availableCategories = CATEGORY_ORDER.filter((cat) => {
    if (cat === "all") return true;
    return menuItems.some((item) => item.category === cat);
  });

  const filteredItems =
    activeCategory === "all"
      ? menuItems
      : menuItems.filter((item) => item.category === activeCategory);

  function getQuantity(menuItemId: string) {
    return cart.find((c) => c.menuItem.id === menuItemId)?.quantity ?? 0;
  }

  function addItem(item: MenuItem) {
    setCart((prev) => {
      const existing = prev.find((c) => c.menuItem.id === item.id);
      if (existing) {
        return prev.map((c) =>
          c.menuItem.id === item.id ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      return [...prev, { menuItem: item, quantity: 1 }];
    });
  }

  function removeItem(menuItemId: string) {
    setCart((prev) => {
      const existing = prev.find((c) => c.menuItem.id === menuItemId);
      if (!existing) return prev;
      if (existing.quantity === 1) return prev.filter((c) => c.menuItem.id !== menuItemId);
      return prev.map((c) =>
        c.menuItem.id === menuItemId ? { ...c, quantity: c.quantity - 1 } : c
      );
    });
  }

  function deleteItem(menuItemId: string) {
    setCart((prev) => prev.filter((c) => c.menuItem.id !== menuItemId));
  }

  const total = cart.reduce((sum, c) => sum + Number(c.menuItem.price) * c.quantity, 0);

  function placeOrder() {
    if (cart.length === 0) return;
    createOrderMutation.mutate(
      {
        data: {
          items: cart.map((c) => ({ menu_item_id: c.menuItem.id, quantity: c.quantity })),
          notes: notes.trim() || null,
        },
      },
      {
        onSuccess: (order) => {
          queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey() });
          setPlacedOrderId(order.id);
        },
      }
    );
  }

  function startNewOrder() {
    setCart([]);
    setNotes("");
    setPlacedOrderId(null);
  }

  return (
    <DashboardLayout role="staff" roleLabel="Staff" roleColor="text-chart-2">
      <div className="flex h-full overflow-hidden">
        {/* ─── Left: Menu ─────────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col overflow-hidden border-r border-border">
          {/* Header */}
          <div className="px-6 py-4 border-b border-border shrink-0">
            <h1 className="text-lg font-bold text-foreground">POS — Walk-in Order</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Select items to build the order</p>
          </div>

          {/* Category tabs */}
          <div className="px-6 pt-4 pb-3 flex gap-2 overflow-x-auto shrink-0 scrollbar-hide">
            {availableCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  activeCategory === cat
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/70"
                }`}
              >
                {CATEGORY_LABELS[cat] ?? cat}
              </button>
            ))}
          </div>

          {/* Menu grid */}
          <div className="flex-1 overflow-y-auto px-6 pb-6">
            {menuLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="bg-background border border-border rounded-xl p-3.5 animate-pulse">
                    <div className="w-full h-24 bg-muted rounded-lg mb-2.5" />
                    <div className="h-4 w-3/4 bg-muted rounded mb-1.5" />
                    <div className="h-3 w-full bg-muted rounded mb-3" />
                    <div className="h-6 w-16 bg-muted rounded mb-1.5" />
                    <div className="h-8 w-full bg-muted rounded-lg" />
                  </div>
                ))}
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="text-center py-16">
                <UtensilsCrossed className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">No items in this category.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {filteredItems.map((item) => (
                  <MenuItemCard
                    key={item.id}
                    item={item}
                    quantity={getQuantity(item.id)}
                    onAdd={() => addItem(item)}
                    onRemove={() => removeItem(item.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ─── Right: Order panel ──────────────────────────────────────────── */}
        <div className="w-80 shrink-0 flex flex-col bg-card overflow-hidden">
          {/* Panel header */}
          <div className="px-5 py-4 border-b border-border shrink-0 flex items-center gap-2">
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-semibold text-foreground text-sm">Current Order</h2>
            {cart.length > 0 && (
              <span className="ml-auto bg-primary/10 text-primary text-xs font-bold px-2 py-0.5 rounded-full">
                {cart.reduce((s, c) => s + c.quantity, 0)} items
              </span>
            )}
          </div>

          {placedOrderId ? (
            <OrderSuccess orderId={placedOrderId} onNewOrder={startNewOrder} />
          ) : (
            <>
              {/* Cart items */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
                {cart.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full gap-3 text-center py-10">
                    <ClipboardList className="h-10 w-10 text-muted-foreground/20" />
                    <p className="text-sm text-muted-foreground">
                      No items yet. Add from the menu.
                    </p>
                  </div>
                ) : (
                  cart.map((c) => (
                    <div
                      key={c.menuItem.id}
                      className="bg-background border border-border rounded-xl p-3 flex items-start gap-3"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {c.menuItem.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          ₱{Number(c.menuItem.price).toFixed(2)} × {c.quantity}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => removeItem(c.menuItem.id)}
                          className="h-6 w-6 flex items-center justify-center rounded-md bg-muted hover:bg-destructive/10 hover:text-destructive text-muted-foreground transition-colors"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="text-xs font-bold w-4 text-center">{c.quantity}</span>
                        <button
                          onClick={() => addItem(c.menuItem)}
                          className="h-6 w-6 flex items-center justify-center rounded-md bg-muted hover:bg-primary/10 hover:text-primary text-muted-foreground transition-colors"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => deleteItem(c.menuItem.id)}
                          className="h-6 w-6 flex items-center justify-center rounded-md hover:bg-destructive/10 hover:text-destructive text-muted-foreground transition-colors ml-0.5"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Footer: notes + total + place order */}
              <div className="px-5 pb-5 pt-3 border-t border-border space-y-3 shrink-0">
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Table number or special notes (optional)"
                  rows={2}
                  className="w-full text-sm bg-background border border-border rounded-xl px-3 py-2 text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 transition"
                />

                {cart.length > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground font-medium">Total</span>
                    <span className="font-bold text-foreground text-base">
                      ₱{total.toFixed(2)}
                    </span>
                  </div>
                )}

                <button
                  onClick={placeOrder}
                  disabled={cart.length === 0 || createOrderMutation.isPending}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {createOrderMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Placing Order…
                    </>
                  ) : (
                    <>
                      <ShoppingBag className="h-4 w-4" />
                      Place Order
                    </>
                  )}
                </button>

                {createOrderMutation.isError && (
                  <p className="text-xs text-destructive text-center">
                    Failed to place order. Please try again.
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
