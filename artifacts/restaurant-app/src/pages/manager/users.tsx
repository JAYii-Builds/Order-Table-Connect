import { useState } from "react";
import { useListUsers, getListUsersQueryKey, useUpdateUser, type User } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Users, Search, UserCheck, UserX, Loader2, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";

const ROLE_LABELS: Record<string, string> = {
  customer: "Customer",
  staff: "Staff",
  kitchen_staff: "Kitchen",
  manager: "Manager",
  owner: "Owner",
  admin: "Admin",
};

const ROLE_COLORS: Record<string, string> = {
  customer: "bg-chart-1/15 text-chart-1",
  staff: "bg-chart-2/15 text-chart-2",
  kitchen_staff: "bg-chart-3/15 text-chart-3",
  manager: "bg-chart-4/15 text-chart-4",
  owner: "bg-chart-5/15 text-chart-5",
  admin: "bg-primary/15 text-primary",
};

// Manager may only view/deactivate staff and customers (not manager/owner/admin)
const MANAGEABLE_ROLES = ["customer", "staff", "kitchen_staff"];

export default function ManagerUsersPage() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: users = [], isLoading } = useListUsers({
    query: { queryKey: getListUsersQueryKey() },
  });

  const updateMutation = useUpdateUser();

  function handleStatusToggle(u: User) {
    if (updatingId) return;
    setUpdatingId(u.id);
    const next = !u.is_active;
    updateMutation.mutate(
      { id: u.id, data: { is_active: next } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
          toast({
            title: next ? "Account reactivated" : "Account deactivated",
            description: `${u.full_name}'s account is now ${next ? "active" : "inactive"}.`,
          });
        },
        onError: () => toast({ title: "Failed to update status", variant: "destructive" }),
        onSettled: () => setUpdatingId(null),
      }
    );
  }

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    const matchSearch = !q || u.full_name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    const matchRole = roleFilter === "all" || u.role === roleFilter;
    const matchStatus =
      statusFilter === "all" || (statusFilter === "active" ? u.is_active : !u.is_active);
    return matchSearch && matchRole && matchStatus;
  });

  const activeCount = users.filter((u) => u.is_active).length;

  return (
    <DashboardLayout role="manager" roleLabel="Manager" roleColor="text-chart-4">
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Users className="h-6 w-6" />
            User Management
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            View staff and customer accounts. Deactivate or reactivate accounts.
          </p>
        </div>

        {/* Summary */}
        <div className="flex gap-4 mb-6 flex-wrap">
          {[
            { label: "Total Users", value: users.length, icon: Users, color: "text-primary" },
            { label: "Active", value: activeCount, icon: UserCheck, color: "text-chart-2" },
            { label: "Inactive", value: users.length - activeCount, icon: UserX, color: "text-destructive" },
          ].map((s) => (
            <div key={s.label} className="flex items-center gap-3 bg-card border border-card-border rounded-lg px-4 py-3">
              <s.icon className={`h-4 w-4 ${s.color}`} />
              <div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
                <div className="text-lg font-bold text-foreground leading-none">{s.value}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex gap-3 mb-5 flex-wrap items-center">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="search"
              placeholder="Search by name or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-card border border-card-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="text-sm bg-card border border-card-border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="all">All Roles</option>
            {Object.keys(ROLE_LABELS).map((r) => (
              <option key={r} value={r}>{ROLE_LABELS[r]}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "all" | "active" | "inactive")}
            className="text-sm bg-card border border-card-border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        {/* Table */}
        <div className="bg-card border border-card-border rounded-xl overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-sm text-muted-foreground">
              No users match your filters
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Email</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Role</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Joined</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((u) => {
                    const canManage = MANAGEABLE_ROLES.includes(u.role) && u.id !== currentUser?.id;
                    return (
                      <tr key={u.id} className={`hover:bg-muted/30 transition-colors ${!u.is_active ? "opacity-60" : ""}`}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="h-7 w-7 rounded-full bg-primary/15 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                              {u.full_name[0]?.toUpperCase()}
                            </div>
                            <span className="font-medium text-foreground">{u.full_name}</span>
                            {u.id === currentUser?.id && (
                              <span className="text-xs text-muted-foreground">(you)</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[u.role] ?? "bg-muted text-muted-foreground"}`}>
                            {ROLE_LABELS[u.role] ?? u.role}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${u.is_active ? "bg-chart-2/15 text-chart-2" : "bg-muted text-muted-foreground"}`}>
                            {u.is_active ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {new Date(u.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {canManage ? (
                            <button
                              onClick={() => handleStatusToggle(u)}
                              disabled={updatingId === u.id}
                              className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-md transition-colors ${
                                u.is_active
                                  ? "text-destructive hover:bg-destructive/10"
                                  : "text-chart-2 hover:bg-chart-2/10"
                              }`}
                            >
                              {updatingId === u.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : u.is_active ? (
                                <><UserX className="h-3.5 w-3.5" />Deactivate</>
                              ) : (
                                <><UserCheck className="h-3.5 w-3.5" />Reactivate</>
                              )}
                            </button>
                          ) : (
                            <span className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
                              <Shield className="h-3 w-3" />
                              {u.id === currentUser?.id ? "You" : "Protected"}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <p className="text-xs text-muted-foreground mt-3">
          Showing {filtered.length} of {users.length} users · Managers can only deactivate/reactivate staff and customer accounts
        </p>
      </div>
    </DashboardLayout>
  );
}
