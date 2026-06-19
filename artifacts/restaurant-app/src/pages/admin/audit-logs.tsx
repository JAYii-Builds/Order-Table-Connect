import { useQuery } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { ClipboardList, Loader2, Search } from "lucide-react";
import { useState } from "react";

interface AuditLog {
  id: string;
  actor_id: string | null;
  actor_name: string;
  action: string;
  details: string;
  created_at: string;
}

const ACTION_COLORS: Record<string, string> = {
  "user.created":       "text-chart-2",
  "user.deleted":       "text-destructive",
  "user.deactivated":   "text-destructive",
  "user.reactivated":   "text-chart-2",
  "user.role_changed":  "text-chart-4",
  "menu.created":       "text-chart-2",
  "menu.updated":       "text-chart-1",
  "menu.deleted":       "text-destructive",
  "refund.approved":    "text-chart-2",
  "refund.rejected":    "text-destructive",
  "refund.escalated":   "text-chart-4",
};

export default function AdminAuditLogsPage() {
  const [search, setSearch] = useState("");

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["audit-logs"],
    queryFn: () => customFetch<AuditLog[]>("/api/audit-logs"),
    refetchInterval: 30_000,
  });

  const filtered = logs.filter((l) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      l.action.toLowerCase().includes(q) ||
      l.actor_name.toLowerCase().includes(q) ||
      l.details.toLowerCase().includes(q)
    );
  });

  return (
    <DashboardLayout role="admin" roleLabel="Admin" roleColor="text-primary">
      <div className="p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <ClipboardList className="h-6 w-6" />
            Audit Trail
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Latest 200 administrative actions across all roles.
          </p>
        </div>

        <div className="relative max-w-sm mb-5">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="search"
            placeholder="Filter by action, actor, or details…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-card border border-card-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 bg-card border border-card-border rounded-xl text-muted-foreground text-sm">
            No audit log entries{search ? " match your filter" : " yet"}.
          </div>
        ) : (
          <div className="bg-card border border-card-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Time</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Action</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Actor</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((log) => (
                    <tr key={log.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`font-mono text-xs font-medium ${ACTION_COLORS[log.action] ?? "text-foreground"}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-foreground">{log.actor_name}</td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">{log.details}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {filtered.length > 0 && (
          <p className="text-xs text-muted-foreground mt-3">
            Showing {filtered.length} of {logs.length} entries
          </p>
        )}
      </div>
    </DashboardLayout>
  );
}
