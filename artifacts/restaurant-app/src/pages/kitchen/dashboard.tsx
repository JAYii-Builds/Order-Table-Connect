import { ChefHat, CheckCircle2, Timer, Flame, ChevronRight, Loader2 } from "lucide-react";
import {
  useGetKitchenDashboard,
  getGetKitchenDashboardQueryKey,
  useListOrders,
  getListOrdersQueryKey,
  useUpdateOrderStatus,
  type Order,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import { StatCard } from "@/components/stat-card";
import { useRealtime } from "@/hooks/use-realtime";

type KitchenStatus = "confirmed" | "preparing" | "ready";

const STATUS_STYLES: Record<string, string> = {
  confirmed: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  preparing: "bg-orange-500/15 text-orange-400 border-orange-500/20",
  ready:     "bg-chart-2/15 text-chart-2 border-chart-2/20",
};

const STATUS_LABELS: Record<string, string> = {
  confirmed: "Waiting",
  preparing: "Preparing",
  ready:     "Ready",
};

const KITCHEN_NEXT: Partial<Record<KitchenStatus, { status: KitchenStatus; label: string; color: string }>> = {
  confirmed: { status: "preparing", label: "Start Cooking", color: "bg-orange-600 hover:bg-orange-500 text-white" },
  preparing: { status: "ready",     label: "Mark Ready",   color: "bg-chart-2 hover:opacity-90 text-white" },
};

const KITCHEN_STATUSES: KitchenStatus[] = ["confirmed", "preparing", "ready"];

function timeAgo(iso: string): string {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h`;
}

function urgencyColor(iso: string, status: string): string {
  if (status === "ready") return "border-chart-2/40";
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins >= 20) return "border-destructive/60";
  if (mins >= 10) return "border-orange-500/60";
  return "border-border";
}

function KitchenOrderCard({ order }: { order: Order }) {
  const queryClient = useQueryClient();
  const mutation = useUpdateOrderStatus();
  const next = KITCHEN_NEXT[order.status as KitchenStatus];

  function advance() {
    if (!next) return;
    mutation.mutate(
      { id: order.id, data: { status: next.status } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetKitchenDashboardQueryKey() });
        },
      }
    );
  }

  const elapsed = timeAgo(order.created_at);
  const urgency = urgencyColor(order.created_at, order.status);
  const isOld = Math.floor((Date.now() - new Date(order.created_at).getTime()) / 60000) >= 20;

  return (
    <div className={`bg-background border-2 rounded-xl p-4 flex flex-col gap-3 transition-colors ${urgency}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-mono text-xs text-muted-foreground">#{order.id.slice(0, 8).toUpperCase()}</p>
          <p className="font-semibold text-foreground text-sm mt-0.5">₱{order.total_amount.toFixed(2)}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${STATUS_STYLES[order.status] ?? ""}`}>
            {STATUS_LABELS[order.status] ?? order.status}
          </span>
          <span className={`text-xs font-medium flex items-center gap-1 ${isOld && order.status !== "ready" ? "text-destructive" : "text-muted-foreground"}`}>
            {isOld && order.status !== "ready" && <Flame className="h-3 w-3" />}
            {elapsed}
          </span>
        </div>
      </div>

      <div className="space-y-1.5">
        {order.items.map((item) => (
          <div key={item.id} className="flex items-center justify-between gap-2">
            <span className="text-sm text-foreground font-medium">{item.menu_item_name}</span>
            <span className="text-sm font-bold text-foreground shrink-0">× {item.quantity}</span>
          </div>
        ))}
        {order.notes && (
          <p className="text-xs text-muted-foreground italic mt-1 pt-1.5 border-t border-border">"{order.notes}"</p>
        )}
      </div>

      {next ? (
        <button
          onClick={advance}
          disabled={mutation.isPending}
          className={`w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-50 ${next.color}`}
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
      ) : (
        <div className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-chart-2/10 text-chart-2 text-xs font-semibold">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Ready for pickup
        </div>
      )}
    </div>
  );
}

export default function KitchenDashboard() {
  useRealtime();

  const { data, isLoading: statsLoading } = useGetKitchenDashboard({
    query: { queryKey: getGetKitchenDashboardQueryKey() },
  });

  const { data: orders = [], isLoading: ordersLoading } = useListOrders({
    query: { queryKey: getListOrdersQueryKey() },
  });

  console.log("[KDS] GET /api/orders response:", orders.map((o) => ({ id: o.id.slice(0, 8), status: o.status })));

  const kitchenOrders = orders
    .filter((o) => KITCHEN_STATUSES.includes(o.status as KitchenStatus))
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  const inProgress = kitchenOrders.filter((o) => o.status === "preparing").length;
  const waiting    = kitchenOrders.filter((o) => o.status === "confirmed").length;
  const readyCount = kitchenOrders.filter((o) => o.status === "ready").length;

  return (
    <DashboardLayout role="kitchen" roleLabel="Kitchen Staff" roleColor="text-chart-3">
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground" data-testid="text-dashboard-title">
            Kitchen Dashboard
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Monitor order queue and track preparation times.
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
              title="In Queue"
              value={waiting}
              icon={ChefHat}
              colorClass="bg-blue-500/15 text-blue-400"
              testId="stat-orders-in-queue"
            />
            <StatCard
              title="Cooking Now"
              value={inProgress}
              icon={Flame}
              colorClass="bg-orange-500/15 text-orange-400"
              testId="stat-orders-cooking"
            />
            <StatCard
              title="Ready for Pickup"
              value={readyCount}
              icon={CheckCircle2}
              colorClass="bg-chart-2/15 text-chart-2"
              testId="stat-orders-ready"
            />
          </div>
        )}

        <div className="bg-card border border-card-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <ChefHat className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-semibold text-foreground text-sm">Kitchen Queue</h2>
            {kitchenOrders.length > 0 && (
              <span className="ml-auto bg-chart-3/15 text-chart-3 text-xs font-semibold px-2 py-0.5 rounded-full">
                {kitchenOrders.length} orders
              </span>
            )}
            <div className="flex items-center gap-1 text-xs text-muted-foreground ml-2">
              <Timer className="h-3 w-3" />
              <span>Avg {data?.avg_prep_time_minutes ?? 0} min</span>
            </div>
          </div>

          {ordersLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-background border-2 border-border rounded-xl p-4 animate-pulse space-y-3">
                  <div className="flex justify-between">
                    <div className="space-y-1.5">
                      <div className="h-3 w-20 bg-muted rounded" />
                      <div className="h-4 w-14 bg-muted rounded" />
                    </div>
                    <div className="h-5 w-20 bg-muted rounded-full" />
                  </div>
                  <div className="space-y-1.5">
                    <div className="h-3.5 w-full bg-muted rounded" />
                    <div className="h-3.5 w-3/4 bg-muted rounded" />
                  </div>
                  <div className="h-9 w-full bg-muted rounded-lg" />
                </div>
              ))}
            </div>
          ) : kitchenOrders.length === 0 ? (
            <div className="text-center py-12">
              <ChefHat className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">Kitchen is clear — no orders in queue.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {kitchenOrders.map((order) => (
                <KitchenOrderCard key={order.id} order={order} />
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
