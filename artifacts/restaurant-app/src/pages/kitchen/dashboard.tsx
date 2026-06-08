import { ChefHat, CheckCircle2, Timer, Activity } from "lucide-react";
import {
  useGetKitchenDashboard,
  getGetKitchenDashboardQueryKey,
} from "@workspace/api-client-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { StatCard } from "@/components/stat-card";
import { ActivityFeed } from "@/components/activity-feed";

export default function KitchenDashboard() {
  const { data, isLoading } = useGetKitchenDashboard({
    query: { queryKey: getGetKitchenDashboardQueryKey() },
  });

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
              title="Orders in Queue"
              value={data?.orders_in_queue ?? 0}
              icon={ChefHat}
              colorClass="bg-chart-3/15 text-chart-3"
              testId="stat-orders-in-queue"
            />
            <StatCard
              title="Completed Today"
              value={data?.orders_completed_today ?? 0}
              icon={CheckCircle2}
              colorClass="bg-chart-2/15 text-chart-2"
              testId="stat-orders-completed"
            />
            <StatCard
              title="Avg Prep Time"
              value={`${data?.avg_prep_time_minutes ?? 0} min`}
              icon={Timer}
              description="Average preparation time"
              colorClass="bg-primary/15 text-primary"
              testId="stat-avg-prep-time"
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
