import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { useToast } from "@/hooks/use-toast";
import {
  Archive,
  Loader2,
  RotateCcw,
  Trash2,
  ChevronDown,
  ChevronUp,
  PackageOpen,
} from "lucide-react";

interface ArchivedOrderItem {
  id: string;
  menu_item_name: string;
  quantity: number;
  subtotal: number;
}

interface ArchivedOrder {
  id: string;
  customer_id: string;
  status: string;
  total_amount: number;
  notes: string | null;
  created_at: string;
  items: ArchivedOrderItem[];
}

const ARCHIVE_KEY = ["archive"];

const STATUS_STYLES: Record<string, string> = {
  delivered: "bg-muted text-muted-foreground",
  cancelled: "bg-destructive/15 text-destructive",
};

function OrderRow({ order, onRestore }: { order: ArchivedOrder; onRestore: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const date = new Date(order.created_at);

  return (
    <div className="bg-card border border-card-border rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors text-left"
      >
        <div className="flex items-center gap-4">
          <div>
            <p className="font-mono text-xs text-muted-foreground">#{order.id.slice(0, 8).toUpperCase()}</p>
            <p className="text-sm font-semibold text-foreground">₱{order.total_amount.toFixed(2)}</p>
          </div>
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${STATUS_STYLES[order.status] ?? "bg-muted text-muted-foreground"}`}>
            {order.status}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground hidden sm:block">
            {date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); onRestore(order.id); }}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-muted text-muted-foreground hover:text-foreground text-xs transition-colors"
          >
            <RotateCcw className="h-3 w-3" />
            Restore
          </button>
          {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-border px-5 py-4 space-y-2">
          {order.items.map((item) => (
            <div key={item.id} className="flex items-center justify-between text-sm">
              <span className="text-foreground">
                {item.menu_item_name} <span className="text-muted-foreground">× {item.quantity}</span>
              </span>
              <span className="font-medium text-foreground">₱{item.subtotal.toFixed(2)}</span>
            </div>
          ))}
          {order.notes && (
            <p className="text-xs text-muted-foreground border-t border-border pt-2">
              <span className="font-medium">Notes: </span>{order.notes}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function ManagerArchivePage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ARCHIVE_KEY,
    queryFn: () => customFetch<ArchivedOrder[]>("/api/archive"),
  });

  const bulkMutation = useMutation({
    mutationFn: () => customFetch("/api/archive/bulk", { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ARCHIVE_KEY });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast({ title: "Orders archived", description: "All completed and cancelled orders have been archived." });
    },
    onError: () => toast({ title: "Failed to archive", variant: "destructive" }),
  });

  const restoreMutation = useMutation({
    mutationFn: (id: string) => customFetch(`/api/archive/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ARCHIVE_KEY });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast({ title: "Order restored" });
    },
    onError: () => toast({ title: "Restore failed", variant: "destructive" }),
  });

  return (
    <DashboardLayout role="manager" roleLabel="Manager" roleColor="text-chart-4">
      <div className="p-8">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2" data-testid="text-page-title">
              <Archive className="h-6 w-6" />
              Order Archive
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Archived orders are hidden from active views. Restore to make them visible again.
            </p>
          </div>
          <button
            onClick={() => bulkMutation.mutate()}
            disabled={bulkMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm rounded-lg font-medium disabled:opacity-50 shrink-0"
          >
            {bulkMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            Archive Completed
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-24 bg-card border border-card-border rounded-xl">
            <PackageOpen className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">No archived orders.</p>
            <p className="text-muted-foreground text-sm mt-1">
              Use "Archive Completed" to move delivered and cancelled orders here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">{orders.length} archived order{orders.length !== 1 ? "s" : ""}</p>
            {orders.map((order) => (
              <OrderRow
                key={order.id}
                order={order}
                onRestore={(id) => restoreMutation.mutate(id)}
              />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
