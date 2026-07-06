import { TrendingUp, ShoppingBag, Users, UserCheck, Activity } from "lucide-react";
import {
  useGetOwnerDashboard,
  getGetOwnerDashboardQueryKey,
} from "@workspace/api-client-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { StatCard } from "@/components/stat-card";
import { ActivityFeed } from "@/components/activity-feed";

export default function OwnerDashboard() {
  const { data, isLoading } = useGetOwnerDashboard({
    query: { queryKey: getGetOwnerDashboardQueryKey() },
  });

  return (
    <DashboardLayout role="owner" roleLabel="Owner" roleColor="text-chart-5">
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground" data-testid="text-dashboard-title">
            Owner Dashboard
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Monthly performance overview — revenue, orders, customers, and team.
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
              title="Revenue This Month"
              value={`₱${(data?.total_revenue_month ?? 0).toLocaleString()}`}
              icon={TrendingUp}
              colorClass="bg-chart-2/15 text-chart-2"
              testId="stat-revenue-month"
            />
            <StatCard
              title="Orders This Month"
              value={data?.total_orders_month ?? 0}
              icon={ShoppingBag}
              colorClass="bg-chart-1/15 text-chart-1"
              testId="stat-orders-month"
            />
            <StatCard
              title="Total Customers"
              value={data?.total_customers ?? 0}
              icon={Users}
              colorClass="bg-chart-3/15 text-chart-3"
              testId="stat-total-customers"
            />
            <StatCard
              title="Total Staff"
              value={data?.total_staff ?? 0}
              icon={UserCheck}
              colorClass="bg-chart-4/15 text-chart-4"
              testId="stat-total-staff"
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
