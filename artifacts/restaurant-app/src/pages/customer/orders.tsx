import { useListOrders, type Order, customFetch } from "@workspace/api-client-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import {
  Loader2,
  ClipboardList,
  ChevronDown,
  ChevronUp,
  UtensilsCrossed,
  RefreshCw,
  Star,
} from "lucide-react";
import { useState } from "react";
import { useRealtime } from "@/hooks/use-realtime";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const STATUS_STYLES: Record<string, string> = {
  pending:   "bg-yellow-500/15 text-yellow-400",
  confirmed: "bg-blue-500/15 text-blue-400",
  preparing: "bg-orange-500/15 text-orange-400",
  ready:     "bg-chart-2/15 text-chart-2",
  delivered: "bg-muted text-muted-foreground",
  cancelled: "bg-destructive/15 text-destructive",
};

const STATUS_LABELS: Record<string, string> = {
  pending:   "Pending",
  confirmed: "Confirmed",
  preparing: "Preparing",
  ready:     "Ready",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

interface MyRefund {
  id: string;
  order_id: string;
  status: string;
  amount: number;
}

interface MyFeedback {
  id: string;
  order_id: string;
  rating: number;
  comment: string | null;
}

const MY_REFUNDS_KEY = ["refunds", "my"];
const MY_FEEDBACK_KEY = ["feedback", "my"];

function FeedbackSection({ order, myFeedback }: { order: Order; myFeedback: MyFeedback[] }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [hovered, setHovered] = useState(0);
  const [selected, setSelected] = useState(0);
  const [comment, setComment] = useState("");

  const existing = myFeedback.find((f) => f.order_id === order.id);

  const mutation = useMutation({
    mutationFn: () =>
      customFetch<MyFeedback>("/api/feedback", {
        method: "POST",
        body: JSON.stringify({ order_id: order.id, rating: selected, comment: comment.trim() || null }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MY_FEEDBACK_KEY });
      toast({ title: "Thanks for your feedback!" });
    },
    onError: (err: unknown) =>
      toast({ title: "Feedback failed", description: err instanceof Error ? err.message : "Error", variant: "destructive" }),
  });

  if (existing) {
    return (
      <div className="border-t border-border pt-3 flex items-center gap-2 text-xs">
        <div className="flex items-center gap-0.5">
          {[1,2,3,4,5].map((i) => (
            <Star key={i} className={`h-3.5 w-3.5 ${i <= existing.rating ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground/30"}`} />
          ))}
        </div>
        <span className="text-muted-foreground">Your rating</span>
      </div>
    );
  }

  return (
    <div className="border-t border-border pt-3 space-y-2">
      <p className="text-xs font-medium text-foreground flex items-center gap-1.5">
        <Star className="h-3.5 w-3.5 text-yellow-400" />
        How was your order?
      </p>
      <div className="flex items-center gap-1">
        {[1,2,3,4,5].map((i) => (
          <button
            key={i}
            type="button"
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(0)}
            onClick={() => setSelected(i)}
            className="p-0.5 transition-transform hover:scale-110"
          >
            <Star className={`h-5 w-5 ${i <= (hovered || selected) ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground/30"}`} />
          </button>
        ))}
      </div>
      {selected > 0 && (
        <>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Optional comment…"
            rows={2}
            className="w-full text-xs bg-background border border-input rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-ring text-foreground placeholder:text-muted-foreground"
          />
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500 text-white text-xs rounded-lg font-medium disabled:opacity-50"
          >
            {mutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Star className="h-3 w-3 fill-white" />}
            Submit Rating
          </button>
        </>
      )}
    </div>
  );
}

function RefundSection({ order, myRefunds }: { order: Order; myRefunds: MyRefund[] }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [reason, setReason] = useState("");
  const [showForm, setShowForm] = useState(false);

  const existing = myRefunds.find((r) => r.order_id === order.id);

  const mutation = useMutation({
    mutationFn: () =>
      customFetch<MyRefund>("/api/refunds", {
        method: "POST",
        body: JSON.stringify({ order_id: order.id, reason }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MY_REFUNDS_KEY });
      setShowForm(false);
      setReason("");
      toast({ title: "Refund requested", description: "Your request has been submitted for review." });
    },
    onError: (err: unknown) =>
      toast({
        title: "Refund failed",
        description: err instanceof Error ? err.message : "Could not submit refund request.",
        variant: "destructive",
      }),
  });

  if (existing && existing.status !== "rejected") {
    const statusColors: Record<string, string> = {
      pending: "text-yellow-400",
      manager_approved: "text-blue-400",
      completed: "text-chart-2",
      rejected: "text-destructive",
    };
    const statusLabels: Record<string, string> = {
      pending: "Pending review",
      manager_approved: "Awaiting owner approval",
      owner_approved: "Owner approved",
      completed: "Refund completed",
      rejected: "Rejected",
    };
    return (
      <div className="border-t border-border pt-3 flex items-center gap-2 text-xs">
        <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-muted-foreground">Refund:</span>
        <span className={`font-medium ${statusColors[existing.status] ?? "text-muted-foreground"}`}>
          {statusLabels[existing.status] ?? existing.status}
        </span>
      </div>
    );
  }

  if (showForm) {
    return (
      <div className="border-t border-border pt-3 space-y-2">
        <p className="text-xs font-medium text-foreground">Request a Refund</p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Describe the reason for your refund request…"
          rows={2}
          className="w-full text-xs bg-background border border-input rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-ring text-foreground placeholder:text-muted-foreground"
        />
        <div className="flex gap-2">
          <button
            onClick={() => mutation.mutate()}
            disabled={!reason.trim() || mutation.isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-xs rounded-lg font-medium disabled:opacity-50"
          >
            {mutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Submit"}
          </button>
          <button
            onClick={() => { setShowForm(false); setReason(""); }}
            className="px-3 py-1.5 text-xs rounded-lg bg-muted text-muted-foreground hover:text-foreground"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="border-t border-border pt-3">
      <button
        onClick={() => setShowForm(true)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <RefreshCw className="h-3.5 w-3.5" />
        Request Refund
      </button>
    </div>
  );
}

function OrderCard({ order, myRefunds, myFeedback }: { order: Order; myRefunds: MyRefund[]; myFeedback: MyFeedback[] }) {
  const [expanded, setExpanded] = useState(false);
  const date = new Date(order.created_at);
  const canRefund = order.status === "delivered" || order.status === "confirmed";
  const canFeedback = order.status === "delivered";

  return (
    <div className="bg-card border border-card-border rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors text-left"
        data-testid={`order-row-${order.id}`}
      >
        <div className="flex items-center gap-4">
          <div>
            <p className="font-mono text-xs text-muted-foreground">
              #{order.id.slice(0, 8).toUpperCase()}
            </p>
            <p className="text-sm font-semibold text-foreground">
              ₱{order.total_amount.toFixed(2)}
            </p>
          </div>
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLES[order.status] ?? "bg-muted text-muted-foreground"}`}>
            {STATUS_LABELS[order.status] ?? order.status}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground hidden sm:block">
            {date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-border px-5 py-4 space-y-3">
          <div className="space-y-2">
            {order.items.map((item) => (
              <div key={item.id} className="flex items-center justify-between text-sm">
                <span className="text-foreground">
                  {item.menu_item_name}{" "}
                  <span className="text-muted-foreground">× {item.quantity}</span>
                </span>
                <span className="text-foreground font-medium">₱{item.subtotal.toFixed(2)}</span>
              </div>
            ))}
          </div>
          {order.notes && (
            <div className="text-xs text-muted-foreground border-t border-border pt-3">
              <span className="font-medium">Notes: </span>
              {order.notes}
            </div>
          )}
          <div className="text-xs text-muted-foreground border-t border-border pt-3 sm:hidden">
            {date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </div>
          {canRefund && <RefundSection order={order} myRefunds={myRefunds} />}
          {canFeedback && <FeedbackSection order={order} myFeedback={myFeedback} />}
        </div>
      )}
    </div>
  );
}

export default function CustomerOrdersPage() {
  useRealtime();
  const { data: orders = [], isLoading } = useListOrders();

  const { data: myRefunds = [] } = useQuery({
    queryKey: MY_REFUNDS_KEY,
    queryFn: () => customFetch<MyRefund[]>("/api/refunds/my"),
  });

  const { data: myFeedback = [] } = useQuery({
    queryKey: MY_FEEDBACK_KEY,
    queryFn: () => customFetch<MyFeedback[]>("/api/feedback/my"),
  });

  return (
    <DashboardLayout role="customer" roleLabel="Customer" roleColor="text-chart-1">
      <div className="p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2" data-testid="text-page-title">
            <ClipboardList className="h-6 w-6" />
            My Orders
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Track your orders and request refunds on confirmed or delivered orders.
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-24 bg-card border border-card-border rounded-xl">
            <UtensilsCrossed className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">No orders yet. Browse the menu to get started.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => (
              <OrderCard key={order.id} order={order} myRefunds={myRefunds} myFeedback={myFeedback} />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
