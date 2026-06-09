import { DollarSign, ShoppingBag, Users, AlertTriangle, Activity } from "lucide-react";
import {
  useGetManagerDashboard,
  getGetManagerDashboardQueryKey,
} from "@workspace/api-client-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { StatCard } from "@/components/stat-card";
import { ActivityFeed } from "@/components/activity-feed";
import { useRealtime } from "@/hooks/use-realtime";

export default function ManagerDashboard() {
  useRealtime();
  const { data, isLoading } = useGetManagerDashboard({
    query: { queryKey: getGetManagerDashboardQueryKey() },
  });

  return (
    <DashboardLayout role="manager" roleLabel="Manager" roleColor="text-chart-4">
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground" data-testid="text-dashboard-title">
            Manager Dashboard
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Today's revenue, orders, staff on duty, and pending issues.
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-card border border-card-border rounded-xl p-5 animate-pulse">
                <div className="h-10 w-10 bg-muted rounded-lg mb-4" />
                <div className="h-6 w-16 bg-muted rounded mb-1" />
                <div className="h-4 w-24 bg-muted rounded" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard
              title="Revenue Today"
              value={`$${(data?.total_revenue_today ?? 0).toLocaleString()}`}
              icon={DollarSign}
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
              title="Pending Issues"
              value={data?.pending_issues ?? 0}
              icon={AlertTriangle}
              colorClass="bg-destructive/15 text-destructive"
              testId="stat-pending-issues"
            />
          </div>
        )}

        <div className="bg-card border border-card-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-semibold text-foreground text-sm">Recent Activity</h2>
          </div>
          <ActivityFeed items={data?.recent_activity ?? []} />
        </div>
      </div>
    </DashboardLayout>
  );
}
