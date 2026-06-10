import React, { useState } from "react";
import {
  Table2,
  ShoppingBag,
  CalendarDays,
  ClipboardList,
  ChevronRight,
  Loader2,
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  UserPlus,
  ShoppingCart,
  Plus,
  Minus,
  X,
  Utensils,
} from "lucide-react";
import {
  useGetStaffDashboard,
  getGetStaffDashboardQueryKey,
  useListOrders,
  getListOrdersQueryKey,
  useUpdateOrderStatus,
  useListReservations,
  getListReservationsQueryKey,
  useUpdateReservation,
  useListMenuItems,
  getListMenuItemsQueryKey,
  type Order,
  type Reservation,
  type MenuItem,
} from "@workspace/api-client-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { StatCard } from "@/components/stat-card";
import { useRealtime } from "@/hooks/use-realtime";

// ─── Walk-in types ────────────────────────────────────────────────────────────

interface WalkInCustomer {
  id: string;
  name: string;
  party_size: number;
  arrival_time: string;
  status: "waiting" | "seated" | "done";
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// ─── Walk-in API hooks ────────────────────────────────────────────────────────

const WALK_INS_QUERY_KEY = ["/api/walk-ins"] as const;

function useListWalkIns() {
  return useQuery<WalkInCustomer[]>({
    queryKey: WALK_INS_QUERY_KEY,
    queryFn: () => customFetch<WalkInCustomer[]>("/api/walk-ins"),
  });
}

function useRegisterWalkIn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; party_size: number; notes?: string }) =>
      customFetch<WalkInCustomer>("/api/walk-ins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WALK_INS_QUERY_KEY });
    },
  });
}

function useUpdateWalkInStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: WalkInCustomer["status"] }) =>
      customFetch<WalkInCustomer>(`/api/walk-ins/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WALK_INS_QUERY_KEY });
    },
  });
}

function usePlacePosOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      walk_in_customer_id: string;
      items: { menu_item_id: string; quantity: number }[];
      notes?: string;
    }) =>
      customFetch<Order>("/api/pos/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetStaffDashboardQueryKey() });
    },
  });
}

// ─── Order queue types & config ───────────────────────────────────────────────

type OrderStatus = "pending" | "confirmed" | "preparing" | "ready" | "delivered" | "cancelled";

const ORDER_STATUS_STYLES: Record<string, string> = {
  pending:   "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
  confirmed: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  preparing: "bg-orange-500/15 text-orange-400 border-orange-500/20",
  ready:     "bg-chart-2/15 text-chart-2 border-chart-2/20",
  delivered: "bg-muted/60 text-muted-foreground border-border",
  cancelled: "bg-destructive/15 text-destructive border-destructive/20",
};

const ORDER_STATUS_LABELS: Record<string, string> = {
  pending:   "Pending",
  confirmed: "Confirmed",
  preparing: "Preparing",
  ready:     "Ready",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const ORDER_NEXT: Partial<Record<OrderStatus, { status: OrderStatus; label: string; color: string }>> = {
  pending:   { status: "confirmed", label: "Confirm",    color: "bg-blue-600 hover:bg-blue-500 text-white" },
  confirmed: { status: "preparing", label: "Start Prep", color: "bg-orange-600 hover:bg-orange-500 text-white" },
  preparing: { status: "ready",     label: "Mark Ready", color: "bg-chart-2 hover:opacity-90 text-white" },
  ready:     { status: "delivered", label: "Delivered",  color: "bg-muted hover:bg-muted/70 text-foreground" },
};

const ACTIVE_ORDER_STATUSES: OrderStatus[] = ["pending", "confirmed", "preparing", "ready"];

// ─── Reservation types & config ───────────────────────────────────────────────

type ReservationStatus = "pending" | "confirmed" | "seated" | "completed" | "cancelled";

const RES_STATUS_STYLES: Record<string, string> = {
  pending:   "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
  confirmed: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  seated:    "bg-chart-3/15 text-chart-3 border-chart-3/20",
  completed: "bg-muted/60 text-muted-foreground border-border",
  cancelled: "bg-destructive/15 text-destructive border-destructive/20",
};

const RES_STATUS_LABELS: Record<string, string> = {
  pending:   "Pending",
  confirmed: "Confirmed",
  seated:    "Seated",
  completed: "Completed",
  cancelled: "Cancelled",
};

interface ResAction {
  status: ReservationStatus;
  label: string;
  color: string;
}

const RES_NEXT: Partial<Record<ReservationStatus, ResAction[]>> = {
  pending:   [
    { status: "confirmed", label: "Confirm",    color: "bg-blue-600 hover:bg-blue-500 text-white" },
    { status: "cancelled", label: "Cancel",     color: "bg-destructive/80 hover:bg-destructive text-white" },
  ],
  confirmed: [
    { status: "seated",    label: "Seat Table", color: "bg-chart-3 hover:opacity-90 text-white" },
    { status: "cancelled", label: "Cancel",     color: "bg-destructive/80 hover:bg-destructive text-white" },
  ],
  seated:    [
    { status: "completed", label: "Complete",   color: "bg-muted hover:bg-muted/70 text-foreground" },
  ],
};

// ─── Walk-in config ───────────────────────────────────────────────────────────

const WALKIN_STATUS_STYLES: Record<string, string> = {
  waiting: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
  seated:  "bg-chart-3/15 text-chart-3 border-chart-3/20",
  done:    "bg-muted/60 text-muted-foreground border-border",
};

const WALKIN_STATUS_LABELS: Record<string, string> = {
  waiting: "Waiting",
  seated:  "Seated",
  done:    "Done",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

function todayDateStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatTime(t: string): string {
  const [h, m] = t.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  return `${hour % 12 || 12}:${m} ${ampm}`;
}

// ─── Register Walk-in Modal ───────────────────────────────────────────────────

function RegisterWalkInModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [partySize, setPartySize] = useState(1);
  const [notes, setNotes] = useState("");
  const mutation = useRegisterWalkIn();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    mutation.mutate(
      { name: name.trim(), party_size: partySize, notes: notes.trim() || undefined },
      { onSuccess: onClose },
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-card border border-card-border rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-chart-3" />
            <h2 className="font-semibold text-foreground text-sm">Register Walk-in Customer</h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
              Customer Name <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. John Santos"
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
              Party Size <span className="text-destructive">*</span>
            </label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setPartySize((p) => Math.max(1, p - 1))}
                className="h-8 w-8 rounded-lg bg-muted hover:bg-muted/70 flex items-center justify-center text-foreground transition-colors"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="text-lg font-bold text-foreground w-8 text-center">{partySize}</span>
              <button
                type="button"
                onClick={() => setPartySize((p) => p + 1)}
                className="h-8 w-8 rounded-lg bg-muted hover:bg-muted/70 flex items-center justify-center text-foreground transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
              <span className="text-xs text-muted-foreground">guests</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any special requests or notes..."
              rows={2}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary resize-none"
            />
          </div>

          {mutation.isError && (
            <p className="text-xs text-destructive">
              {(mutation.error as Error)?.message ?? "Something went wrong"}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-lg text-xs font-semibold bg-muted hover:bg-muted/70 text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || mutation.isPending}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold bg-chart-3 hover:opacity-90 text-white disabled:opacity-50 transition-all"
            >
              {mutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Register"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── POS Order Modal ──────────────────────────────────────────────────────────

interface CartItem {
  menuItem: MenuItem;
  quantity: number;
}

function PosModal({ walkIn, onClose }: { walkIn: WalkInCustomer; onClose: () => void }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [notes, setNotes] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const mutation = usePlacePosOrder();

  const { data: menuItems = [] } = useListMenuItems(
    { is_available: true },
    { query: { queryKey: getListMenuItemsQueryKey({ is_available: true }) } },
  );

  const categories = ["all", ...Array.from(new Set(menuItems.map((m) => m.category)))];

  const filtered = activeCategory === "all"
    ? menuItems
    : menuItems.filter((m) => m.category === activeCategory);

  function addToCart(item: MenuItem) {
    setCart((prev) => {
      const existing = prev.find((c) => c.menuItem.id === item.id);
      if (existing) return prev.map((c) => c.menuItem.id === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      return [...prev, { menuItem: item, quantity: 1 }];
    });
  }

  function removeFromCart(itemId: string) {
    setCart((prev) => {
      const existing = prev.find((c) => c.menuItem.id === itemId);
      if (!existing) return prev;
      if (existing.quantity === 1) return prev.filter((c) => c.menuItem.id !== itemId);
      return prev.map((c) => c.menuItem.id === itemId ? { ...c, quantity: c.quantity - 1 } : c);
    });
  }

  const total = cart.reduce((sum, c) => sum + c.menuItem.price * c.quantity, 0);

  function handlePlaceOrder() {
    if (cart.length === 0) return;
    mutation.mutate(
      {
        walk_in_customer_id: walkIn.id,
        items: cart.map((c) => ({ menu_item_id: c.menuItem.id, quantity: c.quantity })),
        notes: notes.trim() || undefined,
      },
      { onSuccess: onClose },
    );
  }

  const CATEGORY_LABELS: Record<string, string> = {
    all: "All", appetizer: "Appetizers", main: "Mains", side: "Sides",
    dessert: "Desserts", drink: "Drinks", special: "Specials",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-card border border-card-border rounded-2xl w-full max-w-3xl max-h-[90vh] shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-chart-1" />
              <h2 className="font-semibold text-foreground text-sm">POS Order</h2>
              <span className="px-2 py-0.5 bg-chart-3/15 text-chart-3 text-xs font-semibold rounded-full border border-chart-3/20">
                Walk-in
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {walkIn.name} · {walkIn.party_size} {walkIn.party_size === 1 ? "guest" : "guests"}
            </p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-1 min-h-0">
          {/* Menu side */}
          <div className="flex-1 flex flex-col min-w-0 border-r border-border">
            {/* Category tabs */}
            <div className="flex gap-1.5 p-3 overflow-x-auto shrink-0 border-b border-border">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                    activeCategory === cat
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {CATEGORY_LABELS[cat] ?? cat}
                </button>
              ))}
            </div>

            {/* Menu items */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {filtered.map((item) => {
                const inCart = cart.find((c) => c.menuItem.id === item.id);
                return (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 p-3 bg-background border border-border rounded-xl hover:border-primary/30 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
                      <p className="text-xs text-muted-foreground">₱{item.price.toFixed(2)}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {inCart ? (
                        <>
                          <button
                            onClick={() => removeFromCart(item.id)}
                            className="h-7 w-7 rounded-lg bg-muted hover:bg-muted/70 flex items-center justify-center transition-colors"
                          >
                            <Minus className="h-3 w-3 text-foreground" />
                          </button>
                          <span className="text-sm font-bold text-foreground w-5 text-center">{inCart.quantity}</span>
                          <button
                            onClick={() => addToCart(item)}
                            className="h-7 w-7 rounded-lg bg-primary hover:bg-primary/80 flex items-center justify-center transition-colors"
                          >
                            <Plus className="h-3 w-3 text-primary-foreground" />
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => addToCart(item)}
                          className="h-7 w-7 rounded-lg bg-primary hover:bg-primary/80 flex items-center justify-center transition-colors"
                        >
                          <Plus className="h-3 w-3 text-primary-foreground" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Order summary side */}
          <div className="w-64 flex flex-col shrink-0">
            <div className="p-3 border-b border-border shrink-0">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Order Summary</p>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {cart.length === 0 ? (
                <div className="text-center py-8">
                  <Utensils className="h-8 w-8 text-muted-foreground/20 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">No items yet</p>
                </div>
              ) : (
                cart.map((c) => (
                  <div key={c.menuItem.id} className="flex items-start justify-between gap-2 text-xs">
                    <div className="flex-1 min-w-0">
                      <p className="text-foreground font-medium truncate">{c.menuItem.name}</p>
                      <p className="text-muted-foreground">× {c.quantity}</p>
                    </div>
                    <p className="text-foreground shrink-0">₱{(c.menuItem.price * c.quantity).toFixed(2)}</p>
                  </div>
                ))
              )}
            </div>

            <div className="p-3 border-t border-border space-y-3 shrink-0">
              <div className="flex justify-between text-sm font-semibold text-foreground">
                <span>Total</span>
                <span>₱{total.toFixed(2)}</span>
              </div>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Order notes..."
                rows={2}
                className="w-full bg-background border border-border rounded-lg px-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              />
              {mutation.isError && (
                <p className="text-xs text-destructive">
                  {(mutation.error as Error)?.message ?? "Something went wrong"}
                </p>
              )}
              <button
                onClick={handlePlaceOrder}
                disabled={cart.length === 0 || mutation.isPending}
                className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-50 transition-all"
              >
                {mutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <>Place Order<ChevronRight className="h-3.5 w-3.5" /></>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Walk-in customer card ────────────────────────────────────────────────────

function WalkInCard({ walkIn }: { walkIn: WalkInCustomer }) {
  const [showPOS, setShowPOS] = useState(false);
  const mutation = useUpdateWalkInStatus();

  function advance(status: WalkInCustomer["status"]) {
    mutation.mutate({ id: walkIn.id, status });
  }

  const isDone = walkIn.status === "done";

  return (
    <>
      <div className={`bg-background border border-border rounded-xl p-4 flex flex-col gap-3 ${isDone ? "opacity-60" : ""}`}>
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-semibold text-foreground text-sm">{walkIn.name}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{timeAgo(walkIn.arrival_time)}</p>
          </div>
          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${WALKIN_STATUS_STYLES[walkIn.status] ?? ""}`}>
            {WALKIN_STATUS_LABELS[walkIn.status] ?? walkIn.status}
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Users className="h-3.5 w-3.5 shrink-0" />
          <span>{walkIn.party_size} {walkIn.party_size === 1 ? "guest" : "guests"}</span>
          <span className="text-muted-foreground/40 mx-1">·</span>
          <Clock className="h-3.5 w-3.5 shrink-0" />
          <span>
            {new Date(walkIn.arrival_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>

        {walkIn.notes && (
          <p className="text-xs text-muted-foreground italic border-t border-border pt-2">"{walkIn.notes}"</p>
        )}

        {!isDone && (
          <div className="flex gap-2">
            {walkIn.status === "waiting" && (
              <button
                onClick={() => advance("seated")}
                disabled={mutation.isPending}
                className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-semibold bg-chart-3 hover:opacity-90 text-white disabled:opacity-50 transition-all"
              >
                {mutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <>Seat<ChevronRight className="h-3 w-3" /></>}
              </button>
            )}
            {walkIn.status === "seated" && (
              <button
                onClick={() => advance("done")}
                disabled={mutation.isPending}
                className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-semibold bg-muted hover:bg-muted/70 text-foreground disabled:opacity-50 transition-all"
              >
                {mutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <><CheckCircle2 className="h-3 w-3" />Done</>}
              </button>
            )}
            <button
              onClick={() => setShowPOS(true)}
              className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-semibold bg-chart-1/15 text-chart-1 hover:bg-chart-1/25 border border-chart-1/20 transition-all"
            >
              <ShoppingCart className="h-3 w-3" />Order
            </button>
          </div>
        )}
      </div>

      {showPOS && <PosModal walkIn={walkIn} onClose={() => setShowPOS(false)} />}
    </>
  );
}

// ─── Order card ───────────────────────────────────────────────────────────────

function OrderCard({ order }: { order: Order & { order_type?: string } }) {
  const queryClient = useQueryClient();
  const mutation = useUpdateOrderStatus();
  const next = ORDER_NEXT[order.status as OrderStatus];

  function advance() {
    if (!next) return;
    mutation.mutate(
      { id: order.id, data: { status: next.status } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetStaffDashboardQueryKey() });
        },
      }
    );
  }

  return (
    <div className="bg-background border border-border rounded-xl p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-1.5">
            <p className="font-mono text-xs text-muted-foreground">#{order.id.slice(0, 8).toUpperCase()}</p>
            {order.order_type === "walk_in" && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-chart-3/15 text-chart-3 border border-chart-3/20">
                Walk-in
              </span>
            )}
          </div>
          <p className="font-semibold text-foreground text-sm mt-0.5">₱{order.total_amount.toFixed(2)}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${ORDER_STATUS_STYLES[order.status] ?? ""}`}>
            {ORDER_STATUS_LABELS[order.status] ?? order.status}
          </span>
          <span className="text-xs text-muted-foreground">{timeAgo(order.created_at)}</span>
        </div>
      </div>

      <div className="space-y-1">
        {order.items.map((item) => (
          <div key={item.id} className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{item.menu_item_name} <span className="text-muted-foreground/60">× {item.quantity}</span></span>
            <span>₱{item.subtotal.toFixed(2)}</span>
          </div>
        ))}
        {order.notes && (
          <p className="text-xs text-muted-foreground italic mt-1 pt-1 border-t border-border">"{order.notes}"</p>
        )}
      </div>

      {next && (
        <button
          onClick={advance}
          disabled={mutation.isPending}
          className={`w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all disabled:opacity-50 ${next.color}`}
        >
          {mutation.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <>{next.label}<ChevronRight className="h-3.5 w-3.5" /></>
          )}
        </button>
      )}
    </div>
  );
}

// ─── Reservation card ─────────────────────────────────────────────────────────

function ReservationCard({ reservation }: { reservation: Reservation }) {
  const queryClient = useQueryClient();
  const mutation = useUpdateReservation();
  const actions = RES_NEXT[reservation.status as ReservationStatus] ?? [];
  const [pending, setPending] = React.useState<ReservationStatus | null>(null);

  function update(status: ReservationStatus) {
    setPending(status);
    mutation.mutate(
      { id: reservation.id, data: { status } },
      {
        onSettled: () => setPending(null),
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListReservationsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetStaffDashboardQueryKey() });
        },
      }
    );
  }

  const isTerminal = reservation.status === "completed" || reservation.status === "cancelled";

  return (
    <div className={`bg-background border rounded-xl p-4 flex flex-col gap-3 ${isTerminal ? "border-border opacity-60" : "border-border"}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-mono text-xs text-muted-foreground">#{reservation.id.slice(0, 8).toUpperCase()}</p>
          <p className="font-semibold text-foreground text-sm mt-0.5">{formatTime(reservation.reservation_time)}</p>
        </div>
        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${RES_STATUS_STYLES[reservation.status] ?? ""}`}>
          {RES_STATUS_LABELS[reservation.status] ?? reservation.status}
        </span>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Users className="h-3.5 w-3.5 shrink-0" />
          <span>{reservation.guest_count} {reservation.guest_count === 1 ? "guest" : "guests"}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5 shrink-0" />
          <span>{formatTime(reservation.reservation_time)} · {reservation.reservation_date}</span>
        </div>
        {reservation.notes && (
          <p className="text-xs text-muted-foreground italic">"{reservation.notes}"</p>
        )}
      </div>

      {actions.length > 0 && (
        <div className={`grid gap-2 ${actions.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
          {actions.map((action) => (
            <button
              key={action.status}
              onClick={() => update(action.status)}
              disabled={mutation.isPending}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all disabled:opacity-50 ${action.color}`}
            >
              {pending === action.status ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : action.status === "cancelled" ? (
                <><XCircle className="h-3.5 w-3.5" />{action.label}</>
              ) : action.status === "completed" ? (
                <><CheckCircle2 className="h-3.5 w-3.5" />{action.label}</>
              ) : (
                <>{action.label}<ChevronRight className="h-3.5 w-3.5" /></>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function StaffDashboard() {
  useRealtime();
  const [showRegisterWalkIn, setShowRegisterWalkIn] = useState(false);

  const { data, isLoading: statsLoading } = useGetStaffDashboard({
    query: { queryKey: getGetStaffDashboardQueryKey() },
  });

  const { data: orders = [], isLoading: ordersLoading } = useListOrders({
    query: { queryKey: getListOrdersQueryKey() },
  });

  const { data: reservations = [], isLoading: reservationsLoading } = useListReservations({
    query: { queryKey: getListReservationsQueryKey() },
  });

  const { data: walkIns = [], isLoading: walkInsLoading } = useListWalkIns();

  const today = todayDateStr();

  const activeOrders = (orders as (Order & { order_type?: string })[])
    .filter((o) => ACTIVE_ORDER_STATUSES.includes(o.status as OrderStatus))
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  const todaysReservations = reservations
    .filter((r) => r.reservation_date === today)
    .sort((a, b) => a.reservation_time.localeCompare(b.reservation_time));

  const activeReservations = todaysReservations.filter(
    (r) => r.status !== "completed" && r.status !== "cancelled"
  );

  const activeWalkIns = walkIns.filter((w) => w.status !== "done");
  const doneWalkIns = walkIns.filter((w) => w.status === "done");
  const seatedWalkIns = walkIns.filter((w) => w.status === "seated");

  return (
    <DashboardLayout role="staff" roleLabel="Staff" roleColor="text-chart-2">
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground" data-testid="text-dashboard-title">
            Staff Dashboard
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage orders, reservations, and tables.
          </p>
        </div>

        {/* Stat cards */}
        {statsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-card border border-card-border rounded-xl p-5 animate-pulse">
                <div className="h-10 w-10 bg-muted rounded-lg mb-4" />
                <div className="h-6 w-16 bg-muted rounded mb-1" />
                <div className="h-4 w-24 bg-muted rounded" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8">
            <StatCard
              title="Active Orders"
              value={activeOrders.length}
              icon={ShoppingBag}
              colorClass="bg-chart-1/15 text-chart-1"
              testId="stat-pending-orders"
            />
            <StatCard
              title="Today's Reservations"
              value={todaysReservations.length}
              icon={CalendarDays}
              colorClass="bg-chart-3/15 text-chart-3"
              testId="stat-todays-reservations"
            />
            <StatCard
              title="Active Tables"
              value={seatedWalkIns.length + (data?.active_tables ?? 0)}
              icon={Table2}
              colorClass="bg-chart-2/15 text-chart-2"
              testId="stat-active-tables"
            />
            <StatCard
              title="Walk-ins Today"
              value={walkIns.length}
              icon={UserPlus}
              colorClass="bg-chart-4/15 text-chart-4"
              testId="stat-walk-ins"
            />
          </div>
        )}

        {/* Walk-in customers */}
        <div className="bg-card border border-card-border rounded-xl p-6 mb-6">
          <div className="flex items-center gap-2 mb-5">
            <UserPlus className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-semibold text-foreground text-sm">Walk-in Customers</h2>
            {activeWalkIns.length > 0 && (
              <span className="bg-chart-4/15 text-chart-4 text-xs font-semibold px-2 py-0.5 rounded-full">
                {activeWalkIns.length} active
              </span>
            )}
            <button
              onClick={() => setShowRegisterWalkIn(true)}
              className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-chart-3 hover:opacity-90 text-white transition-all"
            >
              <Plus className="h-3.5 w-3.5" />Register Walk-in
            </button>
          </div>

          {walkInsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[1, 2].map((i) => (
                <div key={i} className="bg-background border border-border rounded-xl p-4 animate-pulse space-y-3">
                  <div className="flex justify-between">
                    <div className="h-4 w-24 bg-muted rounded" />
                    <div className="h-5 w-16 bg-muted rounded-full" />
                  </div>
                  <div className="h-3 w-20 bg-muted rounded" />
                  <div className="h-8 w-full bg-muted rounded-lg" />
                </div>
              ))}
            </div>
          ) : activeWalkIns.length === 0 && doneWalkIns.length === 0 ? (
            <div className="text-center py-10">
              <UserPlus className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">No walk-in customers registered.</p>
              <p className="text-muted-foreground/60 text-xs mt-1">Click "Register Walk-in" to add one.</p>
            </div>
          ) : (
            <>
              {activeWalkIns.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
                  {activeWalkIns.map((w) => (
                    <WalkInCard key={w.id} walkIn={w} />
                  ))}
                </div>
              )}
              {doneWalkIns.length > 0 && (
                <details className="group">
                  <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground transition-colors py-1 list-none flex items-center gap-1.5">
                    <ChevronRight className="h-3.5 w-3.5 group-open:rotate-90 transition-transform" />
                    {doneWalkIns.length} done
                  </summary>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-3">
                    {doneWalkIns.map((w) => (
                      <WalkInCard key={w.id} walkIn={w} />
                    ))}
                  </div>
                </details>
              )}
            </>
          )}
        </div>

        {/* Order queue */}
        <div className="bg-card border border-card-border rounded-xl p-6 mb-6">
          <div className="flex items-center gap-2 mb-5">
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-semibold text-foreground text-sm">Order Queue</h2>
            {activeOrders.length > 0 && (
              <span className="ml-auto bg-chart-1/15 text-chart-1 text-xs font-semibold px-2 py-0.5 rounded-full">
                {activeOrders.length} active
              </span>
            )}
          </div>

          {ordersLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-background border border-border rounded-xl p-4 animate-pulse space-y-3">
                  <div className="flex justify-between">
                    <div className="space-y-1.5">
                      <div className="h-3 w-20 bg-muted rounded" />
                      <div className="h-4 w-14 bg-muted rounded" />
                    </div>
                    <div className="h-5 w-20 bg-muted rounded-full" />
                  </div>
                  <div className="h-3 w-full bg-muted rounded" />
                  <div className="h-8 w-full bg-muted rounded-lg" />
                </div>
              ))}
            </div>
          ) : activeOrders.length === 0 ? (
            <div className="text-center py-10">
              <ShoppingBag className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">No active orders right now.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {activeOrders.map((order) => (
                <OrderCard key={order.id} order={order} />
              ))}
            </div>
          )}
        </div>

        {/* Reservations */}
        <div className="bg-card border border-card-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-semibold text-foreground text-sm">Today's Reservations</h2>
            {activeReservations.length > 0 && (
              <span className="ml-auto bg-chart-3/15 text-chart-3 text-xs font-semibold px-2 py-0.5 rounded-full">
                {activeReservations.length} active
              </span>
            )}
          </div>

          {reservationsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-background border border-border rounded-xl p-4 animate-pulse space-y-3">
                  <div className="flex justify-between">
                    <div className="space-y-1.5">
                      <div className="h-3 w-20 bg-muted rounded" />
                      <div className="h-4 w-16 bg-muted rounded" />
                    </div>
                    <div className="h-5 w-20 bg-muted rounded-full" />
                  </div>
                  <div className="space-y-1.5">
                    <div className="h-3 w-24 bg-muted rounded" />
                    <div className="h-3 w-32 bg-muted rounded" />
                  </div>
                  <div className="h-8 w-full bg-muted rounded-lg" />
                </div>
              ))}
            </div>
          ) : todaysReservations.length === 0 ? (
            <div className="text-center py-10">
              <CalendarDays className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">No reservations for today.</p>
            </div>
          ) : (
            <>
              {activeReservations.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
                  {activeReservations.map((r) => (
                    <ReservationCard key={r.id} reservation={r} />
                  ))}
                </div>
              )}
              {todaysReservations.length > activeReservations.length && (
                <details className="group">
                  <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground transition-colors py-1 list-none flex items-center gap-1.5">
                    <ChevronRight className="h-3.5 w-3.5 group-open:rotate-90 transition-transform" />
                    {todaysReservations.length - activeReservations.length} completed / cancelled
                  </summary>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-3">
                    {todaysReservations
                      .filter((r) => r.status === "completed" || r.status === "cancelled")
                      .map((r) => (
                        <ReservationCard key={r.id} reservation={r} />
                      ))}
                  </div>
                </details>
              )}
            </>
          )}
        </div>
      </div>

      {showRegisterWalkIn && <RegisterWalkInModal onClose={() => setShowRegisterWalkIn(false)} />}
    </DashboardLayout>
  );
}
