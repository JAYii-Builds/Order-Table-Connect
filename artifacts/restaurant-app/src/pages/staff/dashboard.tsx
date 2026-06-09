import { Table2, ShoppingBag, CalendarDays, ClipboardList, ChevronRight, Loader2 } from "lucide-react";
import {
  useGetStaffDashboard,
  getGetStaffDashboardQueryKey,
  useListOrders,
  getListOrdersQueryKey,
  useUpdateOrderStatus,
  type Order,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import { StatCard } from "@/components/stat-card";
import { useRealtime } from "@/hooks/use-realtime";

type OrderStatus = "pending" | "confirmed" | "preparing" | "ready" | "delivered" | "cancelled";

const STATUS_STYLES: Record<string, string> = {
  pending:   "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
  confirmed: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  preparing: "bg-orange-500/15 text-orange-400 border-orange-500/20",
  ready:     "bg-chart-2/15 text-chart-2 border-chart-2/20",
  delivered: "bg-muted/60 text-muted-foreground border-border",
  cancelled: "bg-destructive/15 text-destructive border-destructive/20",
};

const STATUS_LABELS: Record<string, string> = {
  pending:   "Pending",
  confirmed: "Confirmed",
  preparing: "Preparing",
  ready:     "Ready",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const STAFF_NEXT: Partial<Record<OrderStatus, { status: OrderStatus; label: string; color: string }>> = {
  pending:   { status: "confirmed", label: "Confirm",      color: "bg-blue-600 hover:bg-blue-500 text-white" },
  confirmed: { status: "preparing", label: "Start Prep",   color: "bg-orange-600 hover:bg-orange-500 text-white" },
  preparing: { status: "ready",     label: "Mark Ready",   color: "bg-chart-2 hover:opacity-90 text-white" },
  ready:     { status: "delivered", label: "Delivered",    color: "bg-muted hover:bg-muted/70 text-foreground" },
};

const ACTIVE_STATUSES: OrderStatus[] = ["pending", "confirmed", "preparing", "ready"];

function timeAgo(iso: string): string {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

function OrderCard({ order }: { order: Order }) {
  const queryClient = useQueryClient();
  const mutation = useUpdateOrderStatus();
  const next = STAFF_NEXT[order.status as OrderStatus];

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
          <p className="font-mono text-xs text-muted-foreground">#{order.id.slice(0, 8).toUpperCase()}</p>
          <p className="font-semibold text-foreground text-sm mt-0.5">₱{order.total_amount.toFixed(2)}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${STATUS_STYLES[order.status] ?? ""}`}>
            {STATUS_LABELS[order.status] ?? order.status}
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
            <>
              {next.label}
              <ChevronRight className="h-3.5 w-3.5" />
            </>
          )}
        </button>
      )}
    </div>
  );
}

export default function StaffDashboard() {
  useRealtime();

  const { data, isLoading: statsLoading } = useGetStaffDashboard({
    query: { queryKey: getGetStaffDashboardQueryKey() },
  });

  const { data: orders = [], isLoading: ordersLoading } = useListOrders({
    query: { queryKey: getListOrdersQueryKey() },
  });

  const activeOrders = orders
    .filter((o) => ACTIVE_STATUSES.includes(o.status as OrderStatus))
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  return (
    <DashboardLayout role="staff" roleLabel="Staff" roleColor="text-chart-2">
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground" data-testid="text-dashboard-title">
            Staff Dashboard
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage tables, orders, and today's reservations.
          </p>
        </div>

        {statsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-card border border-card-border rounded-xl p-5 animate-pulse">
                <div className="h-10 w-10 bg-muted rounded-lg mb-4" />
                <div className="h-6 w-16 bg-muted rounded mb-1" />
                <div className="h-4 w-24 bg-muted rounded" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <StatCard
              title="Active Tables"
              value={data?.active_tables ?? 0}
              icon={Table2}
              colorClass="bg-chart-2/15 text-chart-2"
              testId="stat-active-tables"
            />
            <StatCard
              title="Active Orders"
              value={activeOrders.length}
              icon={ShoppingBag}
              colorClass="bg-chart-1/15 text-chart-1"
              testId="stat-pending-orders"
            />
            <StatCard
              title="Today's Reservations"
              value={data?.todays_reservations ?? 0}
              icon={CalendarDays}
              colorClass="bg-chart-3/15 text-chart-3"
              testId="stat-todays-reservations"
            />
          </div>
        )}

        <div className="bg-card border border-card-border rounded-xl p-6">
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
            <div className="text-center py-12">
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
      </div>
    </DashboardLayout>
  );
}
