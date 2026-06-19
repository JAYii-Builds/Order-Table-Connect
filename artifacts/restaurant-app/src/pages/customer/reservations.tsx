import { useState, useEffect } from "react";
import { useRealtime } from "@/hooks/use-realtime";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import {
  CalendarDays,
  Users,
  Clock,
  CheckCircle2,
  Loader2,
  UtensilsCrossed,
  Phone,
  User,
  Table2,
} from "lucide-react";

const TIME_SLOTS = [
  "11:00", "11:30", "12:00", "12:30", "13:00", "13:30",
  "18:00", "18:30", "19:00", "19:30", "20:00", "20:30",
];

const STATUS_STYLES: Record<string, string> = {
  pending:   "bg-yellow-500/15 text-yellow-400",
  confirmed: "bg-blue-500/15 text-blue-400",
  seated:    "bg-chart-3/15 text-chart-3",
  cancelled: "bg-destructive/15 text-destructive",
  no_show:   "bg-muted text-muted-foreground",
};

const STATUS_LABELS: Record<string, string> = {
  pending:   "Pending",
  confirmed: "Confirmed",
  seated:    "Seated",
  cancelled: "Cancelled",
  no_show:   "No Show",
};

interface TableReservation {
  id: string;
  customer_id: string | null;
  customer_name: string;
  contact_info: string;
  party_size: number;
  reservation_date: string;
  reservation_time: string;
  table_id: string | null;
  status: string;
  notes: string | null;
  created_at: string;
}

function formatTime(t: string): string {
  const [h, m] = t.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  return `${hour % 12 || 12}:${m} ${ampm}`;
}

function ReservationCard({ reservation }: { reservation: TableReservation }) {
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
            {formatTime(reservation.reservation_time)}
          </span>
          <span className={`ml-auto px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLES[reservation.status] ?? "bg-muted text-muted-foreground"}`}>
            {STATUS_LABELS[reservation.status] ?? reservation.status}
          </span>
        </div>
        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
          <Users className="h-3 w-3" />
          {reservation.party_size} guest{reservation.party_size !== 1 ? "s" : ""}
        </p>
        {reservation.table_id && (
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
            <Table2 className="h-3 w-3" />
            Table {reservation.table_id}
          </p>
        )}
        {reservation.notes && (
          <p className="text-xs text-muted-foreground mt-1 italic">"{reservation.notes}"</p>
        )}
      </div>
    </div>
  );
}

const MY_RESERVATIONS_KEY = ["table-reservations", "my"] as const;

export default function CustomerReservationsPage() {
  useRealtime();
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const today = new Date().toISOString().split("T")[0];

  const [name, setName] = useState(user?.full_name ?? "");
  const [contact, setContact] = useState(user?.phone ?? "");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [guests, setGuests] = useState(2);
  const [notes, setNotes] = useState("");
  const [submitted, setSubmitted] = useState<TableReservation | null>(null);

  // Pre-fill name/contact when user data loads
  useEffect(() => {
    if (user?.full_name && !name) setName(user.full_name);
    if (user?.phone && !contact) setContact(user.phone);
  }, [user]);

  // Fetch this customer's reservations from the DB (not localStorage)
  const { data: myReservations = [], isLoading } = useQuery({
    queryKey: MY_RESERVATIONS_KEY,
    queryFn: () => customFetch<TableReservation[]>("/api/table-reservations/my"),
  });

  const createReservation = useMutation({
    mutationFn: (data: object) =>
      customFetch<TableReservation>("/api/table-reservations", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: (res) => {
      setSubmitted(res);
      queryClient.invalidateQueries({ queryKey: MY_RESERVATIONS_KEY });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Failed to create reservation.";
      toast({ title: "Reservation failed", description: msg, variant: "destructive" });
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !contact || !date || !time || guests < 1) return;
    createReservation.mutate({
      customer_name: name.trim(),
      contact_info: contact.trim(),
      party_size: guests,
      reservation_date: date,
      reservation_time: time,
      notes: notes.trim() || null,
    });
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
            Reserve a table. We'll confirm your booking shortly.
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
                We'll confirm your table for {submitted.reservation_date} at {formatTime(submitted.reservation_time)} for {submitted.party_size} guest{submitted.party_size !== 1 ? "s" : ""}.
              </p>
              <button
                onClick={() => { setSubmitted(null); setDate(""); setTime(""); setNotes(""); setGuests(2); }}
                className="text-sm text-primary hover:underline"
              >
                Make another reservation
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="p-5 space-y-5">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Full Name <span className="text-destructive">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="Your full name"
                    className="w-full text-sm bg-background border border-input rounded-lg pl-10 pr-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-ring text-foreground placeholder:text-muted-foreground"
                  />
                </div>
              </div>

              {/* Contact */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Phone / Email <span className="text-destructive">*</span>
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    required
                    placeholder="09XXXXXXXXX or email@example.com"
                    className="w-full text-sm bg-background border border-input rounded-lg pl-10 pr-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-ring text-foreground placeholder:text-muted-foreground"
                  />
                </div>
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
                      {formatTime(slot)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Guests */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5 flex items-center gap-1.5">
                  <Users className="h-4 w-4" />
                  Party Size <span className="text-destructive">*</span>
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setGuests((g) => Math.max(1, g - 1))}
                    className="h-9 w-9 flex items-center justify-center rounded-lg border border-input text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors text-lg"
                  >
                    −
                  </button>
                  <span className="w-10 text-center text-base font-bold text-foreground">{guests}</span>
                  <button
                    type="button"
                    onClick={() => setGuests((g) => Math.min(20, g + 1))}
                    className="h-9 w-9 flex items-center justify-center rounded-lg border border-input text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors text-lg"
                  >
                    +
                  </button>
                  <span className="text-xs text-muted-foreground">{guests === 1 ? "guest" : "guests"} (max 20)</span>
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
                disabled={createReservation.isPending || !name || !contact || !date || !time}
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

        {/* My Reservations — fetched from DB by customer_id */}
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-3">My Reservations</h2>
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : myReservations.length === 0 ? (
            <div className="text-center py-10 bg-card border border-card-border rounded-xl">
              <UtensilsCrossed className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-muted-foreground text-sm">No reservations yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {myReservations.map((r) => (
                <ReservationCard key={r.id} reservation={r} />
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
