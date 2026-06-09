import { Table2, ShoppingBag, CalendarDays, Activity } from "lucide-react";
import {
  useGetStaffDashboard,
  getGetStaffDashboardQueryKey,
} from "@workspace/api-client-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { StatCard } from "@/components/stat-card";
import { ActivityFeed } from "@/components/activity-feed";
import { useRealtime } from "@/hooks/use-realtime";

export default function StaffDashboard() {
  useRealtime();
  const { data, isLoading } = useGetStaffDashboard({
    query: { queryKey: getGetStaffDashboardQueryKey() },
  });

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

        {isLoading ? (
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
              title="Pending Orders"
              value={data?.pending_orders ?? 0}
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
