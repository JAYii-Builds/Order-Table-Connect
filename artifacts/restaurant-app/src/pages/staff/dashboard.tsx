import {
  Table2,
  ShoppingBag,
  CalendarDays,
  ClipboardList,
  ChevronRight,
  Loader2,
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  UserPlus,
  Phone,
  AlertCircle,
} from "lucide-react";
import { parseWalkinInfo } from "@/lib/walkin-utils";
import {
  useGetStaffDashboard,
  getGetStaffDashboardQueryKey,
  useListOrders,
  getListOrdersQueryKey,
  useUpdateOrderStatus,
  useListReservations,
  getListReservationsQueryKey,
  useUpdateReservation,
  customFetch,
  type Order,
  type Reservation,
} from "@workspace/api-client-react";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import { StatCard } from "@/components/stat-card";
import { useRealtime } from "@/hooks/use-realtime";
import { useToast } from "@/hooks/use-toast";

// ─── Order queue types & config ──────────────────────────────────────────────

type OrderStatus = "pending" | "confirmed" | "preparing" | "ready" | "delivered" | "cancelled";

const ORDER_STATUS_STYLES: Record<string, string> = {
  pending:   "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
  confirmed: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  preparing: "bg-orange-500/15 text-orange-400 border-orange-500/20",
  ready:     "bg-chart-2/15 text-chart-2 border-chart-2/20",
  delivered: "bg-muted/60 text-muted-foreground border-border",
  cancelled: "bg-destructive/15 text-destructive border-destructive/20",
};

const ORDER_STATUS_LABELS: Record<string, string> = {
  pending:   "Pending",
  confirmed: "Confirmed",
  preparing: "Preparing",
  ready:     "Ready",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const ORDER_NEXT: Partial<Record<OrderStatus, { status: OrderStatus; label: string; color: string }>> = {
  pending:   { status: "confirmed", label: "Confirm",      color: "bg-blue-600 hover:bg-blue-500 text-white" },
  confirmed: { status: "preparing", label: "Start Prep",   color: "bg-orange-600 hover:bg-orange-500 text-white" },
  preparing: { status: "ready",     label: "Mark Ready",   color: "bg-chart-2 hover:opacity-90 text-white" },
  ready:     { status: "delivered", label: "Delivered",    color: "bg-muted hover:bg-muted/70 text-foreground" },
};

const ACTIVE_ORDER_STATUSES: OrderStatus[] = ["pending", "confirmed", "preparing", "ready"];

// ─── Reservation types & config ───────────────────────────────────────────────

type ReservationStatus = "pending" | "confirmed" | "seated" | "completed" | "cancelled";

const RES_STATUS_STYLES: Record<string, string> = {
  pending:   "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
  confirmed: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  seated:    "bg-chart-3/15 text-chart-3 border-chart-3/20",
  completed: "bg-muted/60 text-muted-foreground border-border",
  cancelled: "bg-destructive/15 text-destructive border-destructive/20",
};

const RES_STATUS_LABELS: Record<string, string> = {
  pending:   "Pending",
  confirmed: "Confirmed",
  seated:    "Seated",
  completed: "Completed",
  cancelled: "Cancelled",
};

interface ResAction {
  status: ReservationStatus;
  label: string;
  color: string;
}

const RES_NEXT: Partial<Record<ReservationStatus, ResAction[]>> = {
  pending:   [
    { status: "confirmed", label: "Confirm",  color: "bg-blue-600 hover:bg-blue-500 text-white" },
    { status: "cancelled", label: "Cancel",   color: "bg-destructive/80 hover:bg-destructive text-white" },
  ],
  confirmed: [
    { status: "seated",    label: "Seat Table",  color: "bg-chart-3 hover:opacity-90 text-white" },
    { status: "cancelled", label: "Cancel",      color: "bg-destructive/80 hover:bg-destructive text-white" },
  ],
  seated:    [
    { status: "completed", label: "Complete",    color: "bg-muted hover:bg-muted/70 text-foreground" },
  ],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

function todayDateStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatTime(t: string): string {
  const [h, m] = t.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  return `${hour % 12 || 12}:${m} ${ampm}`;
}

// ─── Order card ───────────────────────────────────────────────────────────────

function OrderCard({ order }: { order: Order }) {
  const queryClient = useQueryClient();
  const mutation = useUpdateOrderStatus();
  const next = ORDER_NEXT[order.status as OrderStatus];

  function advance() {
    if (!next) return;
    mutation.mutate(
      { id: order.id, data: { status: next.status } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetStaffDashboardQueryKey() });
        },
      }
    );
  }

  const walkin = parseWalkinInfo(order.notes);

  return (
    <div className="bg-background border border-border rounded-xl p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-mono text-xs text-muted-foreground">#{order.id.slice(0, 8).toUpperCase()}</p>
          <p className="font-semibold text-foreground text-sm mt-0.5">₱{order.total_amount.toFixed(2)}</p>
          {walkin && (
            <div className="flex items-center gap-1.5 mt-1">
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-chart-3/15 text-chart-3 border border-chart-3/20">
                <UserPlus className="h-2.5 w-2.5" />
                Walk-in
              </span>
              <span className="text-xs text-muted-foreground">T{walkin.table} · {walkin.guests} {walkin.guests === 1 ? "guest" : "guests"}</span>
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${ORDER_STATUS_STYLES[order.status] ?? ""}`}>
            {ORDER_STATUS_LABELS[order.status] ?? order.status}
          </span>
          <span className="text-xs text-muted-foreground">{timeAgo(order.created_at)}</span>
        </div>
      </div>

      <div className="space-y-1">
        {order.items.map((item) => (
          <div key={item.id} className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{item.menu_item_name} <span className="text-muted-foreground/60">× {item.quantity}</span></span>
            <span>₱{item.subtotal.toFixed(2)}</span>
          </div>
        ))}
        {order.notes && (
          <p className="text-xs text-muted-foreground italic mt-1 pt-1 border-t border-border">"{order.notes}"</p>
        )}
      </div>

      {next && (
        <button
          onClick={advance}
          disabled={mutation.isPending}
          className={`w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all disabled:opacity-50 ${next.color}`}
        >
          {mutation.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <>{next.label}<ChevronRight className="h-3.5 w-3.5" /></>
          )}
        </button>
      )}
    </div>
  );
}

// ─── Reservation card ─────────────────────────────────────────────────────────

function ReservationCard({ reservation }: { reservation: Reservation }) {
  const queryClient = useQueryClient();
  const mutation = useUpdateReservation();
  const actions = RES_NEXT[reservation.status as ReservationStatus] ?? [];
  const [pending, setPending] = React.useState<ReservationStatus | null>(null);

  function update(status: ReservationStatus) {
    setPending(status);
    mutation.mutate(
      { id: reservation.id, data: { status } },
      {
        onSettled: () => setPending(null),
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListReservationsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetStaffDashboardQueryKey() });
        },
      }
    );
  }

  const isTerminal = reservation.status === "completed" || reservation.status === "cancelled";

  return (
    <div className={`bg-background border rounded-xl p-4 flex flex-col gap-3 ${isTerminal ? "border-border opacity-60" : "border-border"}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-mono text-xs text-muted-foreground">#{reservation.id.slice(0, 8).toUpperCase()}</p>
          <p className="font-semibold text-foreground text-sm mt-0.5">{formatTime(reservation.reservation_time)}</p>
        </div>
        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${RES_STATUS_STYLES[reservation.status] ?? ""}`}>
          {RES_STATUS_LABELS[reservation.status] ?? reservation.status}
        </span>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Users className="h-3.5 w-3.5 shrink-0" />
          <span>{reservation.guest_count} {reservation.guest_count === 1 ? "guest" : "guests"}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5 shrink-0" />
          <span>{formatTime(reservation.reservation_time)} · {reservation.reservation_date}</span>
        </div>
        {reservation.notes && (
          <p className="text-xs text-muted-foreground italic">"{reservation.notes}"</p>
        )}
      </div>

      {actions.length > 0 && (
        <div className={`grid gap-2 ${actions.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
          {actions.map((action) => (
            <button
              key={action.status}
              onClick={() => update(action.status)}
              disabled={mutation.isPending}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all disabled:opacity-50 ${action.color}`}
            >
              {pending === action.status ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : action.status === "cancelled" ? (
                <><XCircle className="h-3.5 w-3.5" />{action.label}</>
              ) : action.status === "completed" ? (
                <><CheckCircle2 className="h-3.5 w-3.5" />{action.label}</>
              ) : (
                <>{action.label}<ChevronRight className="h-3.5 w-3.5" /></>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Table Reservation types ──────────────────────────────────────────────────

import React from "react";

interface TableReservation {
  id: string;
  customer_name: string;
  contact_info: string;
  party_size: number;
  reservation_date: string;
  reservation_time: string;
  table_id: string | null;
  status: "pending" | "confirmed" | "seated" | "cancelled" | "no_show";
  notes: string | null;
  created_at: string;
}

const TR_STATUS_STYLES: Record<string, string> = {
  pending:   "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
  confirmed: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  seated:    "bg-chart-3/15 text-chart-3 border-chart-3/20",
  cancelled: "bg-destructive/15 text-destructive border-destructive/20",
  no_show:   "bg-muted/60 text-muted-foreground border-border",
};

const TR_STATUS_LABELS: Record<string, string> = {
  pending:   "Pending",
  confirmed: "Confirmed",
  seated:    "Seated",
  cancelled: "Cancelled",
  no_show:   "No Show",
};

type TRStatus = TableReservation["status"];

const TR_NEXT: Partial<Record<TRStatus, { status: TRStatus; label: string; color: string }[]>> = {
  pending:   [
    { status: "confirmed", label: "Confirm",  color: "bg-blue-600 hover:bg-blue-500 text-white" },
    { status: "cancelled", label: "Cancel",   color: "bg-destructive/80 hover:bg-destructive text-white" },
  ],
  confirmed: [
    { status: "seated",    label: "Seat",     color: "bg-chart-3 hover:opacity-90 text-white" },
    { status: "no_show",   label: "No Show",  color: "bg-muted hover:bg-muted/70 text-foreground" },
  ],
};

const TABLE_RES_TODAY_KEY = (today: string) => ["table-reservations", today];

function TableReservationCard({ reservation, onMutate }: { reservation: TableReservation; onMutate: () => void }) {
  const { toast } = useToast();
  const [pendingStatus, setPendingStatus] = React.useState<TRStatus | null>(null);
  const actions = TR_NEXT[reservation.status] ?? [];

  const mutation = useMutation({
    mutationFn: (data: Partial<TableReservation>) =>
      customFetch<TableReservation>(`/api/table-reservations/${reservation.id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    onSuccess: () => { setPendingStatus(null); onMutate(); },
    onError: (err: unknown) => {
      setPendingStatus(null);
      toast({ title: "Update failed", description: err instanceof Error ? err.message : "Error", variant: "destructive" });
    },
  });

  const isTerminal = reservation.status === "cancelled" || reservation.status === "no_show";

  return (
    <div className={`bg-background border rounded-xl p-4 flex flex-col gap-3 ${isTerminal ? "border-border opacity-60" : "border-border"}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-mono text-xs text-muted-foreground">#{reservation.id.slice(0, 8).toUpperCase()}</p>
          <p className="font-semibold text-foreground text-sm mt-0.5">{reservation.customer_name}</p>
        </div>
        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${TR_STATUS_STYLES[reservation.status] ?? ""}`}>
          {TR_STATUS_LABELS[reservation.status] ?? reservation.status}
        </span>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Phone className="h-3.5 w-3.5 shrink-0" />
          <span>{reservation.contact_info}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Users className="h-3.5 w-3.5 shrink-0" />
          <span>{reservation.party_size} {reservation.party_size === 1 ? "guest" : "guests"}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5 shrink-0" />
          <span>{formatTime(reservation.reservation_time)}</span>
          {reservation.table_id && (
            <span className="ml-1 flex items-center gap-1">
              <Table2 className="h-3 w-3" />
              Table {reservation.table_id}
            </span>
          )}
        </div>
        {reservation.notes && (
          <p className="text-xs text-muted-foreground italic">"{reservation.notes}"</p>
        )}
      </div>

      {actions.length > 0 && (
        <div className={`grid gap-2 ${actions.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
          {actions.map((action) => (
            <button
              key={action.status}
              onClick={() => { setPendingStatus(action.status); mutation.mutate({ status: action.status }); }}
              disabled={mutation.isPending}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all disabled:opacity-50 ${action.color}`}
            >
              {pendingStatus === action.status ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : action.status === "cancelled" ? (
                <><XCircle className="h-3.5 w-3.5" />{action.label}</>
              ) : action.status === "no_show" ? (
                <><AlertCircle className="h-3.5 w-3.5" />{action.label}</>
              ) : (
                <>{action.label}<ChevronRight className="h-3.5 w-3.5" /></>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function StaffDashboard() {
  useRealtime();
  const queryClient = useQueryClient();

  const { data, isLoading: statsLoading } = useGetStaffDashboard({
    query: { queryKey: getGetStaffDashboardQueryKey() },
  });

  const { data: orders = [], isLoading: ordersLoading } = useListOrders({
    query: { queryKey: getListOrdersQueryKey() },
  });

  const { data: reservations = [], isLoading: reservationsLoading } = useListReservations({
    query: { queryKey: getListReservationsQueryKey() },
  });

  const today = todayDateStr();

  const { data: tableReservations = [], isLoading: trLoading } = useQuery({
    queryKey: TABLE_RES_TODAY_KEY(today),
    queryFn: () => customFetch<TableReservation[]>(`/api/table-reservations?date=${today}`),
  });

  function invalidateTableReservations() {
    queryClient.invalidateQueries({ queryKey: TABLE_RES_TODAY_KEY(today) });
  }

  const activeOrders = orders
    .filter((o) => ACTIVE_ORDER_STATUSES.includes(o.status as OrderStatus))
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  const readyOrders = activeOrders.filter((o) => o.status === "ready");
  const activeWalkinCount = activeOrders.filter((o) => parseWalkinInfo(o.notes) !== null).length;
  const activeRegularCount = activeOrders.length - activeWalkinCount;

  const todaysReservations = reservations
    .filter((r) => r.reservation_date === today)
    .sort((a, b) => a.reservation_time.localeCompare(b.reservation_time));

  const activeReservations = todaysReservations.filter(
    (r) => r.status !== "completed" && r.status !== "cancelled"
  );

  const activeTRs = tableReservations
    .filter((r) => r.status !== "cancelled" && r.status !== "no_show")
    .sort((a, b) => a.reservation_time.localeCompare(b.reservation_time));
  const terminalTRs = tableReservations.filter(
    (r) => r.status === "cancelled" || r.status === "no_show"
  );
  const pendingTRCount = tableReservations.filter((r) => r.status === "pending").length;

  return (
    <DashboardLayout role="staff" roleLabel="Staff" roleColor="text-chart-2">
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground" data-testid="text-dashboard-title">
            Staff Dashboard
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage orders, reservations, and tables.
          </p>
        </div>

        {/* Stat cards */}
        {statsLoading ? (
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
              title="Active Orders"
              value={activeOrders.length}
              icon={ShoppingBag}
              colorClass="bg-chart-1/15 text-chart-1"
              testId="stat-pending-orders"
              badge={activeWalkinCount > 0 ? `${activeWalkinCount} walk-in` : undefined}
              badgeClass="bg-chart-3/15 text-chart-3"
              description={
                activeOrders.length === 0
                  ? "No active orders"
                  : activeWalkinCount > 0
                  ? `${activeWalkinCount} walk-in · ${activeRegularCount} regular`
                  : `${activeRegularCount} regular`
              }
            />
            <StatCard
              title="Today's Reservations"
              value={todaysReservations.length}
              icon={CalendarDays}
              colorClass="bg-chart-3/15 text-chart-3"
              testId="stat-todays-reservations"
            />
            <StatCard
              title="Active Tables"
              value={data?.active_tables ?? 0}
              icon={Table2}
              colorClass="bg-chart-2/15 text-chart-2"
              testId="stat-active-tables"
            />
          </div>
        )}

        {/* Ready-to-serve alert */}
        {readyOrders.length > 0 && (
          <div className="mb-6 p-4 rounded-xl border bg-chart-2/10 border-chart-2/30 flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-chart-2 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-chart-2 text-sm">
                {readyOrders.length} {readyOrders.length === 1 ? "order is" : "orders are"} ready to serve
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {readyOrders.map((o) => {
                  const wi = parseWalkinInfo(o.notes);
                  return wi ? `Table ${wi.table}` : `#${o.id.slice(0, 6).toUpperCase()}`;
                }).join(" · ")}
              </p>
            </div>
          </div>
        )}

        {/* Order queue */}
        <div className="bg-card border border-card-border rounded-xl p-6 mb-6">
          <div className="flex items-center gap-2 mb-5">
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-semibold text-foreground text-sm">Order Queue</h2>
            {activeOrders.length > 0 && (
              <span className="ml-auto bg-chart-1/15 text-chart-1 text-xs font-semibold px-2 py-0.5 rounded-full">
                {activeOrders.length} active
              </span>
            )}
          </div>

          {ordersLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-background border border-border rounded-xl p-4 animate-pulse space-y-3">
                  <div className="flex justify-between">
                    <div className="space-y-1.5">
                      <div className="h-3 w-20 bg-muted rounded" />
                      <div className="h-4 w-14 bg-muted rounded" />
                    </div>
                    <div className="h-5 w-20 bg-muted rounded-full" />
                  </div>
                  <div className="h-3 w-full bg-muted rounded" />
                  <div className="h-8 w-full bg-muted rounded-lg" />
                </div>
              ))}
            </div>
          ) : activeOrders.length === 0 ? (
            <div className="text-center py-10">
              <ShoppingBag className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">No active orders right now.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {activeOrders.map((order) => (
                <OrderCard key={order.id} order={order} />
              ))}
            </div>
          )}
        </div>

        {/* Reservations */}
        <div className="bg-card border border-card-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-semibold text-foreground text-sm">Today's Reservations</h2>
            {activeReservations.length > 0 && (
              <span className="ml-auto bg-chart-3/15 text-chart-3 text-xs font-semibold px-2 py-0.5 rounded-full">
                {activeReservations.length} active
              </span>
            )}
          </div>

          {reservationsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-background border border-border rounded-xl p-4 animate-pulse space-y-3">
                  <div className="flex justify-between">
                    <div className="space-y-1.5">
                      <div className="h-3 w-20 bg-muted rounded" />
                      <div className="h-4 w-16 bg-muted rounded" />
                    </div>
                    <div className="h-5 w-20 bg-muted rounded-full" />
                  </div>
                  <div className="space-y-1.5">
                    <div className="h-3 w-24 bg-muted rounded" />
                    <div className="h-3 w-32 bg-muted rounded" />
                  </div>
                  <div className="h-8 w-full bg-muted rounded-lg" />
                </div>
              ))}
            </div>
          ) : todaysReservations.length === 0 ? (
            <div className="text-center py-10">
              <CalendarDays className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">No reservations for today.</p>
            </div>
          ) : (
            <>
              {/* Active reservations */}
              {activeReservations.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
                  {activeReservations.map((r) => (
                    <ReservationCard key={r.id} reservation={r} />
                  ))}
                </div>
              )}

              {/* Completed / cancelled (collapsed) */}
              {todaysReservations.length > activeReservations.length && (
                <details className="group">
                  <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground transition-colors py-1 list-none flex items-center gap-1.5">
                    <ChevronRight className="h-3.5 w-3.5 group-open:rotate-90 transition-transform" />
                    {todaysReservations.length - activeReservations.length} completed / cancelled
                  </summary>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-3">
                    {todaysReservations
                      .filter((r) => r.status === "completed" || r.status === "cancelled")
                      .map((r) => (
                        <ReservationCard key={r.id} reservation={r} />
                      ))}
                  </div>
                </details>
              )}
            </>
          )}
        </div>

        {/* Table Reservations (guest bookings) */}
        <div className="bg-card border border-card-border rounded-xl p-6 mt-6">
          <div className="flex items-center gap-2 mb-5">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-semibold text-foreground text-sm">Today's Table Bookings</h2>
            <span className="text-xs text-muted-foreground">(guest reservations)</span>
            {pendingTRCount > 0 && (
              <span className="ml-auto bg-yellow-500/15 text-yellow-400 text-xs font-semibold px-2 py-0.5 rounded-full">
                {pendingTRCount} pending
              </span>
            )}
          </div>

          {trLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[1, 2].map((i) => (
                <div key={i} className="bg-background border border-border rounded-xl p-4 animate-pulse space-y-3">
                  <div className="h-4 w-28 bg-muted rounded" />
                  <div className="h-3 w-20 bg-muted rounded" />
                  <div className="h-8 w-full bg-muted rounded-lg" />
                </div>
              ))}
            </div>
          ) : tableReservations.length === 0 ? (
            <div className="text-center py-8">
              <CalendarDays className="h-8 w-8 text-muted-foreground/20 mx-auto mb-2" />
              <p className="text-muted-foreground text-sm">No guest bookings for today.</p>
            </div>
          ) : (
            <>
              {activeTRs.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-3">
                  {activeTRs.map((r) => (
                    <TableReservationCard key={r.id} reservation={r} onMutate={invalidateTableReservations} />
                  ))}
                </div>
              )}
              {terminalTRs.length > 0 && (
                <details className="group">
                  <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground transition-colors py-1 list-none flex items-center gap-1.5">
                    <ChevronRight className="h-3.5 w-3.5 group-open:rotate-90 transition-transform" />
                    {terminalTRs.length} cancelled / no-show
                  </summary>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-3">
                    {terminalTRs.map((r) => (
                      <TableReservationCard key={r.id} reservation={r} onMutate={invalidateTableReservations} />
                    ))}
                  </div>
                </details>
              )}
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
