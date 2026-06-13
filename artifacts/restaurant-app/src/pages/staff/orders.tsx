import React, { useState } from "react";
import {
  ShoppingBag,
  ChevronRight,
  Loader2,
  XCircle,
} from "lucide-react";
import {
  useListOrders,
  getListOrdersQueryKey,
  useUpdateOrderStatus,
  getGetStaffDashboardQueryKey,
  type Order,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import { useRealtime } from "@/hooks/use-realtime";

// ─── Types & config ───────────────────────────────────────────────────────────

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

const STATUS_TABS: { key: string; label: string }[] = [
  { key: "active",    label: "Active" },
  { key: "all",       label: "All Orders" },
  { key: "pending",   label: "Pending" },
  { key: "confirmed", label: "Confirmed" },
  { key: "preparing", label: "Preparing" },
  { key: "ready",     label: "Ready" },
  { key: "delivered", label: "Delivered" },
  { key: "cancelled", label: "Cancelled" },
];

const ACTIVE_STATUSES: OrderStatus[] = ["pending", "confirmed", "preparing", "ready"];

function timeAgo(iso: string): string {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ─── Order card ───────────────────────────────────────────────────────────────

function OrderCard({ order }: { order: Order }) {
  const queryClient = useQueryClient();
  const mutation = useUpdateOrderStatus();
  const next = ORDER_NEXT[order.status as OrderStatus];
  const [cancelling, setCancelling] = useState(false);

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

  function cancel() {
    setCancelling(true);
    mutation.mutate(
      { id: order.id, data: { status: "cancelled" } },
      {
        onSettled: () => setCancelling(false),
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetStaffDashboardQueryKey() });
        },
      }
    );
  }

  const isTerminal = order.status === "delivered" || order.status === "cancelled";

  return (
    <div className={`bg-background border border-border rounded-xl p-4 flex flex-col gap-3 ${isTerminal ? "opacity-60" : ""}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-mono text-xs text-muted-foreground">#{order.id.slice(0, 8).toUpperCase()}</p>
          <p className="font-bold text-foreground text-sm mt-0.5">₱{order.total_amount.toFixed(2)}</p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${ORDER_STATUS_STYLES[order.status] ?? ""}`}>
            {ORDER_STATUS_LABELS[order.status] ?? order.status}
          </span>
          <span className="text-xs text-muted-foreground">{timeAgo(order.created_at)}</span>
        </div>
      </div>

      {/* Items */}
      <div className="space-y-1">
        {order.items.map((item) => (
          <div key={item.id} className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {item.menu_item_name}{" "}
              <span className="text-muted-foreground/50">× {item.quantity}</span>
            </span>
            <span>₱{item.subtotal.toFixed(2)}</span>
          </div>
        ))}
        {order.notes && (
          <p className="text-xs text-muted-foreground italic mt-1 pt-1 border-t border-border">
            "{order.notes}"
          </p>
        )}
      </div>

      {/* Actions */}
      {!isTerminal && (
        <div className={`grid gap-2 ${next ? "grid-cols-2" : "grid-cols-1"}`}>
          {next && (
            <button
              onClick={advance}
              disabled={mutation.isPending}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all disabled:opacity-50 ${next.color}`}
            >
              {mutation.isPending && !cancelling ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <>{next.label}<ChevronRight className="h-3.5 w-3.5" /></>
              )}
            </button>
          )}
          <button
            onClick={cancel}
            disabled={mutation.isPending}
            className="flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all disabled:opacity-50 bg-destructive/10 hover:bg-destructive/20 text-destructive"
          >
            {cancelling ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <><XCircle className="h-3.5 w-3.5" />Cancel</>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function StaffOrdersPage() {
  useRealtime();

  const [activeTab, setActiveTab] = useState("active");

  const { data: orders = [], isLoading } = useListOrders({
    query: { queryKey: getListOrdersQueryKey() },
  });

  const filteredOrders = (() => {
    if (activeTab === "active") {
      return orders
        .filter((o) => ACTIVE_STATUSES.includes(o.status as OrderStatus))
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    }
    if (activeTab === "all") {
      return [...orders].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    }
    return orders
      .filter((o) => o.status === activeTab)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  })();

  const activeCount = orders.filter((o) => ACTIVE_STATUSES.includes(o.status as OrderStatus)).length;

  return (
    <DashboardLayout role="staff" roleLabel="Staff" roleColor="text-chart-2">
      <div className="p-8">
        {/* Page header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Walk-in Orders</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage and track all walk-in orders in real time.
          </p>
        </div>

        {/* Status tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 mb-6 scrollbar-hide">
          {STATUS_TABS.map((tab) => {
            const count =
              tab.key === "active"
                ? activeCount
                : tab.key === "all"
                ? orders.length
                : orders.filter((o) => o.status === tab.key).length;

            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  activeTab === tab.key
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/70"
                }`}
              >
                {tab.label}
                {count > 0 && (
                  <span
                    className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
                      activeTab === tab.key
                        ? "bg-primary-foreground/20 text-primary-foreground"
                        : "bg-background text-foreground"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Order grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-background border border-border rounded-xl p-4 animate-pulse space-y-3">
                <div className="flex justify-between">
                  <div className="space-y-1.5">
                    <div className="h-3 w-20 bg-muted rounded" />
                    <div className="h-4 w-14 bg-muted rounded" />
                  </div>
                  <div className="h-5 w-20 bg-muted rounded-full" />
                </div>
                <div className="h-3 w-full bg-muted rounded" />
                <div className="h-3 w-4/5 bg-muted rounded" />
                <div className="h-8 w-full bg-muted rounded-lg" />
              </div>
            ))}
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-20">
            <ShoppingBag className="h-12 w-12 text-muted-foreground/20 mx-auto mb-4" />
            <p className="text-muted-foreground text-sm font-medium">No orders found</p>
            <p className="text-muted-foreground/60 text-xs mt-1">
              {activeTab === "active"
                ? "All clear — no active orders right now."
                : "No orders match this filter."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {filteredOrders.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
