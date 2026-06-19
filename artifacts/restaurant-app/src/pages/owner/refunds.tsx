import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { useToast } from "@/hooks/use-toast";
import { useRealtime } from "@/hooks/use-realtime";
import { RefreshCw, CheckCircle2, XCircle, Loader2, Clock } from "lucide-react";

interface Refund {
  id: string;
  order_id: string;
  customer_id: string;
  reason: string;
  amount: number;
  status: string;
  requested_at: string;
  resolved_at: string | null;
}

function fetchEscalated(): Promise<Refund[]> {
  return customFetch<Refund[]>("/api/refunds?status=manager_approved");
}

function patchRefund(id: string, action: "approve" | "reject"): Promise<Refund> {
  return customFetch<Refund>(`/api/refunds/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ action }),
  });
}

function EscalatedCard({ refund, onMutate }: { refund: Refund; onMutate: () => void }) {
  const { toast } = useToast();
  const mutation = useMutation({
    mutationFn: (action: "approve" | "reject") => patchRefund(refund.id, action),
    onSuccess: (updated) => {
      onMutate();
      toast({
        title: updated.status === "completed" ? "Refund approved & completed" : "Refund rejected",
        description: `#${updated.id.slice(0, 8).toUpperCase()} — ₱${refund.amount.toFixed(2)}`,
      });
    },
    onError: (err: unknown) =>
      toast({
        title: "Update failed",
        description: err instanceof Error ? err.message : "Could not update refund.",
        variant: "destructive",
      }),
  });

  return (
    <div className="bg-background border border-border rounded-xl p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-mono text-xs text-muted-foreground">#{refund.id.slice(0, 8).toUpperCase()}</p>
          <p className="text-sm font-semibold text-foreground mt-0.5">₱{refund.amount.toFixed(2)}</p>
        </div>
        <span className="px-2 py-0.5 rounded-full text-xs font-semibold border bg-blue-500/15 text-blue-400 border-blue-500/20">
          Awaiting Owner
        </span>
      </div>

      <div className="text-xs text-muted-foreground space-y-1">
        <p><span className="font-medium text-foreground">Order:</span> #{refund.order_id.slice(0, 8).toUpperCase()}</p>
        <p><span className="font-medium text-foreground">Reason:</span> {refund.reason}</p>
        <p><span className="font-medium text-foreground">Requested:</span> {new Date(refund.requested_at).toLocaleString()}</p>
      </div>

      <div className="grid grid-cols-2 gap-2 pt-1">
        <button
          onClick={() => mutation.mutate("approve")}
          disabled={mutation.isPending}
          className="flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold bg-chart-2 hover:opacity-90 text-white disabled:opacity-50"
        >
          {mutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><CheckCircle2 className="h-3.5 w-3.5" />Approve</>}
        </button>
        <button
          onClick={() => mutation.mutate("reject")}
          disabled={mutation.isPending}
          className="flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold bg-destructive/80 hover:bg-destructive text-white disabled:opacity-50"
        >
          {mutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><XCircle className="h-3.5 w-3.5" />Reject</>}
        </button>
      </div>
    </div>
  );
}

const ESCALATED_KEY = ["refunds", "manager_approved"];

export default function OwnerRefundsPage() {
  useRealtime();
  const queryClient = useQueryClient();

  const { data: refunds = [], isLoading } = useQuery({
    queryKey: ESCALATED_KEY,
    queryFn: fetchEscalated,
  });

  function onMutate() {
    queryClient.invalidateQueries({ queryKey: ESCALATED_KEY });
  }

  return (
    <DashboardLayout role="owner" roleLabel="Owner" roleColor="text-chart-5">
      <div className="p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <RefreshCw className="h-6 w-6" />
            High-Value Refund Queue
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Refund requests ≥ ₱500 that have been approved by the Manager and require your final decision.
          </p>
        </div>

        {refunds.length > 0 && (
          <div className="mb-6 p-4 rounded-xl border bg-yellow-500/10 border-yellow-500/30 flex items-center gap-3">
            <Clock className="h-5 w-5 text-yellow-400 shrink-0" />
            <p className="text-sm font-semibold text-yellow-400">
              {refunds.length} high-value refund{refunds.length !== 1 ? "s" : ""} awaiting your approval
            </p>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : refunds.length === 0 ? (
          <div className="text-center py-20 bg-card border border-card-border rounded-xl">
            <RefreshCw className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-muted-foreground">No high-value refunds pending your review.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {refunds.map((r) => (
              <EscalatedCard key={r.id} refund={r} onMutate={onMutate} />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
