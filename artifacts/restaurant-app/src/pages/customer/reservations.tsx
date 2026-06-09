import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  useCreateReservation,
  useListReservations,
  useListOrders,
  getListReservationsQueryKey,
  type Reservation,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import { useToast } from "@/hooks/use-toast";
import {
  CalendarDays,
  Users,
  Clock,
  CheckCircle2,
  Loader2,
  UtensilsCrossed,
  AlertCircle,
} from "lucide-react";

const MIN_ORDER_AMOUNT = 200;

const TIME_SLOTS = [
  "11:00", "11:30", "12:00", "12:30", "13:00", "13:30",
  "18:00", "18:30", "19:00", "19:30", "20:00", "20:30",
];

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-yellow-500/15 text-yellow-400",
  confirmed: "bg-blue-500/15 text-blue-400",
  cancelled: "bg-destructive/15 text-destructive",
  completed: "bg-muted text-muted-foreground",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  cancelled: "Cancelled",
  completed: "Completed",
};

function ReservationCard({ reservation }: { reservation: Reservation }) {
  return (
    <div className="bg-card border border-card-border rounded-xl p-5 flex items-start gap-4">
      <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
        <CalendarDays className="h-5 w-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className="font-semibold text-foreground text-sm">
            {reservation.reservation_date}
          </span>
          <span className="text-muted-foreground text-xs">at</span>
          <span className="font-semibold text-foreground text-sm">
            {reservation.reservation_time}
          </span>
          <span className={`ml-auto px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLES[reservation.status] ?? "bg-muted text-muted-foreground"}`}>
            {STATUS_LABELS[reservation.status] ?? reservation.status}
          </span>
        </div>
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Users className="h-3 w-3" />
          {reservation.guest_count} guest{reservation.guest_count !== 1 ? "s" : ""}
        </p>
        {reservation.notes && (
          <p className="text-xs text-muted-foreground mt-1 italic">"{reservation.notes}"</p>
        )}
      </div>
    </div>
  );
}

export default function CustomerReservationsPage() {
  const [location] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const preselectedOrderId = new URLSearchParams(location.split("?")[1] ?? "").get("order_id") ?? "";

  const [orderId, setOrderId] = useState(preselectedOrderId);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [guests, setGuests] = useState(2);
  const [notes, setNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const { data: reservations = [], isLoading: loadingReservations } = useListReservations();
  const { data: orders = [], isLoading: loadingOrders } = useListOrders();

  const eligibleOrders = orders.filter((o) => o.total_amount >= MIN_ORDER_AMOUNT);

  useEffect(() => {
    if (preselectedOrderId && !orderId) {
      setOrderId(preselectedOrderId);
    }
  }, [preselectedOrderId]);

  const createReservation = useCreateReservation();

  const today = new Date().toISOString().split("T")[0];

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!orderId || !date || !time || guests < 1) return;

    createReservation.mutate(
      {
        data: {
          order_id: orderId,
          reservation_date: date,
          reservation_time: time,
          guest_count: guests,
          notes: notes.trim() || null,
        },
      },
      {
        onSuccess: () => {
          setSubmitted(true);
          queryClient.invalidateQueries({ queryKey: getListReservationsQueryKey() });
        },
        onError: (err: unknown) => {
          const msg = err instanceof Error ? err.message : "Failed to create reservation.";
          toast({ title: "Reservation failed", description: msg, variant: "destructive" });
        },
      },
    );
  }

  return (
    <DashboardLayout role="customer" roleLabel="Customer" roleColor="text-chart-1">
      <div className="p-8 max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2" data-testid="text-page-title">
            <CalendarDays className="h-6 w-6" />
            Table Reservations
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Reserve a table. Requires a minimum order of ₱{MIN_ORDER_AMOUNT}.
          </p>
        </div>

        {/* New reservation form */}
        <div className="bg-card border border-card-border rounded-xl overflow-hidden mb-8">
          <div className="px-5 py-4 border-b border-border bg-muted/40">
            <h2 className="text-sm font-semibold text-foreground">New Reservation</h2>
          </div>

          {submitted ? (
            <div className="p-8 text-center">
              <div className="h-14 w-14 bg-chart-2/15 rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="h-7 w-7 text-chart-2" />
              </div>
              <p className="font-semibold text-foreground mb-1">Reservation Submitted!</p>
              <p className="text-sm text-muted-foreground mb-4">
                We'll confirm your table for {date} at {time} for {guests} guest{guests !== 1 ? "s" : ""}.
              </p>
              <button
                onClick={() => { setSubmitted(false); setDate(""); setTime(""); setNotes(""); setOrderId(""); }}
                className="text-sm text-primary hover:underline"
              >
                Make another reservation
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="p-5 space-y-5">
              {/* Order selector */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Link to Order <span className="text-destructive">*</span>
                  <span className="text-muted-foreground font-normal ml-1">(₱{MIN_ORDER_AMOUNT}+ required)</span>
                </label>
                {loadingOrders ? (
                  <div className="h-10 bg-muted rounded-lg animate-pulse" />
                ) : eligibleOrders.length === 0 ? (
                  <div className="flex items-start gap-2 bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2.5">
                    <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                    <p className="text-xs text-muted-foreground">
                      You don't have any qualifying orders yet. Place an order of ₱{MIN_ORDER_AMOUNT}+ first.
                    </p>
                  </div>
                ) : (
                  <select
                    value={orderId}
                    onChange={(e) => setOrderId(e.target.value)}
                    required
                    data-testid="select-order"
                    className="w-full text-sm bg-background border border-input rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
                  >
                    <option value="">Select an order…</option>
                    {eligibleOrders.map((o) => (
                      <option key={o.id} value={o.id}>
                        #{o.id.slice(0, 8).toUpperCase()} — ₱{o.total_amount.toFixed(2)} · {STATUS_LABELS[o.status] ?? o.status}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5 flex items-center gap-1.5">
                  <CalendarDays className="h-4 w-4" />
                  Date <span className="text-destructive">*</span>
                </label>
                <input
                  type="date"
                  value={date}
                  min={today}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  data-testid="input-date"
                  className="w-full text-sm bg-background border border-input rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
                />
              </div>

              {/* Time */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5 flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  Time <span className="text-destructive">*</span>
                </label>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {TIME_SLOTS.map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setTime(slot)}
                      data-testid={`time-slot-${slot}`}
                      className={`py-2 text-xs font-medium rounded-lg border transition-colors ${
                        time === slot
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background border-input text-foreground hover:border-primary/50"
                      }`}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              </div>

              {/* Guests */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5 flex items-center gap-1.5">
                  <Users className="h-4 w-4" />
                  Guests <span className="text-destructive">*</span>
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setGuests((g) => Math.max(1, g - 1))}
                    className="h-9 w-9 flex items-center justify-center rounded-lg border border-input text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
                  >
                    −
                  </button>
                  <span className="w-10 text-center text-base font-bold text-foreground">{guests}</span>
                  <button
                    type="button"
                    onClick={() => setGuests((g) => Math.min(20, g + 1))}
                    className="h-9 w-9 flex items-center justify-center rounded-lg border border-input text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
                  >
                    +
                  </button>
                  <span className="text-xs text-muted-foreground">guest{guests !== 1 ? "s" : ""} (max 20)</span>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Special Requests <span className="text-muted-foreground font-normal">(optional)</span>
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Occasion, dietary needs, seating preferences…"
                  className="w-full text-sm bg-background border border-input rounded-lg px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-ring text-foreground placeholder:text-muted-foreground"
                />
              </div>

              <button
                type="submit"
                disabled={
                  createReservation.isPending ||
                  !orderId ||
                  !date ||
                  !time ||
                  eligibleOrders.length === 0
                }
                data-testid="button-reserve"
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {createReservation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Reserving…
                  </>
                ) : (
                  <>
                    <CalendarDays className="h-4 w-4" />
                    Confirm Reservation
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Existing reservations */}
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-3">My Reservations</h2>
          {loadingReservations ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : reservations.length === 0 ? (
            <div className="text-center py-10 bg-card border border-card-border rounded-xl">
              <UtensilsCrossed className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-muted-foreground text-sm">No reservations yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reservations.map((r) => (
                <ReservationCard key={r.id} reservation={r} />
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
