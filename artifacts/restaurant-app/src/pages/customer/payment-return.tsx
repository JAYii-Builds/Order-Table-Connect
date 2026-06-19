import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { customFetch } from "@workspace/api-client-react";
import { CheckCircle2, XCircle, Loader2, CalendarDays } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard-layout";

interface PaymentStatus {
  paid: boolean;
  link_status: string;
}

export default function PaymentReturnPage() {
  const [location, navigate] = useLocation();
  const params = new URLSearchParams(location.split("?")[1] ?? "");
  const linkId = params.get("link_id") ?? "";
  const orderId = params.get("order_id") ?? "";

  const [status, setStatus] = useState<"checking" | "paid" | "unpaid" | "error">("checking");
  const [totalAmount, setTotalAmount] = useState<number | null>(null);

  useEffect(() => {
    if (!linkId || !orderId) {
      setStatus("error");
      return;
    }

    let attempts = 0;
    const maxAttempts = 10;

    async function check() {
      attempts++;
      try {
        const result = await customFetch<PaymentStatus>(
          `/api/payments/status/${linkId}?order_id=${orderId}`
        );
        if (result.paid) {
          setStatus("paid");
          // Fetch order to get total
          try {
            const order = await customFetch<{ total_amount: number }>(`/api/orders/${orderId}`);
            setTotalAmount(order.total_amount);
          } catch {
            // ignore
          }
        } else if (attempts < maxAttempts) {
          setTimeout(check, 3000);
        } else {
          setStatus("unpaid");
        }
      } catch {
        setStatus("error");
      }
    }

    check();
  }, [linkId, orderId]);

  return (
    <DashboardLayout role="customer" roleLabel="Customer" roleColor="text-chart-1">
      <div className="p-8 max-w-lg mx-auto">
        <div className="text-center py-12 bg-card border border-card-border rounded-xl px-8">
          {status === "checking" && (
            <>
              <Loader2 className="h-12 w-12 text-primary animate-spin mx-auto mb-4" />
              <h2 className="text-xl font-bold text-foreground mb-2">Verifying Payment…</h2>
              <p className="text-sm text-muted-foreground">
                Please wait while we confirm your payment with PayMongo.
              </p>
            </>
          )}

          {status === "paid" && (
            <>
              <div className="h-16 w-16 bg-chart-2/15 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="h-8 w-8 text-chart-2" />
              </div>
              <h2 className="text-xl font-bold text-foreground mb-2">Payment Confirmed!</h2>
              <p className="text-muted-foreground text-sm mb-1">
                Your order has been received and is now being prepared.
              </p>
              <p className="text-xs text-muted-foreground font-mono bg-muted px-3 py-1.5 rounded-md inline-block mt-2 mb-2">
                Order #{orderId.slice(0, 8).toUpperCase()}
              </p>
              {totalAmount !== null && (
                <div className="text-2xl font-bold text-primary mb-6">
                  ₱{Number(totalAmount).toFixed(2)}
                </div>
              )}

              <div className="flex flex-col gap-2 mt-4">
                <button
                  onClick={() => navigate(`/customer/reservations?order_id=${orderId}`)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
                >
                  <CalendarDays className="h-4 w-4" />
                  Reserve a Table
                </button>
                <button
                  onClick={() => navigate("/customer/orders")}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-border rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  View My Orders
                </button>
              </div>
            </>
          )}

          {status === "unpaid" && (
            <>
              <div className="h-16 w-16 bg-yellow-500/15 rounded-full flex items-center justify-center mx-auto mb-4">
                <XCircle className="h-8 w-8 text-yellow-400" />
              </div>
              <h2 className="text-xl font-bold text-foreground mb-2">Payment Pending</h2>
              <p className="text-sm text-muted-foreground mb-6">
                We couldn't confirm your payment yet. If you completed it, please check your orders in a few minutes.
              </p>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => navigate("/customer/orders")}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
                >
                  Check My Orders
                </button>
                <button
                  onClick={() => navigate("/customer/checkout")}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-border rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  Back to Checkout
                </button>
              </div>
            </>
          )}

          {status === "error" && (
            <>
              <div className="h-16 w-16 bg-destructive/15 rounded-full flex items-center justify-center mx-auto mb-4">
                <XCircle className="h-8 w-8 text-destructive" />
              </div>
              <h2 className="text-xl font-bold text-foreground mb-2">Something went wrong</h2>
              <p className="text-sm text-muted-foreground mb-6">
                We couldn't verify your payment. Please contact support with your order ID.
              </p>
              <button
                onClick={() => navigate("/customer/dashboard")}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                Go to Dashboard
              </button>
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
