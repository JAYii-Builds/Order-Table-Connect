import { Users, ShieldCheck, Server, Activity } from "lucide-react";
import {
  useGetAdminDashboard,
  getGetAdminDashboardQueryKey,
} from "@workspace/api-client-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { StatCard } from "@/components/stat-card";
import { ActivityFeed } from "@/components/activity-feed";

export default function AdminDashboard() {
  const { data, isLoading } = useGetAdminDashboard({
    query: { queryKey: getGetAdminDashboardQueryKey() },
  });

  const statusColor =
    data?.system_status === "healthy"
      ? "bg-chart-2/15 text-chart-2"
      : "bg-destructive/15 text-destructive";

  return (
    <DashboardLayout role="admin" roleLabel="Admin" roleColor="text-primary">
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground" data-testid="text-dashboard-title">
            Admin Dashboard
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            System overview — users, active sessions, and platform health.
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
              title="Total Users"
              value={data?.total_users ?? 0}
              icon={Users}
              colorClass="bg-primary/15 text-primary"
              testId="stat-total-users"
            />
            <StatCard
              title="Active Sessions"
              value={data?.active_sessions ?? 0}
              icon={ShieldCheck}
              colorClass="bg-chart-3/15 text-chart-3"
              testId="stat-active-sessions"
            />
            <StatCard
              title="System Status"
              value={data?.system_status ?? "unknown"}
              icon={Server}
              colorClass={statusColor}
              description="Static indicator — check logs for real health"
              testId="stat-system-status"
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
