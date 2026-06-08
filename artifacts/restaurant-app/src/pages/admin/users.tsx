import { useState } from "react";
import {
  useListUsers,
  getListUsersQueryKey,
  useUpdateUser,
  User,
  UserRole,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Users, Search, Shield, UserCheck, UserX, ChevronDown, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";

const ALL_ROLES: UserRole[] = ["customer", "staff", "kitchen_staff", "manager", "owner", "admin"];

const ROLE_LABELS: Record<UserRole, string> = {
  customer: "Customer",
  staff: "Staff",
  kitchen_staff: "Kitchen",
  manager: "Manager",
  owner: "Owner",
  admin: "Admin",
};

const ROLE_COLORS: Record<UserRole, string> = {
  customer: "bg-chart-1/15 text-chart-1",
  staff: "bg-chart-2/15 text-chart-2",
  kitchen_staff: "bg-chart-3/15 text-chart-3",
  manager: "bg-chart-4/15 text-chart-4",
  owner: "bg-chart-5/15 text-chart-5",
  admin: "bg-primary/15 text-primary",
};

function RoleDropdown({
  user,
  currentUserRole,
  onRoleChange,
  isUpdating,
}: {
  user: User;
  currentUserRole: UserRole;
  onRoleChange: (userId: string, role: UserRole) => void;
  isUpdating: boolean;
}) {
  const [open, setOpen] = useState(false);
  const canAssignAdmin = currentUserRole === "admin";
  const available = ALL_ROLES.filter((r) => r !== "admin" || canAssignAdmin);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        disabled={isUpdating}
        data-testid={`role-dropdown-${user.id}`}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-opacity hover:opacity-80 ${ROLE_COLORS[user.role as UserRole]}`}
      >
        {isUpdating ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          ROLE_LABELS[user.role as UserRole]
        )}
        <ChevronDown className="h-3 w-3" />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
          />
          <div className="absolute left-0 top-full mt-1 w-36 bg-card border border-card-border rounded-lg shadow-md z-20 py-1 overflow-hidden">
            {available.map((role) => (
              <button
                key={role}
                onClick={() => {
                  onRoleChange(user.id, role);
                  setOpen(false);
                }}
                data-testid={`role-option-${role}`}
                className={`w-full text-left px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted ${
                  user.role === role ? "text-primary font-semibold" : "text-foreground"
                }`}
              >
                {ROLE_LABELS[role]}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function AdminUsersPage() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserRole | "all">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: users = [], isLoading } = useListUsers({
    query: { queryKey: getListUsersQueryKey() },
  });

  const updateMutation = useUpdateUser();

  function handleRoleChange(userId: string, role: UserRole) {
    if (updatingId) return;
    setUpdatingId(userId);
    updateMutation.mutate(
      { id: userId, data: { role } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
          toast({ title: "Role updated", description: `User role changed to ${ROLE_LABELS[role]}` });
        },
        onError: () => {
          toast({ title: "Failed to update role", variant: "destructive" });
        },
        onSettled: () => setUpdatingId(null),
      }
    );
  }

  function handleStatusToggle(user: User) {
    if (updatingId) return;
    setUpdatingId(user.id);
    const nextStatus = !user.is_active;
    updateMutation.mutate(
      { id: user.id, data: { is_active: nextStatus } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
          toast({
            title: nextStatus ? "Account reactivated" : "Account deactivated",
            description: `${user.full_name}'s account is now ${nextStatus ? "active" : "inactive"}.`,
          });
        },
        onError: () => {
          toast({ title: "Failed to update status", variant: "destructive" });
        },
        onSettled: () => setUpdatingId(null),
      }
    );
  }

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      u.full_name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q);
    const matchRole = roleFilter === "all" || u.role === roleFilter;
    const matchStatus =
      statusFilter === "all" ||
      (statusFilter === "active" ? u.is_active : !u.is_active);
    return matchSearch && matchRole && matchStatus;
  });

  const activeCount = users.filter((u) => u.is_active).length;
  const inactiveCount = users.length - activeCount;

  return (
    <DashboardLayout role="admin" roleLabel="Admin" roleColor="text-primary">
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground" data-testid="text-page-title">
            User Management
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            View, manage roles, and activate or deactivate user accounts.
          </p>
        </div>

        {/* Summary row */}
        <div className="flex gap-4 mb-6 flex-wrap">
          {[
            { label: "Total Users", value: users.length, icon: Users, color: "text-primary" },
            { label: "Active", value: activeCount, icon: UserCheck, color: "text-chart-2" },
            { label: "Inactive", value: inactiveCount, icon: UserX, color: "text-destructive" },
          ].map((s) => (
            <div
              key={s.label}
              className="flex items-center gap-3 bg-card border border-card-border rounded-lg px-4 py-3"
            >
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
              data-testid="input-search"
              className="w-full pl-9 pr-4 py-2 text-sm bg-card border border-card-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as UserRole | "all")}
            data-testid="select-role-filter"
            className="text-sm bg-card border border-card-border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="all">All Roles</option>
            {ALL_ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "all" | "active" | "inactive")}
            data-testid="select-status-filter"
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
                  {filtered.map((u) => (
                    <tr
                      key={u.id}
                      data-testid={`user-row-${u.id}`}
                      className={`hover:bg-muted/30 transition-colors ${!u.is_active ? "opacity-60" : ""}`}
                    >
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
                        <RoleDropdown
                          user={u}
                          currentUserRole={currentUser?.role as UserRole}
                          onRoleChange={handleRoleChange}
                          isUpdating={updatingId === u.id}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                            u.is_active
                              ? "bg-chart-2/15 text-chart-2"
                              : "bg-muted text-muted-foreground"
                          }`}
                          data-testid={`status-badge-${u.id}`}
                        >
                          {u.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(u.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {u.id !== currentUser?.id && (
                          <button
                            onClick={() => handleStatusToggle(u)}
                            disabled={updatingId === u.id}
                            data-testid={`button-toggle-status-${u.id}`}
                            className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-md transition-colors ${
                              u.is_active
                                ? "text-destructive hover:bg-destructive/10"
                                : "text-chart-2 hover:bg-chart-2/10"
                            }`}
                          >
                            {updatingId === u.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : u.is_active ? (
                              <>
                                <UserX className="h-3.5 w-3.5" />
                                Deactivate
                              </>
                            ) : (
                              <>
                                <UserCheck className="h-3.5 w-3.5" />
                                Reactivate
                              </>
                            )}
                          </button>
                        )}
                        {u.id === currentUser?.id && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
                            <Shield className="h-3 w-3" /> You
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <p className="text-xs text-muted-foreground mt-3">
          Showing {filtered.length} of {users.length} users
        </p>
      </div>
    </DashboardLayout>
  );
}
