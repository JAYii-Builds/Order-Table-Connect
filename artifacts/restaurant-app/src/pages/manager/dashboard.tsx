import {
  TrendingUp,
  ShoppingBag,
  Users,
  Clock,
  Circle,
} from "lucide-react";
import {
  useGetManagerDashboard,
  getGetManagerDashboardQueryKey,
} from "@workspace/api-client-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { StatCard } from "@/components/stat-card";
import { useRealtime } from "@/hooks/use-realtime";

type StatusKey = "pending" | "confirmed" | "preparing" | "ready" | "delivered" | "cancelled";

const STATUS_CONFIG: Record<StatusKey, { label: string; dot: string; bar: string }> = {
  pending:   { label: "Pending",   dot: "bg-yellow-400",      bar: "bg-yellow-400" },
  confirmed: { label: "Confirmed", dot: "bg-blue-400",        bar: "bg-blue-400" },
  preparing: { label: "Preparing", dot: "bg-orange-400",      bar: "bg-orange-400" },
  ready:     { label: "Ready",     dot: "bg-chart-2",         bar: "bg-chart-2" },
  delivered: { label: "Delivered", dot: "bg-muted-foreground",bar: "bg-muted-foreground" },
  cancelled: { label: "Cancelled", dot: "bg-destructive",     bar: "bg-destructive" },
};

const STATUS_ORDER: StatusKey[] = ["pending", "confirmed", "preparing", "ready", "delivered", "cancelled"];

function SkeletonCard() {
  return (
    <div className="bg-card border border-card-border rounded-xl p-5 animate-pulse">
      <div className="h-10 w-10 bg-muted rounded-lg mb-4" />
      <div className="h-6 w-16 bg-muted rounded mb-1" />
      <div className="h-4 w-24 bg-muted rounded" />
    </div>
  );
}

export default function ManagerDashboard() {
  useRealtime();

  const { data, isLoading } = useGetManagerDashboard({
    query: { queryKey: getGetManagerDashboardQueryKey() },
  });

  const counts = data?.order_counts_by_status;
  const totalOrders = counts
    ? STATUS_ORDER.reduce((s, k) => s + (counts[k] ?? 0), 0)
    : 0;

  const activeCount = counts
    ? (counts.pending + counts.confirmed + counts.preparing + counts.ready)
    : 0;

  return (
    <DashboardLayout role="manager" roleLabel="Manager" roleColor="text-chart-4">
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground" data-testid="text-dashboard-title">
            Manager Dashboard
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Live overview of today's revenue, orders, and fulfillment.
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard
              title="Revenue Today"
              value={`₱${(data?.total_revenue_today ?? 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              icon={TrendingUp}
              colorClass="bg-chart-2/15 text-chart-2"
              testId="stat-revenue-today"
            />
            <StatCard
              title="Orders Today"
              value={data?.total_orders_today ?? 0}
              icon={ShoppingBag}
              colorClass="bg-chart-1/15 text-chart-1"
              testId="stat-orders-today"
            />
            <StatCard
              title="Staff on Duty"
              value={data?.staff_on_duty ?? 0}
              icon={Users}
              colorClass="bg-chart-3/15 text-chart-3"
              testId="stat-staff-on-duty"
            />
            <StatCard
              title="Avg Fulfillment"
              value={`${data?.avg_fulfillment_minutes ?? 0} min`}
              icon={Clock}
              description="Delivered orders today"
              colorClass="bg-chart-4/15 text-chart-4"
              testId="stat-avg-fulfillment"
            />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-card border border-card-border rounded-xl p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                <h2 className="font-semibold text-foreground text-sm">Orders by Status</h2>
              </div>
              {!isLoading && activeCount > 0 && (
                <span className="bg-chart-1/15 text-chart-1 text-xs font-semibold px-2 py-0.5 rounded-full">
                  {activeCount} active
                </span>
              )}
            </div>

            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="animate-pulse space-y-1.5">
                    <div className="flex justify-between">
                      <div className="h-3.5 w-20 bg-muted rounded" />
                      <div className="h-3.5 w-8 bg-muted rounded" />
                    </div>
                    <div className="h-2 w-full bg-muted rounded-full" />
                  </div>
                ))}
              </div>
            ) : totalOrders === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <ShoppingBag className="h-8 w-8 text-muted-foreground/20" />
                <p className="text-muted-foreground text-sm">No orders placed today yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {STATUS_ORDER.map((key) => {
                  const cfg = STATUS_CONFIG[key];
                  const n = counts?.[key] ?? 0;
                  const pct = totalOrders > 0 ? (n / totalOrders) * 100 : 0;
                  return (
                    <div key={key}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <Circle className={`h-2.5 w-2.5 fill-current ${cfg.dot.replace("bg-", "text-")}`} />
                          <span className="text-sm text-foreground font-medium">{cfg.label}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground">{pct.toFixed(0)}%</span>
                          <span className="text-sm font-bold text-foreground w-6 text-right">{n}</span>
                        </div>
                      </div>
                      <div className="w-full bg-muted/40 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-500 ${cfg.bar}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-card border border-card-border rounded-xl p-6">
            <div className="flex items-center gap-2 mb-5">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <h2 className="font-semibold text-foreground text-sm">Today's Summary</h2>
            </div>

            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex justify-between animate-pulse">
                    <div className="h-4 w-32 bg-muted rounded" />
                    <div className="h-4 w-16 bg-muted rounded" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-0 divide-y divide-border">
                {[
                  {
                    label: "Total Revenue",
                    value: `₱${(data?.total_revenue_today ?? 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                    highlight: true,
                  },
                  {
                    label: "Orders Placed",
                    value: data?.total_orders_today ?? 0,
                  },
                  {
                    label: "Orders Delivered",
                    value: counts?.delivered ?? 0,
                  },
                  {
                    label: "Orders Cancelled",
                    value: counts?.cancelled ?? 0,
                    warn: (counts?.cancelled ?? 0) > 0,
                  },
                  {
                    label: "Currently Active",
                    value: activeCount,
                    accent: activeCount > 0,
                  },
                  {
                    label: "Avg Fulfillment Time",
                    value: `${data?.avg_fulfillment_minutes ?? 0} min`,
                  },
                  {
                    label: "Staff on Duty",
                    value: data?.staff_on_duty ?? 0,
                  },
                ].map(({ label, value, highlight, warn, accent }) => (
                  <div key={label} className="flex items-center justify-between py-3">
                    <span className="text-sm text-muted-foreground">{label}</span>
                    <span
                      className={`text-sm font-semibold ${
                        highlight ? "text-chart-2 text-base" :
                        warn      ? "text-destructive" :
                        accent    ? "text-chart-1" :
                        "text-foreground"
                      }`}
                    >
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
