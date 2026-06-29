import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { useToast } from "@/hooks/use-toast";
import { Settings, Loader2, Trash2, RefreshCw } from "lucide-react";

interface SystemStats {
  users: number;
  sessions: number;
  expired_sessions: number;
  menu_items: number;
  orders: number;
  order_items: number;
  reservations: number;
  refunds: number;
  feedback: number;
  audit_logs: number;
}

const STATS_KEY = ["admin", "maintenance", "stats"];

function StatCard({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div className="bg-card border border-card-border rounded-xl p-5">
      <p className="text-2xl font-bold text-foreground">{value.toLocaleString()}</p>
      <p className="text-sm font-medium text-muted-foreground mt-0.5">{label}</p>
      {sub && <p className="text-xs text-muted-foreground/60 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function AdminMaintenancePage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: stats, isLoading, refetch, isFetching } = useQuery({
    queryKey: STATS_KEY,
    queryFn: () => customFetch<SystemStats>("/api/admin/maintenance/stats"),
  });

  const clearSessionsMutation = useMutation({
    mutationFn: () => customFetch<{ deleted: number }>("/api/admin/maintenance/sessions", { method: "DELETE" }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: STATS_KEY });
      toast({ title: "Sessions cleared", description: `Removed ${data.deleted} expired session${data.deleted !== 1 ? "s" : ""}.` });
    },
    onError: () => toast({ title: "Failed to clear sessions", variant: "destructive" }),
  });

  const clearAuditMutation = useMutation({
    mutationFn: () => customFetch<{ deleted: number }>("/api/admin/maintenance/audit-logs", { method: "DELETE" }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: STATS_KEY });
      toast({ title: "Audit logs pruned", description: `Removed ${data.deleted} entries older than 90 days.` });
    },
    onError: () => toast({ title: "Failed to clear audit logs", variant: "destructive" }),
  });

  function confirmClearSessions() {
    if (window.confirm(`Clear ${stats?.expired_sessions ?? 0} expired sessions?`)) {
      clearSessionsMutation.mutate();
    }
  }

  function confirmClearAudit() {
    if (window.confirm("Delete all audit log entries older than 90 days? This cannot be undone.")) {
      clearAuditMutation.mutate();
    }
  }

  return (
    <DashboardLayout role="admin" roleLabel="Admin" roleColor="text-destructive">
      <div className="p-8">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2" data-testid="text-page-title">
              <Settings className="h-6 w-6" />
              System Maintenance
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Monitor database record counts and perform routine cleanup tasks.
            </p>
          </div>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-2 px-4 py-2 bg-muted text-muted-foreground hover:text-foreground text-sm rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : stats ? (
          <>
            <div className="mb-8">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Database Records</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                <StatCard label="Users" value={stats.users} />
                <StatCard label="Sessions" value={stats.sessions} sub={`${stats.expired_sessions} expired`} />
                <StatCard label="Menu Items" value={stats.menu_items} />
                <StatCard label="Orders" value={stats.orders} />
                <StatCard label="Order Items" value={stats.order_items} />
                <StatCard label="Reservations" value={stats.reservations} />
                <StatCard label="Refunds" value={stats.refunds} />
                <StatCard label="Feedback" value={stats.feedback} />
                <StatCard label="Audit Logs" value={stats.audit_logs} />
              </div>
            </div>

            <div>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Maintenance Actions</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="bg-card border border-card-border rounded-xl p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-foreground text-sm">Clear Expired Sessions</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Remove {stats.expired_sessions} expired session record{stats.expired_sessions !== 1 ? "s" : ""} from the database.
                        Active logins are not affected.
                      </p>
                    </div>
                    <button
                      onClick={confirmClearSessions}
                      disabled={clearSessionsMutation.isPending || stats.expired_sessions === 0}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-destructive/10 text-destructive hover:bg-destructive/20 text-xs rounded-lg font-medium disabled:opacity-40 transition-colors shrink-0"
                    >
                      {clearSessionsMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                      Clear
                    </button>
                  </div>
                </div>

                <div className="bg-card border border-card-border rounded-xl p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-foreground text-sm">Prune Old Audit Logs</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Permanently delete audit log entries older than 90 days.
                        Recent activity is preserved.
                      </p>
                    </div>
                    <button
                      onClick={confirmClearAudit}
                      disabled={clearAuditMutation.isPending}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-destructive/10 text-destructive hover:bg-destructive/20 text-xs rounded-lg font-medium disabled:opacity-40 transition-colors shrink-0"
                    >
                      {clearAuditMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                      Prune
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </DashboardLayout>
  );
}
