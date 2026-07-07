import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { useToast } from "@/hooks/use-toast";
import { useRealtime } from "@/hooks/use-realtime";
import {
  RefreshCw,
  CheckCircle2,
  XCircle,
  Loader2,
  ArrowUpCircle,
  Clock,
} from "lucide-react";

interface Refund {
  id: string;
  order_id: string;
  customer_id: string;
  reason: string;
  amount: number;
  status: "pending" | "manager_approved" | "owner_approved" | "rejected" | "completed";
  requested_at: string;
  resolved_at: string | null;
}

const HIGH_VALUE_THRESHOLD = 500;

const STATUS_STYLES: Record<string, string> = {
  pending:          "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
  manager_approved: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  owner_approved:   "bg-chart-3/15 text-chart-3 border-chart-3/20",
  rejected:         "bg-destructive/15 text-destructive border-destructive/20",
  completed:        "bg-muted/60 text-muted-foreground border-border",
};

const STATUS_LABELS: Record<string, string> = {
  pending:          "Pending",
  manager_approved: "Awaiting Owner",
  owner_approved:   "Owner Approved",
  rejected:         "Rejected",
  completed:        "Completed",
};

function fetchRefunds(status?: string): Promise<Refund[]> {
  const qs = status ? `?status=${status}` : "";
  return customFetch<Refund[]>(`/api/refunds${qs}`);
}

function patchRefund(id: string, action: "approve" | "reject"): Promise<Refund> {
  return customFetch<Refund>(`/api/refunds/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ action }),
  });
}

function RefundCard({ refund, onMutate }: { refund: Refund; onMutate: () => void }) {
  const { toast } = useToast();
  const mutation = useMutation({
    mutationFn: (action: "approve" | "reject") => patchRefund(refund.id, action),
    onSuccess: (updated) => {
      onMutate();
      const msg =
        updated.status === "completed"
          ? "Refund marked as completed."
          : updated.status === "manager_approved"
          ? "Escalated to Owner for high-value approval."
          : "Refund rejected.";
      toast({ title: "Refund updated", description: msg });
    },
    onError: (err: unknown) =>
      toast({
        title: "Update failed",
        description: err instanceof Error ? err.message : "Could not update refund.",
        variant: "destructive",
      }),
  });

  const isHighValue = refund.amount >= HIGH_VALUE_THRESHOLD;
  const canAct = refund.status === "pending";

  return (
    <div className="bg-background border border-border rounded-xl p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-mono text-xs text-muted-foreground">
            #{refund.id.slice(0, 8).toUpperCase()}
          </p>
          <p className="text-sm font-semibold text-foreground mt-0.5">
            ₱{refund.amount.toFixed(2)}
            {isHighValue && (
              <span className="ml-2 text-xs bg-orange-500/15 text-orange-400 px-1.5 py-0.5 rounded">
                High Value
              </span>
            )}
          </p>
        </div>
        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${STATUS_STYLES[refund.status] ?? ""}`}>
          {STATUS_LABELS[refund.status] ?? refund.status}
        </span>
      </div>

      <div className="text-xs text-muted-foreground space-y-1">
        <p>
          <span className="font-medium text-foreground">Order:</span>{" "}
          #{refund.order_id.slice(0, 8).toUpperCase()}
        </p>
        <p>
          <span className="font-medium text-foreground">Reason:</span> {refund.reason}
        </p>
        <p>
          <span className="font-medium text-foreground">Requested:</span>{" "}
          {new Date(refund.requested_at).toLocaleString()}
        </p>
        {refund.resolved_at && (
          <p>
            <span className="font-medium text-foreground">Resolved:</span>{" "}
            {new Date(refund.resolved_at).toLocaleString()}
          </p>
        )}
      </div>

      {canAct && (
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            onClick={() => mutation.mutate("approve")}
            disabled={mutation.isPending}
            className="flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold bg-chart-2 hover:opacity-90 text-white transition-all disabled:opacity-50"
          >
            {mutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : isHighValue ? (
              <><ArrowUpCircle className="h-3.5 w-3.5" />Escalate</>
            ) : (
              <><CheckCircle2 className="h-3.5 w-3.5" />Approve</>
            )}
          </button>
          <button
            onClick={() => mutation.mutate("reject")}
            disabled={mutation.isPending}
            className="flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold bg-destructive/80 hover:bg-destructive text-white transition-all disabled:opacity-50"
          >
            {mutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <><XCircle className="h-3.5 w-3.5" />Reject</>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

const REFUND_KEY = (status?: string) => ["refunds", status ?? "all"];

export default function ManagerRefundsPage() {
  useRealtime();
  const queryClient = useQueryClient();

  const { data: refunds = [], isLoading } = useQuery({
    queryKey: REFUND_KEY(),
    queryFn: () => fetchRefunds(),
  });

  function onMutate() {
    queryClient.invalidateQueries({ queryKey: REFUND_KEY() });
  }

  const pending = refunds.filter((r) => r.status === "pending");
  const escalated = refunds.filter((r) => r.status === "manager_approved");
  const resolved = refunds.filter(
    (r) => r.status === "completed" || r.status === "rejected" || r.status === "owner_approved"
  );

  const pendingCount = pending.length;

  return (
    <DashboardLayout role="manager" roleLabel="Manager" roleColor="text-chart-4">
      <div className="p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <RefreshCw className="h-6 w-6" />
            Refund Management
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Review and approve or reject customer refund requests. Refunds ≥ ₱{HIGH_VALUE_THRESHOLD} are escalated to the Owner.
          </p>
          <p className="text-xs text-muted-foreground mt-1 bg-muted/40 rounded-lg px-3 py-2 border border-border">
            Note: Approving a refund marks it as completed in this system. The actual money return must be processed manually through the PayMongo dashboard.
          </p>
        </div>

        {pendingCount > 0 && (
          <div className="mb-6 p-4 rounded-xl border bg-yellow-500/10 border-yellow-500/30 flex items-center gap-3">
            <Clock className="h-5 w-5 text-yellow-400 shrink-0" />
            <p className="text-sm font-semibold text-yellow-400">
              {pendingCount} refund{pendingCount !== 1 ? "s" : ""} awaiting your review
            </p>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {pending.length > 0 && (
              <div className="mb-6">
                <h2 className="text-sm font-semibold text-foreground mb-3">Pending Review</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {pending.map((r) => (
                    <RefundCard key={r.id} refund={r} onMutate={onMutate} />
                  ))}
                </div>
              </div>
            )}

            {escalated.length > 0 && (
              <div className="mb-6">
                <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  Escalated to Owner
                  <span className="text-xs bg-blue-500/15 text-blue-400 px-2 py-0.5 rounded-full">{escalated.length}</span>
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {escalated.map((r) => (
                    <RefundCard key={r.id} refund={r} onMutate={onMutate} />
                  ))}
                </div>
              </div>
            )}

            {resolved.length > 0 && (
              <details className="group">
                <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground transition-colors py-1 list-none flex items-center gap-1.5 mb-3">
                  {resolved.length} resolved refunds
                </summary>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {resolved.map((r) => (
                    <RefundCard key={r.id} refund={r} onMutate={onMutate} />
                  ))}
                </div>
              </details>
            )}

            {refunds.length === 0 && (
              <div className="text-center py-16 bg-card border border-card-border rounded-xl">
                <RefreshCw className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
                <p className="text-muted-foreground">No refund requests yet.</p>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
