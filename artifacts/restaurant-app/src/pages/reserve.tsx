import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import {
  CalendarDays,
  Users,
  Clock,
  CheckCircle2,
  Loader2,
  Phone,
  User,
  UtensilsCrossed,
} from "lucide-react";

const TIME_SLOTS = [
  "11:00", "11:30", "12:00", "12:30", "13:00", "13:30",
  "18:00", "18:30", "19:00", "19:30", "20:00", "20:30",
];

interface TableReservation {
  id: string;
  customer_name: string;
  contact_info: string;
  party_size: number;
  reservation_date: string;
  reservation_time: string;
  status: string;
  notes: string | null;
}

function formatTime(t: string): string {
  const [h, m] = t.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  return `${hour % 12 || 12}:${m} ${ampm}`;
}

export default function ReservePage() {
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [guests, setGuests] = useState(2);
  const [notes, setNotes] = useState("");
  const [submitted, setSubmitted] = useState<TableReservation | null>(null);

  const today = new Date().toISOString().split("T")[0];

  const createReservation = useMutation({
    mutationFn: (data: object) =>
      customFetch<TableReservation>("/api/table-reservations", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: (res) => {
      setSubmitted(res);
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Failed to submit reservation.";
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
    <div className="min-h-screen bg-background flex flex-col items-center justify-start py-12 px-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="h-14 w-14 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
            <UtensilsCrossed className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">TableServe</h1>
          <p className="text-muted-foreground mt-1">Reserve your table</p>
        </div>

        <div className="bg-card border border-card-border rounded-2xl overflow-hidden shadow-sm">
          {submitted ? (
            <div className="p-8 text-center">
              <div className="h-16 w-16 bg-chart-2/15 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="h-8 w-8 text-chart-2" />
              </div>
              <h2 className="text-xl font-bold text-foreground mb-1">Reservation Received!</h2>
              <p className="text-sm text-muted-foreground mb-5">
                We'll reach out to confirm your table.
              </p>

              <div className="bg-muted/50 rounded-xl p-4 text-left space-y-2 mb-6">
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-foreground font-medium">{submitted.customer_name}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-foreground">{submitted.reservation_date} at {formatTime(submitted.reservation_time)}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-foreground">{submitted.party_size} {submitted.party_size === 1 ? "guest" : "guests"}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-foreground">{submitted.contact_info}</span>
                </div>
              </div>

              <p className="text-xs text-muted-foreground mb-4">
                Reference: <span className="font-mono">#{submitted.id.slice(0, 8).toUpperCase()}</span>
              </p>

              <button
                onClick={() => {
                  setSubmitted(null);
                  setName(""); setContact(""); setDate(""); setTime(""); setNotes(""); setGuests(2);
                }}
                className="text-sm text-primary hover:underline"
              >
                Make another reservation
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div className="px-0 pb-2 border-b border-border">
                <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-primary" />
                  New Reservation
                </h2>
              </div>

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
                    placeholder="Juan dela Cruz"
                    data-testid="input-name"
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
                    data-testid="input-contact"
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
                {!time && (
                  <p className="text-xs text-muted-foreground mt-1">Select a time slot above</p>
                )}
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
                className="w-full flex items-center justify-center gap-2 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {createReservation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Submitting…
                  </>
                ) : (
                  <>
                    <CalendarDays className="h-4 w-4" />
                    Reserve Table
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Already have an account?{" "}
          <a href="/login" className="text-primary hover:underline">
            Sign in
          </a>
        </p>
      </div>
    </div>
  );
}
