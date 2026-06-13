import React, { useState } from "react";
import {
  Users,
  Table2,
  Plus,
  Minus,
  Trash2,
  UtensilsCrossed,
  ShoppingBag,
  CheckCircle2,
  RotateCcw,
  Loader2,
  ClipboardList,
  Search,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import {
  useListMenuItems,
  getListMenuItemsQueryKey,
  useCreateOrder,
  useUpdateOrderStatus,
  getListOrdersQueryKey,
  type MenuItem,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import { encodeWalkinNotes } from "@/lib/walkin-utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CartItem {
  menuItem: MenuItem;
  quantity: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { value: "all",       label: "All" },
  { value: "appetizer", label: "Appetizers" },
  { value: "main",      label: "Mains" },
  { value: "side",      label: "Sides" },
  { value: "dessert",   label: "Desserts" },
  { value: "drink",     label: "Drinks" },
  { value: "special",   label: "Specials" },
] as const;

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
  const unavailable = !item.is_available;
  return (
    <div
      className={`bg-background border rounded-xl p-3 flex flex-col gap-2 transition-all ${
        unavailable
          ? "opacity-40 pointer-events-none border-border"
          : quantity > 0
          ? "border-primary/50 ring-1 ring-primary/20 hover:border-primary/60"
          : "border-border hover:border-border/80"
      }`}
    >
      {/* Image or placeholder */}
      {item.image_url ? (
        <img src={item.image_url} alt={item.name} className="w-full h-20 object-cover rounded-lg" />
      ) : (
        <div className="w-full h-20 bg-muted/40 rounded-lg flex items-center justify-center">
          <UtensilsCrossed className="h-6 w-6 text-muted-foreground/20" />
        </div>
      )}

      <div className="flex-1 min-w-0">
        <p className="font-semibold text-foreground text-xs leading-snug line-clamp-2">{item.name}</p>
        <p className="font-bold text-primary text-sm mt-1">₱{Number(item.price).toFixed(2)}</p>
      </div>

      {unavailable ? (
        <div className="text-center py-1 text-xs text-muted-foreground bg-muted/40 rounded-lg">
          Unavailable
        </div>
      ) : quantity === 0 ? (
        <button
          onClick={onAdd}
          className="w-full flex items-center justify-center gap-1 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold transition-colors"
        >
          <Plus className="h-3 w-3" /> Add
        </button>
      ) : (
        <div className="flex items-center justify-between">
          <button
            onClick={onRemove}
            className="h-7 w-7 flex items-center justify-center rounded-lg bg-muted hover:bg-destructive/10 hover:text-destructive text-muted-foreground transition-colors"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <span className="font-bold text-sm text-foreground w-5 text-center">{quantity}</span>
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

// ─── Success state ────────────────────────────────────────────────────────────

function OrderSuccess({ orderId, table, guests, onNew }: { orderId: string; table: string; guests: number; onNew: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-5 p-8 text-center">
      <div className="h-16 w-16 rounded-full bg-chart-2/15 flex items-center justify-center">
        <CheckCircle2 className="h-8 w-8 text-chart-2" />
      </div>
      <div>
        <p className="text-lg font-bold text-foreground">Walk-in Order Placed!</p>
        <p className="font-mono text-xs text-muted-foreground mt-1">#{orderId.slice(0, 8).toUpperCase()}</p>
        <div className="flex items-center justify-center gap-3 mt-3">
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Table2 className="h-3.5 w-3.5" /> Table {table}
          </span>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Users className="h-3.5 w-3.5" /> {guests} {guests === 1 ? "guest" : "guests"}
          </span>
        </div>
        <p className="text-sm text-muted-foreground mt-2">Order sent to the kitchen.</p>
      </div>
      <button
        onClick={onNew}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
      >
        <RotateCcw className="h-4 w-4" /> New Walk-in Order
      </button>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function StaffWalkinPage() {
  const queryClient = useQueryClient();

  const [tableNumber, setTableNumber] = useState("");
  const [guestCount, setGuestCount] = useState(1);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [notes, setNotes] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [placedOrder, setPlacedOrder] = useState<{ id: string; table: string; guests: number } | null>(null);

  const { data: menuItems = [], isLoading } = useListMenuItems(
    { available_only: false },
    { query: { queryKey: getListMenuItemsQueryKey({ available_only: false }) } }
  );

  const createOrderMutation = useCreateOrder();
  const updateStatusMutation = useUpdateOrderStatus();

  const filteredItems = menuItems
    .filter((item) => activeCategory === "all" || item.category === activeCategory)
    .filter((item) =>
      search.trim() === "" || item.name.toLowerCase().includes(search.toLowerCase())
    );

  const availableCategories = CATEGORIES.filter(
    (c) => c.value === "all" || menuItems.some((m) => m.category === c.value)
  );

  function getQty(id: string) {
    return cart.find((c) => c.menuItem.id === id)?.quantity ?? 0;
  }

  function addItem(item: MenuItem) {
    setCart((prev) => {
      const ex = prev.find((c) => c.menuItem.id === item.id);
      if (ex) return prev.map((c) => c.menuItem.id === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      return [...prev, { menuItem: item, quantity: 1 }];
    });
  }

  function removeItem(id: string) {
    setCart((prev) => {
      const ex = prev.find((c) => c.menuItem.id === id);
      if (!ex) return prev;
      if (ex.quantity === 1) return prev.filter((c) => c.menuItem.id !== id);
      return prev.map((c) => c.menuItem.id === id ? { ...c, quantity: c.quantity - 1 } : c);
    });
  }

  function deleteItem(id: string) {
    setCart((prev) => prev.filter((c) => c.menuItem.id !== id));
  }

  const subtotal = cart.reduce((s, c) => s + Number(c.menuItem.price) * c.quantity, 0);
  const totalItems = cart.reduce((s, c) => s + c.quantity, 0);

  const canPlace = cart.length > 0 && tableNumber.trim() !== "";

  function placeOrder() {
    if (!canPlace) return;
    const encodedNotes = encodeWalkinNotes(tableNumber, guestCount, notes);
    createOrderMutation.mutate(
      {
        data: {
          items: cart.map((c) => ({ menu_item_id: c.menuItem.id, quantity: c.quantity })),
          notes: encodedNotes,
        },
      },
      {
        onSuccess: (order) => {
          updateStatusMutation.mutate(
            { id: order.id, data: { status: "confirmed" } },
            {
              onSettled: () => {
                queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey() });
                setPlacedOrder({ id: order.id, table: tableNumber, guests: guestCount });
              },
            }
          );
        },
      }
    );
  }

  function startNew() {
    setCart([]);
    setNotes("");
    setTableNumber("");
    setGuestCount(1);
    setSearch("");
    setPlacedOrder(null);
  }

  return (
    <DashboardLayout role="staff" roleLabel="Staff" roleColor="text-chart-2">
      <div className="flex flex-col h-full overflow-hidden">
        {/* ─── Top bar: table setup ──────────────────────────────── */}
        <div className="px-6 py-4 border-b border-border bg-card shrink-0">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-lg font-bold text-foreground">Walk-in Order</h1>
              <p className="text-xs text-muted-foreground mt-0.5">Create a table-service order for walk-in guests</p>
            </div>
            <div className="flex items-center gap-4 flex-wrap">
              {/* Table number */}
              <div className="flex items-center gap-2">
                <Table2 className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex flex-col">
                  <label className="text-xs text-muted-foreground font-medium mb-0.5">Table No.</label>
                  <input
                    type="text"
                    value={tableNumber}
                    onChange={(e) => setTableNumber(e.target.value)}
                    placeholder="e.g. 5 or VIP"
                    disabled={!!placedOrder}
                    className="w-28 text-sm bg-background border border-border rounded-lg px-2.5 py-1.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 transition disabled:opacity-50"
                  />
                </div>
              </div>
              {/* Guest count */}
              <div className="flex flex-col">
                <label className="text-xs text-muted-foreground font-medium mb-0.5">Guests</label>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setGuestCount((n) => Math.max(1, n - 1))}
                    disabled={guestCount <= 1 || !!placedOrder}
                    className="h-7 w-7 flex items-center justify-center rounded-lg bg-muted hover:bg-muted/70 text-muted-foreground disabled:opacity-40 transition-colors"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <div className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-sm font-bold text-foreground w-4 text-center">{guestCount}</span>
                  </div>
                  <button
                    onClick={() => setGuestCount((n) => Math.min(20, n + 1))}
                    disabled={guestCount >= 20 || !!placedOrder}
                    className="h-7 w-7 flex items-center justify-center rounded-lg bg-muted hover:bg-muted/70 text-muted-foreground disabled:opacity-40 transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              {/* Walk-in badge */}
              <div className="px-3 py-1.5 rounded-full bg-chart-3/15 border border-chart-3/20 text-chart-3 text-xs font-bold">
                Walk-in
              </div>
            </div>
          </div>
        </div>

        {/* ─── Body ─────────────────────────────────────────────── */}
        {placedOrder ? (
          <OrderSuccess
            orderId={placedOrder.id}
            table={placedOrder.table}
            guests={placedOrder.guests}
            onNew={startNew}
          />
        ) : (
          <div className="flex flex-1 overflow-hidden">
            {/* Left: Menu browser */}
            <div className="flex-1 flex flex-col overflow-hidden border-r border-border">
              {/* Search + categories */}
              <div className="px-5 pt-4 pb-3 space-y-3 shrink-0">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search menu…"
                    className="w-full pl-9 pr-4 py-2 text-sm bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 transition"
                  />
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                  {availableCategories.map((cat) => (
                    <button
                      key={cat.value}
                      onClick={() => setActiveCategory(cat.value)}
                      className={`shrink-0 px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                        activeCategory === cat.value
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Menu grid */}
              <div className="flex-1 overflow-y-auto px-5 pb-5">
                {isLoading ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <div key={i} className="bg-background border border-border rounded-xl p-3 animate-pulse">
                        <div className="h-20 bg-muted rounded-lg mb-2" />
                        <div className="h-3 w-3/4 bg-muted rounded mb-1.5" />
                        <div className="h-4 w-12 bg-muted rounded mb-2" />
                        <div className="h-7 w-full bg-muted rounded-lg" />
                      </div>
                    ))}
                  </div>
                ) : filteredItems.length === 0 ? (
                  <div className="text-center py-14">
                    <UtensilsCrossed className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
                    <p className="text-muted-foreground text-sm">No items found.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {filteredItems.map((item) => (
                      <MenuItemCard
                        key={item.id}
                        item={item}
                        quantity={getQty(item.id)}
                        onAdd={() => addItem(item)}
                        onRemove={() => removeItem(item.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right: Order summary */}
            <div className="w-80 shrink-0 flex flex-col bg-card overflow-hidden">
              <div className="px-5 py-4 border-b border-border shrink-0 flex items-center gap-2">
                <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                <h2 className="font-semibold text-foreground text-sm">Order Summary</h2>
                {totalItems > 0 && (
                  <span className="ml-auto bg-primary/10 text-primary text-xs font-bold px-2 py-0.5 rounded-full">
                    {totalItems} items
                  </span>
                )}
              </div>

              {/* Cart items */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
                {cart.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full gap-3 text-center py-10">
                    <ClipboardList className="h-10 w-10 text-muted-foreground/20" />
                    <p className="text-sm text-muted-foreground">Add items from the menu.</p>
                  </div>
                ) : (
                  cart.map((c) => (
                    <div
                      key={c.menuItem.id}
                      className="bg-background border border-border rounded-xl p-3 flex items-start gap-2"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate">{c.menuItem.name}</p>
                        <p className="text-xs text-muted-foreground">
                          ₱{Number(c.menuItem.price).toFixed(2)} × {c.quantity} ={" "}
                          <span className="font-medium text-foreground">
                            ₱{(Number(c.menuItem.price) * c.quantity).toFixed(2)}
                          </span>
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => removeItem(c.menuItem.id)} className="h-6 w-6 flex items-center justify-center rounded-md bg-muted hover:bg-destructive/10 hover:text-destructive text-muted-foreground transition-colors">
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="text-xs font-bold w-4 text-center">{c.quantity}</span>
                        <button onClick={() => addItem(c.menuItem)} className="h-6 w-6 flex items-center justify-center rounded-md bg-muted hover:bg-primary/10 hover:text-primary text-muted-foreground transition-colors">
                          <Plus className="h-3 w-3" />
                        </button>
                        <button onClick={() => deleteItem(c.menuItem.id)} className="h-6 w-6 flex items-center justify-center rounded-md hover:bg-destructive/10 hover:text-destructive text-muted-foreground transition-colors ml-0.5">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Footer */}
              <div className="px-5 pb-5 pt-3 border-t border-border space-y-3 shrink-0">
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Special requests or notes (optional)"
                  rows={2}
                  className="w-full text-xs bg-background border border-border rounded-xl px-3 py-2 text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 transition"
                />

                {cart.length > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground font-medium">Subtotal</span>
                    <span className="font-bold text-foreground">₱{subtotal.toFixed(2)}</span>
                  </div>
                )}

                {!tableNumber.trim() && cart.length > 0 && (
                  <p className="text-xs text-destructive text-center">Please enter a table number above.</p>
                )}

                <button
                  onClick={placeOrder}
                  disabled={!canPlace || createOrderMutation.isPending}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {createOrderMutation.isPending ? (
                    <><Loader2 className="h-4 w-4 animate-spin" />Placing Order…</>
                  ) : (
                    <><ShoppingBag className="h-4 w-4" />Place Walk-in Order</>
                  )}
                </button>

                {createOrderMutation.isError && (
                  <p className="text-xs text-destructive text-center">Failed to place order. Try again.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
