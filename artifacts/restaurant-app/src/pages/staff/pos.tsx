import React, { useState, useMemo, useRef } from "react";
import {
  Search,
  UtensilsCrossed,
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  Loader2,
  CheckCircle2,
  RotateCcw,
  Receipt,
  ChevronRight,
  Printer,
  Users,
  Table2,
  CreditCard,
  Banknote,
  Smartphone,
  X,
  Clock,
} from "lucide-react";
import {
  useListMenuItems,
  getListMenuItemsQueryKey,
  useListOrders,
  getListOrdersQueryKey,
  useCreateOrder,
  useUpdateOrderStatus,
  getGetStaffDashboardQueryKey,
  getGetManagerDashboardQueryKey,
  type MenuItem,
  type Order,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import { useAuth } from "@/contexts/auth-context";
import { useRealtime } from "@/hooks/use-realtime";
import { encodeWalkinNotes, parseWalkinInfo } from "@/lib/walkin-utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type POSLeftTab = "menu" | "orders";
type PaymentStep = "cart" | "payment" | "receipt";
type DiscountType = "none" | "senior" | "pwd";
type PaymentMethod = "cash" | "gcash" | "maya" | "card";

interface POSCartItem {
  menuItem: MenuItem;
  quantity: number;
}

interface ReceiptData {
  orderId: string;
  timestamp: string;
  tableInfo: string;
  items: { name: string; qty: number; unitPrice: number; subtotal: number }[];
  subtotal: number;
  discountType: DiscountType;
  discountAmount: number;
  taxAmount: number;
  total: number;
  paymentMethod: PaymentMethod;
  cashReceived: number;
  change: number;
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

const PAYMENT_METHODS: { key: PaymentMethod; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "cash",   label: "Cash",   icon: Banknote },
  { key: "gcash",  label: "GCash",  icon: Smartphone },
  { key: "maya",   label: "Maya",   icon: Smartphone },
  { key: "card",   label: "Card",   icon: CreditCard },
];

const DISCOUNT_OPTIONS: { key: DiscountType; label: string; rate: number }[] = [
  { key: "none",   label: "No Discount", rate: 0    },
  { key: "senior", label: "Senior (20%)", rate: 0.20 },
  { key: "pwd",    label: "PWD (20%)",    rate: 0.20 },
];

const ORDER_STATUS_LABELS: Record<string, string> = {
  pending:   "Pending",
  confirmed: "Confirmed",
  preparing: "Preparing",
  ready:     "Ready for Pickup",
  delivered: "Completed",
  cancelled: "Cancelled",
};

const ORDER_STATUS_STYLES: Record<string, string> = {
  pending:   "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
  confirmed: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  preparing: "bg-orange-500/15 text-orange-400 border-orange-500/20",
  ready:     "bg-chart-2/15 text-chart-2 border-chart-2/20",
  delivered: "bg-muted/60 text-muted-foreground border-border",
  cancelled: "bg-destructive/15 text-destructive border-destructive/20",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const VAT_RATE = 0.12;

function computePricing(subtotal: number, discountRate: number) {
  const discountAmount = subtotal * discountRate;
  const discountedSubtotal = subtotal - discountAmount;
  const taxAmount = discountedSubtotal * VAT_RATE;
  const total = discountedSubtotal + taxAmount;
  return { discountAmount, taxAmount, total };
}

function timeAgo(iso: string): string {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

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
          ? "border-primary/50 ring-1 ring-primary/20"
          : "border-border hover:border-border/80"
      }`}
    >
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
        <div className="text-center py-1 text-xs text-muted-foreground bg-muted/40 rounded-lg">Unavailable</div>
      ) : quantity === 0 ? (
        <button onClick={onAdd} className="w-full flex items-center justify-center gap-1 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold transition-colors">
          <Plus className="h-3 w-3" /> Add
        </button>
      ) : (
        <div className="flex items-center justify-between">
          <button onClick={onRemove} className="h-7 w-7 flex items-center justify-center rounded-lg bg-muted hover:bg-destructive/10 hover:text-destructive text-muted-foreground transition-colors">
            <Minus className="h-3.5 w-3.5" />
          </button>
          <span className="font-bold text-sm text-foreground w-5 text-center">{quantity}</span>
          <button onClick={onAdd} className="h-7 w-7 flex items-center justify-center rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-colors">
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

function ExistingOrderCard({
  order,
  selected,
  onClick,
}: {
  order: Order;
  selected: boolean;
  onClick: () => void;
}) {
  const walkin = parseWalkinInfo(order.notes);
  return (
    <div
      onClick={onClick}
      className={`bg-background border rounded-xl p-4 cursor-pointer transition-all ${
        selected
          ? "border-primary/60 ring-1 ring-primary/20"
          : "border-border hover:border-border/60"
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <p className="font-mono text-xs text-muted-foreground">#{order.id.slice(0, 8).toUpperCase()}</p>
          <p className="font-bold text-foreground text-sm mt-0.5">₱{order.total_amount.toFixed(2)}</p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${ORDER_STATUS_STYLES[order.status] ?? ""}`}>
            {ORDER_STATUS_LABELS[order.status] ?? order.status}
          </span>
          {walkin && (
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold border bg-chart-3/15 text-chart-3 border-chart-3/20">
              Walk-in · T{walkin.table}
            </span>
          )}
        </div>
      </div>
      <div className="space-y-0.5">
        {order.items.slice(0, 3).map((item) => (
          <p key={item.id} className="text-xs text-muted-foreground">
            {item.menu_item_name} × {item.quantity}
          </p>
        ))}
        {order.items.length > 3 && (
          <p className="text-xs text-muted-foreground/60">+{order.items.length - 3} more</p>
        )}
      </div>
      <p className="text-xs text-muted-foreground/60 mt-2">{timeAgo(order.created_at)}</p>
    </div>
  );
}

// ─── Receipt component ────────────────────────────────────────────────────────

function ReceiptView({ receipt, onNew }: { receipt: ReceiptData; onNew: () => void }) {
  const receiptRef = useRef<HTMLDivElement>(null);

  function handlePrint() {
    const content = receiptRef.current;
    if (!content) return;
    const win = window.open("", "_blank", "width=380,height=600");
    if (!win) return;
    win.document.write(`
      <!DOCTYPE html><html><head>
      <title>Receipt #${receipt.orderId.slice(0, 8).toUpperCase()}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Courier New', monospace; font-size: 12px; padding: 16px; background: #fff; color: #000; }
        .header { text-align: center; margin-bottom: 12px; }
        .header h2 { font-size: 16px; font-weight: bold; }
        .divider { border-top: 1px dashed #000; margin: 8px 0; }
        .row { display: flex; justify-content: space-between; margin: 2px 0; }
        .bold { font-weight: bold; }
        .right { text-align: right; }
        .center { text-align: center; }
        .total-row { font-size: 14px; }
        .footer { text-align: center; margin-top: 12px; font-size: 11px; }
      </style>
      </head><body>
      <div class="header">
        <h2>TableServe</h2>
        <p>Official Receipt</p>
        <p>${receipt.timestamp}</p>
        <p>Order #${receipt.orderId.slice(0, 8).toUpperCase()}</p>
        ${receipt.tableInfo ? `<p>${receipt.tableInfo}</p>` : ""}
      </div>
      <div class="divider"></div>
      ${receipt.items.map((i) => `
        <div class="row"><span>${i.name} x${i.qty}</span><span>₱${i.subtotal.toFixed(2)}</span></div>
      `).join("")}
      <div class="divider"></div>
      <div class="row"><span>Subtotal</span><span>₱${receipt.subtotal.toFixed(2)}</span></div>
      ${receipt.discountAmount > 0 ? `<div class="row"><span>${receipt.discountType === "senior" ? "Senior" : "PWD"} Discount (20%)</span><span>-₱${receipt.discountAmount.toFixed(2)}</span></div>` : ""}
      <div class="row"><span>VAT (12%)</span><span>₱${receipt.taxAmount.toFixed(2)}</span></div>
      <div class="divider"></div>
      <div class="row bold total-row"><span>TOTAL</span><span>₱${receipt.total.toFixed(2)}</span></div>
      <div class="divider"></div>
      <div class="row"><span>Payment</span><span>${receipt.paymentMethod.toUpperCase()}</span></div>
      ${receipt.paymentMethod === "cash" ? `
        <div class="row"><span>Cash Received</span><span>₱${receipt.cashReceived.toFixed(2)}</span></div>
        <div class="row bold"><span>Change</span><span>₱${receipt.change.toFixed(2)}</span></div>
      ` : ""}
      <div class="footer">Thank you for dining with us!</div>
      </body></html>
    `);
    win.document.close();
    win.focus();
    win.print();
    win.close();
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 py-4 border-b border-border shrink-0 flex items-center gap-2">
        <CheckCircle2 className="h-4 w-4 text-chart-2" />
        <h2 className="font-semibold text-foreground text-sm">Payment Successful</h2>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        {/* Receipt */}
        <div
          ref={receiptRef}
          className="bg-background border border-border rounded-xl p-4 font-mono text-xs space-y-2"
        >
          <div className="text-center space-y-0.5">
            <p className="font-bold text-sm text-foreground">TableServe</p>
            <p className="text-muted-foreground">Official Receipt</p>
            <p className="text-muted-foreground">{receipt.timestamp}</p>
            <p className="font-mono text-muted-foreground">#{receipt.orderId.slice(0, 8).toUpperCase()}</p>
            {receipt.tableInfo && <p className="text-muted-foreground">{receipt.tableInfo}</p>}
          </div>

          <div className="border-t border-dashed border-border" />

          <div className="space-y-1">
            {receipt.items.map((item, i) => (
              <div key={i} className="flex justify-between text-foreground">
                <span className="truncate max-w-[55%]">{item.name} ×{item.qty}</span>
                <span>₱{item.subtotal.toFixed(2)}</span>
              </div>
            ))}
          </div>

          <div className="border-t border-dashed border-border" />

          <div className="space-y-1">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span><span>₱{receipt.subtotal.toFixed(2)}</span>
            </div>
            {receipt.discountAmount > 0 && (
              <div className="flex justify-between text-chart-2">
                <span>{receipt.discountType === "senior" ? "Senior" : "PWD"} Disc. (20%)</span>
                <span>-₱{receipt.discountAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-muted-foreground">
              <span>VAT (12%)</span><span>₱{receipt.taxAmount.toFixed(2)}</span>
            </div>
          </div>

          <div className="border-t border-dashed border-border" />

          <div className="flex justify-between font-bold text-sm text-foreground">
            <span>TOTAL</span><span>₱{receipt.total.toFixed(2)}</span>
          </div>

          <div className="border-t border-dashed border-border" />

          <div className="space-y-1">
            <div className="flex justify-between text-muted-foreground">
              <span>Payment</span><span className="uppercase">{receipt.paymentMethod}</span>
            </div>
            {receipt.paymentMethod === "cash" && (
              <>
                <div className="flex justify-between text-muted-foreground">
                  <span>Cash Received</span><span>₱{receipt.cashReceived.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-foreground">
                  <span>Change</span><span>₱{receipt.change.toFixed(2)}</span>
                </div>
              </>
            )}
          </div>

          <div className="text-center text-muted-foreground pt-2">
            Thank you for dining with us!
          </div>
        </div>
      </div>

      <div className="px-5 pb-5 pt-3 border-t border-border space-y-2 shrink-0">
        <button
          onClick={handlePrint}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-border bg-background hover:bg-muted/50 text-foreground text-sm font-semibold transition-colors"
        >
          <Printer className="h-4 w-4" /> Print Receipt
        </button>
        <button
          onClick={onNew}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-opacity"
        >
          <RotateCcw className="h-4 w-4" /> New Transaction
        </button>
      </div>
    </div>
  );
}

// ─── Main POS page ────────────────────────────────────────────────────────────

export default function POSPage() {
  useRealtime();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const role = user?.role ?? "staff";

  // Left panel
  const [leftTab, setLeftTab] = useState<POSLeftTab>("menu");
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [orderSearch, setOrderSearch] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState("all");

  // Cart (new order mode)
  const [cart, setCart] = useState<POSCartItem[]>([]);
  const [tableNumber, setTableNumber] = useState("");
  const [guestCount, setGuestCount] = useState(1);
  const [isWalkin, setIsWalkin] = useState(true);
  const [cartNotes, setCartNotes] = useState("");

  // Existing order selection
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Payment
  const [paymentStep, setPaymentStep] = useState<PaymentStep>("cart");
  const [discountType, setDiscountType] = useState<DiscountType>("none");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [cashReceived, setCashReceived] = useState("");
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);

  // Data
  const { data: menuItems = [], isLoading: menuLoading } = useListMenuItems(
    { available_only: false },
    { query: { queryKey: getListMenuItemsQueryKey({ available_only: false }) } }
  );

  const { data: allOrders = [], isLoading: ordersLoading } = useListOrders({
    query: { queryKey: getListOrdersQueryKey() },
  });

  const createOrderMutation = useCreateOrder();
  const updateStatusMutation = useUpdateOrderStatus();

  // ─── Derived data ──────────────────────────────────────────────

  const filteredMenuItems = useMemo(
    () =>
      menuItems
        .filter((i) => activeCategory === "all" || i.category === activeCategory)
        .filter(
          (i) =>
            search.trim() === "" ||
            i.name.toLowerCase().includes(search.toLowerCase())
        ),
    [menuItems, activeCategory, search]
  );

  const availableCategories = CATEGORIES.filter(
    (c) => c.value === "all" || menuItems.some((m) => m.category === c.value)
  );

  const payableOrders = useMemo(
    () =>
      allOrders
        .filter((o) => o.status !== "delivered" && o.status !== "cancelled")
        .filter(
          (o) =>
            orderStatusFilter === "all" || o.status === orderStatusFilter
        )
        .filter(
          (o) =>
            orderSearch.trim() === "" ||
            o.id.toLowerCase().includes(orderSearch.toLowerCase()) ||
            (o.notes ?? "").toLowerCase().includes(orderSearch.toLowerCase())
        )
        .sort((a, b) => {
          const priority = ["ready", "preparing", "confirmed", "pending"];
          return priority.indexOf(a.status) - priority.indexOf(b.status);
        }),
    [allOrders, orderStatusFilter, orderSearch]
  );

  // ─── Pricing ──────────────────────────────────────────────────

  const activeItems = selectedOrder
    ? selectedOrder.items.map((i) => ({ name: i.menu_item_name, qty: i.quantity, unitPrice: i.unit_price, subtotal: i.subtotal }))
    : cart.map((c) => ({
        name: c.menuItem.name,
        qty: c.quantity,
        unitPrice: Number(c.menuItem.price),
        subtotal: Number(c.menuItem.price) * c.quantity,
      }));

  const subtotal = selectedOrder
    ? selectedOrder.total_amount
    : cart.reduce((s, c) => s + Number(c.menuItem.price) * c.quantity, 0);

  const discountRate = DISCOUNT_OPTIONS.find((d) => d.key === discountType)?.rate ?? 0;
  const { discountAmount, taxAmount, total } = computePricing(subtotal, discountRate);

  const cashReceivedNum = parseFloat(cashReceived) || 0;
  const change = Math.max(0, cashReceivedNum - total);
  const cashInsufficient = paymentMethod === "cash" && cashReceivedNum < total && cashReceived !== "";

  // ─── Cart helpers ─────────────────────────────────────────────

  function getQty(id: string) {
    return cart.find((c) => c.menuItem.id === id)?.quantity ?? 0;
  }

  function addItem(item: MenuItem) {
    if (selectedOrder) return;
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

  function deleteCartItem(id: string) {
    setCart((prev) => prev.filter((c) => c.menuItem.id !== id));
  }

  function selectExistingOrder(order: Order) {
    setSelectedOrder(order);
    setCart([]);
    setPaymentStep("cart");
    setDiscountType("none");
    setPaymentMethod("cash");
    setCashReceived("");
  }

  function clearSelection() {
    setSelectedOrder(null);
    setPaymentStep("cart");
  }

  function resetTransaction() {
    setCart([]);
    setTableNumber("");
    setGuestCount(1);
    setCartNotes("");
    setSelectedOrder(null);
    setPaymentStep("cart");
    setDiscountType("none");
    setPaymentMethod("cash");
    setCashReceived("");
    setReceipt(null);
    setLeftTab("menu");
  }

  // ─── Payment processing ────────────────────────────────────────

  function buildTableInfo(): string {
    if (selectedOrder) {
      const wi = parseWalkinInfo(selectedOrder.notes);
      if (wi) return `Walk-in · Table ${wi.table} · ${wi.guests} guests`;
    }
    if (tableNumber.trim()) {
      const label = isWalkin ? "Walk-in · " : "";
      return `${label}Table ${tableNumber} · ${guestCount} guests`;
    }
    return "";
  }

  function processPayment() {
    const timestamp = new Date().toLocaleString("en-PH", {
      dateStyle: "medium",
      timeStyle: "short",
    });

    const finalizeReceipt = (orderId: string) => {
      const receiptData: ReceiptData = {
        orderId,
        timestamp,
        tableInfo: buildTableInfo(),
        items: activeItems.map((i) => ({
          name: i.name ?? "Item",
          qty: i.qty,
          unitPrice: i.unitPrice,
          subtotal: i.subtotal,
        })),
        subtotal,
        discountType,
        discountAmount,
        taxAmount,
        total,
        paymentMethod,
        cashReceived: cashReceivedNum,
        change,
      };
      setReceipt(receiptData);
      setPaymentStep("receipt");
      queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetStaffDashboardQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetManagerDashboardQueryKey() });
    };

    if (selectedOrder) {
      // If kitchen is done, deliver. Otherwise confirm so kitchen can start preparing.
      const nextStatus = selectedOrder.status === "ready" ? "delivered" : "confirmed";
      updateStatusMutation.mutate(
        { id: selectedOrder.id, data: { status: nextStatus } },
        { onSuccess: () => finalizeReceipt(selectedOrder.id) }
      );
    } else {
      const notes = isWalkin && tableNumber.trim()
        ? encodeWalkinNotes(tableNumber, guestCount, cartNotes)
        : cartNotes || null;

      createOrderMutation.mutate(
        {
          data: {
            items: cart.map((c) => ({ menu_item_id: c.menuItem.id, quantity: c.quantity })),
            notes: notes ?? undefined,
          },
        },
        {
          onSuccess: (order) => {
            // Payment taken — confirm so kitchen sees it immediately.
            updateStatusMutation.mutate(
              { id: order.id, data: { status: "confirmed" } },
              { onSuccess: () => finalizeReceipt(order.id) }
            );
          },
        }
      );
    }
  }

  const isProcessing = createOrderMutation.isPending || updateStatusMutation.isPending;
  const canProcessPayment =
    paymentMethod !== "cash" || (cashReceivedNum >= total && total > 0);
  const hasItems = selectedOrder ? true : cart.length > 0;

  // ─── Role-aware nav label ──────────────────────────────────────

  const roleLabel =
    role === "manager" ? "Manager" :
    role === "admin"   ? "Admin" : "Staff";
  const roleColor =
    role === "manager" ? "text-chart-3" :
    role === "admin"   ? "text-chart-5" : "text-chart-2";

  // ─── Render ────────────────────────────────────────────────────

  return (
    <DashboardLayout role={role} roleLabel={roleLabel} roleColor={roleColor}>
      <div className="flex h-full overflow-hidden">

        {/* ═══ LEFT PANEL ═══════════════════════════════════════════════ */}
        <div className="flex-1 flex flex-col overflow-hidden border-r border-border">
          {/* Left header + tabs */}
          <div className="px-5 py-4 border-b border-border shrink-0">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h1 className="text-lg font-bold text-foreground">Point of Sale</h1>
                <p className="text-xs text-muted-foreground mt-0.5">Browse menu or select an existing order to charge</p>
              </div>
              <div className="flex items-center gap-1 bg-muted p-1 rounded-xl">
                <button
                  onClick={() => setLeftTab("menu")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${leftTab === "menu" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                >
                  Menu
                </button>
                <button
                  onClick={() => setLeftTab("orders")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${leftTab === "orders" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                >
                  Orders {payableOrders.length > 0 && `(${payableOrders.length})`}
                </button>
              </div>
            </div>

            {/* Search */}
            {leftTab === "menu" ? (
              <div className="space-y-2.5">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search menu items…"
                    className="w-full pl-9 pr-4 py-2 text-sm bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 transition"
                  />
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                  {availableCategories.map((cat) => (
                    <button
                      key={cat.value}
                      onClick={() => setActiveCategory(cat.value)}
                      className={`shrink-0 px-3 py-1 rounded-full text-xs font-semibold transition-all ${activeCategory === cat.value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={orderSearch}
                    onChange={(e) => setOrderSearch(e.target.value)}
                    placeholder="Search by order ID or table…"
                    className="w-full pl-9 pr-4 py-2 text-sm bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 transition"
                  />
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                  {["all", "ready", "preparing", "confirmed", "pending"].map((s) => {
                    const count = s === "all" ? payableOrders.length : allOrders.filter((o) => o.status === s && o.status !== "delivered" && o.status !== "cancelled").length;
                    return (
                      <button
                        key={s}
                        onClick={() => setOrderStatusFilter(s)}
                        className={`shrink-0 flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold transition-all ${orderStatusFilter === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}
                      >
                        {s === "all" ? "All" : ORDER_STATUS_LABELS[s]}
                        {count > 0 && <span className="text-xs">{count}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Left content */}
          <div className="flex-1 overflow-y-auto px-5 py-4">
            {leftTab === "menu" ? (
              menuLoading ? (
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
              ) : filteredMenuItems.length === 0 ? (
                <div className="text-center py-16">
                  <UtensilsCrossed className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
                  <p className="text-muted-foreground text-sm">No items found.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {filteredMenuItems.map((item) => (
                    <MenuItemCard
                      key={item.id}
                      item={item}
                      quantity={selectedOrder ? 0 : getQty(item.id)}
                      onAdd={() => addItem(item)}
                      onRemove={() => removeItem(item.id)}
                    />
                  ))}
                </div>
              )
            ) : ordersLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="bg-background border border-border rounded-xl p-4 animate-pulse space-y-2">
                    <div className="flex justify-between">
                      <div className="space-y-1.5"><div className="h-3 w-20 bg-muted rounded" /><div className="h-4 w-14 bg-muted rounded" /></div>
                      <div className="h-5 w-20 bg-muted rounded-full" />
                    </div>
                    <div className="h-3 w-full bg-muted rounded" />
                  </div>
                ))}
              </div>
            ) : payableOrders.length === 0 ? (
              <div className="text-center py-16">
                <ShoppingBag className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">No orders to charge.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {payableOrders.map((order) => (
                  <ExistingOrderCard
                    key={order.id}
                    order={order}
                    selected={selectedOrder?.id === order.id}
                    onClick={() => selectExistingOrder(order)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ═══ RIGHT PANEL ══════════════════════════════════════════════ */}
        <div className="w-[340px] shrink-0 flex flex-col bg-card overflow-hidden">
          {/* Receipt view */}
          {paymentStep === "receipt" && receipt ? (
            <ReceiptView receipt={receipt} onNew={resetTransaction} />
          ) : paymentStep === "payment" ? (
            /* ─── Payment step ──────────────────────────────────────── */
            <>
              <div className="px-5 py-4 border-b border-border shrink-0 flex items-center gap-2">
                <button
                  onClick={() => setPaymentStep("cart")}
                  className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground transition-colors"
                >
                  <ChevronRight className="h-4 w-4 rotate-180" />
                </button>
                <Receipt className="h-4 w-4 text-muted-foreground" />
                <h2 className="font-semibold text-foreground text-sm">Payment</h2>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
                {/* Order mini-summary */}
                <div className="bg-background border border-border rounded-xl p-3 space-y-1.5">
                  {activeItems.slice(0, 4).map((item, i) => (
                    <div key={i} className="flex justify-between text-xs text-muted-foreground">
                      <span className="truncate max-w-[60%]">{item.name} × {item.qty}</span>
                      <span>₱{item.subtotal.toFixed(2)}</span>
                    </div>
                  ))}
                  {activeItems.length > 4 && (
                    <p className="text-xs text-muted-foreground/60">+{activeItems.length - 4} more items</p>
                  )}
                </div>

                {/* Discount */}
                <div>
                  <p className="text-xs font-semibold text-foreground mb-2">Discount</p>
                  <div className="grid grid-cols-3 gap-1.5">
                    {DISCOUNT_OPTIONS.map((d) => (
                      <button
                        key={d.key}
                        onClick={() => setDiscountType(d.key)}
                        className={`py-2 px-2 rounded-xl text-xs font-semibold border transition-all ${discountType === d.key ? "border-primary bg-primary/10 text-primary" : "border-border bg-background text-muted-foreground hover:text-foreground"}`}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Price breakdown */}
                <div className="bg-background border border-border rounded-xl p-3 space-y-1.5">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Subtotal</span><span>₱{subtotal.toFixed(2)}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-xs text-chart-2">
                      <span>{discountType === "senior" ? "Senior" : "PWD"} Discount (20%)</span>
                      <span>-₱{discountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>VAT (12%)</span><span>₱{taxAmount.toFixed(2)}</span>
                  </div>
                  <div className="border-t border-border pt-1.5 flex justify-between text-sm font-bold text-foreground">
                    <span>Total</span><span>₱{total.toFixed(2)}</span>
                  </div>
                </div>

                {/* Payment method */}
                <div>
                  <p className="text-xs font-semibold text-foreground mb-2">Payment Method</p>
                  <div className="grid grid-cols-2 gap-2">
                    {PAYMENT_METHODS.map((m) => {
                      const Icon = m.icon;
                      return (
                        <button
                          key={m.key}
                          onClick={() => setPaymentMethod(m.key)}
                          className={`flex items-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-semibold transition-all ${paymentMethod === m.key ? "border-primary bg-primary/10 text-primary" : "border-border bg-background text-muted-foreground hover:text-foreground"}`}
                        >
                          <Icon className="h-3.5 w-3.5" />
                          {m.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Cash amount */}
                {paymentMethod === "cash" && (
                  <div>
                    <label className="text-xs font-semibold text-foreground block mb-2">Amount Received</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">₱</span>
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        value={cashReceived}
                        onChange={(e) => setCashReceived(e.target.value)}
                        placeholder="0.00"
                        className={`w-full pl-7 pr-3 py-2.5 text-sm bg-background border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 transition ${cashInsufficient ? "border-destructive focus:ring-destructive/50" : "border-border focus:ring-primary/50 focus:border-primary/50"}`}
                      />
                    </div>
                    {cashReceived !== "" && (
                      <div className={`mt-2 flex justify-between text-sm px-1 ${cashInsufficient ? "text-destructive" : "text-chart-2 font-semibold"}`}>
                        <span>{cashInsufficient ? "Insufficient amount" : "Change"}</span>
                        {!cashInsufficient && <span>₱{change.toFixed(2)}</span>}
                      </div>
                    )}
                    {/* Quick amounts */}
                    <div className="flex gap-2 mt-2 flex-wrap">
                      {[Math.ceil(total / 10) * 10, Math.ceil(total / 50) * 50, Math.ceil(total / 100) * 100, Math.ceil(total / 500) * 500].filter((v, i, a) => a.indexOf(v) === i && v >= total).slice(0, 4).map((amt) => (
                        <button
                          key={amt}
                          onClick={() => setCashReceived(amt.toString())}
                          className="px-2.5 py-1 text-xs bg-muted hover:bg-muted/70 text-muted-foreground hover:text-foreground rounded-lg transition-colors"
                        >
                          ₱{amt.toFixed(0)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="px-5 pb-5 pt-3 border-t border-border shrink-0">
                <button
                  onClick={processPayment}
                  disabled={isProcessing || !canProcessPayment || total === 0}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isProcessing ? (
                    <><Loader2 className="h-4 w-4 animate-spin" />Processing…</>
                  ) : (
                    <><CheckCircle2 className="h-4 w-4" />Confirm Payment · ₱{total.toFixed(2)}</>
                  )}
                </button>
                {(createOrderMutation.isError || updateStatusMutation.isError) && (
                  <p className="text-xs text-destructive text-center mt-2">Payment failed. Please try again.</p>
                )}
              </div>
            </>
          ) : (
            /* ─── Cart step ─────────────────────────────────────────── */
            <>
              <div className="px-5 py-4 border-b border-border shrink-0 flex items-center gap-2">
                <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                <h2 className="font-semibold text-foreground text-sm">
                  {selectedOrder ? `Order #${selectedOrder.id.slice(0, 8).toUpperCase()}` : "Current Order"}
                </h2>
                {selectedOrder && (
                  <button
                    onClick={clearSelection}
                    className="ml-auto h-6 w-6 flex items-center justify-center rounded-md hover:bg-muted text-muted-foreground transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
                {!selectedOrder && cart.length > 0 && (
                  <span className="ml-auto bg-primary/10 text-primary text-xs font-bold px-2 py-0.5 rounded-full">
                    {cart.reduce((s, c) => s + c.quantity, 0)} items
                  </span>
                )}
              </div>

              {/* New order config (table/guests) */}
              {!selectedOrder && (
                <div className="px-5 pt-4 pb-3 border-b border-border space-y-3 shrink-0">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsWalkin(!isWalkin)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${isWalkin ? "bg-chart-3/15 text-chart-3 border-chart-3/20" : "bg-muted text-muted-foreground border-border"}`}
                    >
                      Walk-in
                    </button>
                    <span className="text-xs text-muted-foreground">Order type</span>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="text-xs text-muted-foreground font-medium block mb-1">Table No.</label>
                      <div className="relative">
                        <Table2 className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <input
                          type="text"
                          value={tableNumber}
                          onChange={(e) => setTableNumber(e.target.value)}
                          placeholder="e.g. 5"
                          className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 transition"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground font-medium block mb-1">Guests</label>
                      <div className="flex items-center gap-1">
                        <button onClick={() => setGuestCount((n) => Math.max(1, n - 1))} disabled={guestCount <= 1} className="h-7 w-7 flex items-center justify-center rounded-lg bg-muted text-muted-foreground disabled:opacity-40 hover:bg-muted/70 transition-colors">
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="text-xs font-bold text-foreground w-4 text-center">{guestCount}</span>
                        <button onClick={() => setGuestCount((n) => Math.min(20, n + 1))} disabled={guestCount >= 20} className="h-7 w-7 flex items-center justify-center rounded-lg bg-muted text-muted-foreground disabled:opacity-40 hover:bg-muted/70 transition-colors">
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Cart items */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
                {selectedOrder ? (
                  <>
                    {selectedOrder.items.map((item) => (
                      <div key={item.id} className="bg-background border border-border rounded-xl p-3 flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-foreground truncate">{item.menu_item_name}</p>
                          <p className="text-xs text-muted-foreground">
                            ₱{item.unit_price.toFixed(2)} × {item.quantity}
                          </p>
                        </div>
                        <span className="text-xs font-semibold text-foreground ml-2">₱{item.subtotal.toFixed(2)}</span>
                      </div>
                    ))}
                    {selectedOrder.notes && (
                      <p className="text-xs text-muted-foreground italic px-1">"{parseWalkinInfo(selectedOrder.notes)?.extraNotes || selectedOrder.notes}"</p>
                    )}
                  </>
                ) : cart.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full gap-3 text-center py-10">
                    <ShoppingBag className="h-10 w-10 text-muted-foreground/20" />
                    <p className="text-sm text-muted-foreground">
                      Add items from the menu<br />or select an existing order.
                    </p>
                  </div>
                ) : (
                  <>
                    {cart.map((c) => (
                      <div key={c.menuItem.id} className="bg-background border border-border rounded-xl p-3 flex items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-foreground truncate">{c.menuItem.name}</p>
                          <p className="text-xs text-muted-foreground">
                            ₱{Number(c.menuItem.price).toFixed(2)} × {c.quantity} = <span className="font-medium text-foreground">₱{(Number(c.menuItem.price) * c.quantity).toFixed(2)}</span>
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button onClick={() => removeItem(c.menuItem.id)} className="h-6 w-6 flex items-center justify-center rounded-md bg-muted hover:bg-destructive/10 hover:text-destructive text-muted-foreground transition-colors"><Minus className="h-3 w-3" /></button>
                          <span className="text-xs font-bold w-4 text-center">{c.quantity}</span>
                          <button onClick={() => addItem(c.menuItem)} className="h-6 w-6 flex items-center justify-center rounded-md bg-muted hover:bg-primary/10 hover:text-primary text-muted-foreground transition-colors"><Plus className="h-3 w-3" /></button>
                          <button onClick={() => deleteCartItem(c.menuItem.id)} className="h-6 w-6 flex items-center justify-center rounded-md hover:bg-destructive/10 hover:text-destructive text-muted-foreground transition-colors ml-0.5"><Trash2 className="h-3 w-3" /></button>
                        </div>
                      </div>
                    ))}
                    <textarea
                      value={cartNotes}
                      onChange={(e) => setCartNotes(e.target.value)}
                      placeholder="Notes (optional)"
                      rows={2}
                      className="w-full text-xs bg-background border border-border rounded-xl px-3 py-2 text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 transition"
                    />
                  </>
                )}
              </div>

              {/* Footer */}
              {hasItems && (
                <div className="px-5 pb-5 pt-3 border-t border-border shrink-0 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground font-medium">Subtotal</span>
                    <span className="font-bold text-foreground">₱{subtotal.toFixed(2)}</span>
                  </div>
                  {(!selectedOrder || selectedOrder.status === "pending") ? (
                    <button
                      onClick={() => setPaymentStep("payment")}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-opacity"
                    >
                      <Receipt className="h-4 w-4" /> Proceed to Payment
                    </button>
                  ) : (
                    <div className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-border bg-muted/40 text-sm font-semibold text-muted-foreground">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${ORDER_STATUS_STYLES[selectedOrder.status] ?? ""}`}>
                        {ORDER_STATUS_LABELS[selectedOrder.status] ?? selectedOrder.status}
                      </span>
                      Already paid — no further action needed
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
