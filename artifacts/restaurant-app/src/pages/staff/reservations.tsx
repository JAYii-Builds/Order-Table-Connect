import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { useToast } from "@/hooks/use-toast";
import { useRealtime } from "@/hooks/use-realtime";
import {
  CalendarDays,
  Users,
  Clock,
  Phone,
  ChevronRight,
  XCircle,
  CheckCircle2,
  Loader2,
  Table2,
  Search,
  AlertCircle,
} from "lucide-react";

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
  updated_at: string;
}

const STATUS_STYLES: Record<string, string> = {
  pending:   "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
  confirmed: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  seated:    "bg-chart-3/15 text-chart-3 border-chart-3/20",
  cancelled: "bg-destructive/15 text-destructive border-destructive/20",
  no_show:   "bg-muted/60 text-muted-foreground border-border",
};

const STATUS_LABELS: Record<string, string> = {
  pending:   "Pending",
  confirmed: "Confirmed",
  seated:    "Seated",
  cancelled: "Cancelled",
  no_show:   "No Show",
};

type ResStatus = TableReservation["status"];

const STATUS_TRANSITIONS: Partial<Record<ResStatus, { status: ResStatus; label: string; color: string }[]>> = {
  pending:   [
    { status: "confirmed", label: "Confirm",  color: "bg-blue-600 hover:bg-blue-500 text-white" },
    { status: "cancelled", label: "Cancel",   color: "bg-destructive/80 hover:bg-destructive text-white" },
  ],
  confirmed: [
    { status: "seated",    label: "Seat",     color: "bg-chart-3 hover:opacity-90 text-white" },
    { status: "no_show",   label: "No Show",  color: "bg-muted hover:bg-muted/70 text-foreground" },
    { status: "cancelled", label: "Cancel",   color: "bg-destructive/80 hover:bg-destructive text-white" },
  ],
  seated:    [
    { status: "cancelled", label: "Cancel",   color: "bg-destructive/80 hover:bg-destructive text-white" },
  ],
};

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatTime(t: string): string {
  const [h, m] = t.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  return `${hour % 12 || 12}:${m} ${ampm}`;
}

const TABLE_RESERVATION_KEY = (date?: string) => ["table-reservations", date ?? "all"];

function fetchReservations(date?: string): Promise<TableReservation[]> {
  const qs = date ? `?date=${date}` : "";
  return customFetch<TableReservation[]>(`/api/table-reservations${qs}`);
}

function patchReservation(id: string, data: Partial<TableReservation>): Promise<TableReservation> {
  return customFetch<TableReservation>(`/api/table-reservations/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

function ReservationCard({ reservation, onMutate }: { reservation: TableReservation; onMutate: () => void }) {
  const { toast } = useToast();
  const [tableInput, setTableInput] = useState(reservation.table_id ?? "");
  const [pending, setPending] = useState<ResStatus | null>(null);

  const mutation = useMutation({
    mutationFn: (data: Partial<TableReservation>) => patchReservation(reservation.id, data),
    onSuccess: () => {
      onMutate();
      setPending(null);
    },
    onError: (err: unknown) => {
      setPending(null);
      toast({
        title: "Update failed",
        description: err instanceof Error ? err.message : "Could not update reservation.",
        variant: "destructive",
      });
    },
  });

  const transitions = STATUS_TRANSITIONS[reservation.status] ?? [];
  const isTerminal = reservation.status === "cancelled" || reservation.status === "no_show";

  function changeStatus(status: ResStatus) {
    setPending(status);
    mutation.mutate({ status });
  }

  function saveTable() {
    mutation.mutate({ table_id: tableInput.trim() || null });
  }

  return (
    <div className={`bg-background border rounded-xl p-4 flex flex-col gap-3 ${isTerminal ? "opacity-60 border-border" : "border-border"}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-mono text-xs text-muted-foreground">#{reservation.id.slice(0, 8).toUpperCase()}</p>
          <p className="font-semibold text-foreground mt-0.5">{reservation.customer_name}</p>
        </div>
        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${STATUS_STYLES[reservation.status] ?? ""}`}>
          {STATUS_LABELS[reservation.status] ?? reservation.status}
        </span>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Phone className="h-3.5 w-3.5 shrink-0" />
          <span>{reservation.contact_info}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <CalendarDays className="h-3.5 w-3.5 shrink-0" />
          <span>{reservation.reservation_date} · {formatTime(reservation.reservation_time)}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Users className="h-3.5 w-3.5 shrink-0" />
          <span>{reservation.party_size} {reservation.party_size === 1 ? "guest" : "guests"}</span>
        </div>
        {reservation.notes && (
          <p className="text-xs text-muted-foreground italic">"{reservation.notes}"</p>
        )}
      </div>

      {/* Table assignment */}
      {!isTerminal && (
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Table2 className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              value={tableInput}
              onChange={(e) => setTableInput(e.target.value)}
              placeholder="Table #"
              className="w-full text-xs bg-background border border-input rounded-lg pl-8 pr-3 py-2 focus:outline-none focus:ring-1 focus:ring-ring text-foreground placeholder:text-muted-foreground"
            />
          </div>
          <button
            onClick={saveTable}
            disabled={mutation.isPending}
            className="px-3 py-2 bg-muted hover:bg-muted/70 text-foreground text-xs rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            {mutation.isPending && !pending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Assign"}
          </button>
        </div>
      )}

      {/* Status buttons */}
      {transitions.length > 0 && (
        <div className={`grid gap-2 ${transitions.length >= 3 ? "grid-cols-3" : transitions.length === 2 ? "grid-cols-2" : "grid-cols-1"}`}>
          {transitions.map((t) => (
            <button
              key={t.status}
              onClick={() => changeStatus(t.status)}
              disabled={mutation.isPending}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all disabled:opacity-50 ${t.color}`}
            >
              {pending === t.status ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : t.status === "cancelled" ? (
                <><XCircle className="h-3.5 w-3.5" />{t.label}</>
              ) : t.status === "no_show" ? (
                <><AlertCircle className="h-3.5 w-3.5" />{t.label}</>
              ) : t.status === "seated" ? (
                <><Table2 className="h-3.5 w-3.5" />{t.label}</>
              ) : (
                <>{t.label}<ChevronRight className="h-3.5 w-3.5" /></>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function StaffReservationsPage() {
  useRealtime();
  const [dateFilter, setDateFilter] = useState(todayStr());
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();

  const { data: reservations = [], isLoading } = useQuery({
    queryKey: TABLE_RESERVATION_KEY(dateFilter || undefined),
    queryFn: () => fetchReservations(dateFilter || undefined),
  });

  function onMutate() {
    queryClient.invalidateQueries({ queryKey: TABLE_RESERVATION_KEY(dateFilter || undefined) });
    queryClient.invalidateQueries({ queryKey: TABLE_RESERVATION_KEY() });
  }

  const filtered = reservations.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      r.customer_name.toLowerCase().includes(q) ||
      r.contact_info.toLowerCase().includes(q) ||
      r.id.toLowerCase().includes(q)
    );
  });

  const active = filtered.filter((r) => r.status !== "cancelled" && r.status !== "no_show");
  const terminal = filtered.filter((r) => r.status === "cancelled" || r.status === "no_show");

  const pendingCount = filtered.filter((r) => r.status === "pending").length;

  return (
    <DashboardLayout role="staff" roleLabel="Staff" roleColor="text-chart-2">
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <CalendarDays className="h-6 w-6" />
            Reservation Handling
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage incoming table reservations, confirm, assign tables, and track seating.
          </p>
        </div>

        {/* Pending alert */}
        {pendingCount > 0 && (
          <div className="mb-6 p-4 rounded-xl border bg-yellow-500/10 border-yellow-500/30 flex items-center gap-3">
            <Clock className="h-5 w-5 text-yellow-400 shrink-0" />
            <p className="text-sm font-semibold text-yellow-400">
              {pendingCount} reservation{pendingCount !== 1 ? "s" : ""} awaiting confirmation
            </p>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name or contact…"
              className="w-full text-sm bg-background border border-input rounded-lg pl-9 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring text-foreground placeholder:text-muted-foreground"
            />
          </div>
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="text-sm bg-background border border-input rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
            />
            {dateFilter && (
              <button
                onClick={() => setDateFilter("")}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Show all
              </button>
            )}
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mb-6">
          {(["pending", "confirmed", "seated", "cancelled", "no_show"] as ResStatus[]).map((s) => {
            const count = filtered.filter((r) => r.status === s).length;
            return (
              <div key={s} className={`rounded-xl border p-3 text-center ${STATUS_STYLES[s] ?? ""}`}>
                <p className="text-lg font-bold">{count}</p>
                <p className="text-xs font-medium">{STATUS_LABELS[s]}</p>
              </div>
            );
          })}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-background border border-border rounded-xl p-4 animate-pulse space-y-3">
                <div className="h-4 w-32 bg-muted rounded" />
                <div className="h-3 w-24 bg-muted rounded" />
                <div className="h-8 w-full bg-muted rounded-lg" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 bg-card border border-card-border rounded-xl">
            <CalendarDays className="h-12 w-12 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-muted-foreground">
              {search ? "No reservations match your search." : dateFilter ? "No reservations for this date." : "No reservations yet."}
            </p>
          </div>
        ) : (
          <>
            {active.length > 0 && (
              <div className="mb-6">
                <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  Active
                  <span className="bg-chart-1/15 text-chart-1 text-xs font-semibold px-2 py-0.5 rounded-full">
                    {active.length}
                  </span>
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {active.map((r) => (
                    <ReservationCard key={r.id} reservation={r} onMutate={onMutate} />
                  ))}
                </div>
              </div>
            )}

            {terminal.length > 0 && (
              <details className="group">
                <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground transition-colors py-1 list-none flex items-center gap-1.5 mb-3">
                  <ChevronRight className="h-3.5 w-3.5 group-open:rotate-90 transition-transform" />
                  {terminal.length} cancelled / no-show
                </summary>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {terminal.map((r) => (
                    <ReservationCard key={r.id} reservation={r} onMutate={onMutate} />
                  ))}
                </div>
              </details>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
