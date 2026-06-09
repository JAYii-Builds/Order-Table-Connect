import { useListOrders, type Order } from "@workspace/api-client-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Loader2, ClipboardList, ChevronDown, ChevronUp, UtensilsCrossed } from "lucide-react";
import { useState } from "react";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-yellow-500/15 text-yellow-400",
  confirmed: "bg-blue-500/15 text-blue-400",
  preparing: "bg-orange-500/15 text-orange-400",
  ready: "bg-chart-2/15 text-chart-2",
  delivered: "bg-muted text-muted-foreground",
  cancelled: "bg-destructive/15 text-destructive",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  preparing: "Preparing",
  ready: "Ready",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

function OrderCard({ order }: { order: Order }) {
  const [expanded, setExpanded] = useState(false);
  const date = new Date(order.created_at);

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
        </div>
      )}
    </div>
  );
}

export default function CustomerOrdersPage() {
  const { data: orders = [], isLoading } = useListOrders();

  return (
    <DashboardLayout role="customer" roleLabel="Customer" roleColor="text-chart-1">
      <div className="p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2" data-testid="text-page-title">
            <ClipboardList className="h-6 w-6" />
            My Orders
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Track the status of your past and current orders.
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
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
