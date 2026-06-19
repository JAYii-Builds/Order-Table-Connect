import { useState } from "react";
import { useCart } from "@/contexts/cart-context";
import { DashboardLayout } from "@/components/dashboard-layout";
import { useCreateOrder } from "@workspace/api-client-react";
import { customFetch } from "@workspace/api-client-react";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  UtensilsCrossed,
  Loader2,
  CheckCircle2,
  CalendarDays,
  ShoppingCart,
  ArrowLeft,
  CreditCard,
  Wallet,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getApiBaseUrl } from "@/lib/api-config";

const MIN_RESERVATION_AMOUNT = 200;

interface PlacedOrder {
  id: string;
  total_amount: number;
}

interface PaymentLinkResponse {
  order_id: string;
  link_id: string;
  checkout_url: string;
}

export default function CustomerCheckoutPage() {
  const { items, total, clearCart } = useCart();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [notes, setNotes] = useState("");
  const [placedOrder, setPlacedOrder] = useState<PlacedOrder | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"place_order" | "paymongo">("place_order");

  const createOrder = useCreateOrder();

  const createPaymongoLink = useMutation({
    mutationFn: (data: object) =>
      customFetch<PaymentLinkResponse>("/api/payments/create-link", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: (res) => {
      clearCart();
      // Redirect to PayMongo's hosted checkout
      const returnUrl = `${getApiBaseUrl() ? window.location.origin : ""}/customer/payment-return?order_id=${res.order_id}&link_id=${res.link_id}`;
      // Store return URL isn't needed — PayMongo uses success_url configured on the link
      // For sandbox, we redirect directly and check status on return
      window.location.href = res.checkout_url;
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Failed to initiate payment. Please try again.";
      toast({ title: "Payment failed", description: msg, variant: "destructive" });
    },
  });

  function handlePlaceOrder() {
    if (items.length === 0) return;

    if (paymentMethod === "paymongo") {
      createPaymongoLink.mutate({
        items: items.map((ci) => ({
          menu_item_id: ci.menuItem.id,
          quantity: ci.quantity,
        })),
        notes: notes.trim() || null,
      });
      return;
    }

    createOrder.mutate(
      {
        data: {
          items: items.map((ci) => ({
            menu_item_id: ci.menuItem.id,
            quantity: ci.quantity,
          })),
          notes: notes.trim() || null,
        },
      },
      {
        onSuccess: (order) => {
          clearCart();
          setPlacedOrder({ id: order.id, total_amount: order.total_amount });
        },
        onError: (err: unknown) => {
          const msg =
            err instanceof Error ? err.message : "Failed to place order. Please try again.";
          toast({ title: "Order failed", description: msg, variant: "destructive" });
        },
      },
    );
  }

  if (placedOrder) {
    const canReserve = placedOrder.total_amount >= MIN_RESERVATION_AMOUNT;
    return (
      <DashboardLayout role="customer" roleLabel="Customer" roleColor="text-chart-1">
        <div className="p-8 max-w-lg mx-auto">
          <div className="text-center py-12 bg-card border border-card-border rounded-xl px-8">
            <div className="h-16 w-16 bg-chart-2/15 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="h-8 w-8 text-chart-2" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">Order Placed!</h2>
            <p className="text-muted-foreground text-sm mb-1">
              Your order has been received and is being prepared.
            </p>
            <p className="text-xs text-muted-foreground font-mono bg-muted px-3 py-1.5 rounded-md inline-block mt-2 mb-5">
              Order #{placedOrder.id.slice(0, 8).toUpperCase()}
            </p>
            <div className="text-2xl font-bold text-primary mb-6">
              ₱{placedOrder.total_amount.toFixed(2)}
            </div>

            {canReserve && (
              <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 mb-5 text-left">
                <p className="text-sm font-medium text-foreground mb-1 flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-primary" />
                  You qualify for a table reservation!
                </p>
                <p className="text-xs text-muted-foreground">
                  Your order total of ₱{placedOrder.total_amount.toFixed(2)} meets the ₱{MIN_RESERVATION_AMOUNT} minimum.
                </p>
              </div>
            )}

            <div className="flex flex-col gap-2">
              {canReserve && (
                <button
                  onClick={() => navigate(`/customer/reservations?order_id=${placedOrder.id}`)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
                >
                  <CalendarDays className="h-4 w-4" />
                  Reserve a Table
                </button>
              )}
              <button
                onClick={() => navigate("/customer/orders")}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-border rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                View My Orders
              </button>
              <button
                onClick={() => navigate("/customer/menu")}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Continue Browsing
              </button>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const isPending = createOrder.isPending || createPaymongoLink.isPending;

  return (
    <DashboardLayout role="customer" roleLabel="Customer" roleColor="text-chart-1">
      <div className="p-8 max-w-2xl mx-auto">
        <div className="mb-6">
          <button
            onClick={() => navigate("/customer/cart")}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to cart
          </button>
          <h1 className="text-2xl font-bold text-foreground" data-testid="text-page-title">
            Checkout
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Review your order and choose how to pay.
          </p>
        </div>

        {items.length === 0 ? (
          <div className="text-center py-20 bg-card border border-card-border rounded-xl">
            <ShoppingCart className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm mb-3">Your cart is empty.</p>
            <button
              onClick={() => navigate("/customer/menu")}
              className="text-sm text-primary hover:underline"
            >
              Browse the menu
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Order items */}
            <div className="bg-card border border-card-border rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-border bg-muted/40">
                <h2 className="text-sm font-semibold text-foreground">Order Items</h2>
              </div>
              {items.map((ci, idx) => (
                <div
                  key={ci.menuItem.id}
                  className={`flex items-center justify-between px-5 py-3 ${idx < items.length - 1 ? "border-b border-border" : ""}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                      {ci.menuItem.image_url ? (
                        <img src={ci.menuItem.image_url} alt={ci.menuItem.name} className="h-full w-full object-cover" />
                      ) : (
                        <UtensilsCrossed className="h-4 w-4 text-muted-foreground/30" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{ci.menuItem.name}</p>
                      <p className="text-xs text-muted-foreground">
                        ₱{Number(ci.menuItem.price).toFixed(2)} × {ci.quantity}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-foreground">
                    ₱{(Number(ci.menuItem.price) * ci.quantity).toFixed(2)}
                  </span>
                </div>
              ))}
              <div className="px-5 py-3 border-t border-border bg-muted/20 flex items-center justify-between">
                <span className="text-sm font-bold text-foreground">Total</span>
                <span className="text-base font-bold text-primary">₱{total.toFixed(2)}</span>
              </div>
            </div>

            {/* Notes */}
            <div className="bg-card border border-card-border rounded-xl p-5">
              <label className="block text-sm font-medium text-foreground mb-2">
                Special Instructions <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Allergies, special requests, table preferences…"
                data-testid="input-notes"
                className="w-full text-sm bg-background border border-input rounded-lg px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-ring text-foreground placeholder:text-muted-foreground"
              />
            </div>

            {/* Payment method */}
            <div className="bg-card border border-card-border rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-border bg-muted/40">
                <h2 className="text-sm font-semibold text-foreground">Payment Method</h2>
              </div>
              <div className="p-4 space-y-2">
                <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${paymentMethod === "place_order" ? "border-primary bg-primary/5" : "border-border hover:border-foreground/20"}`}>
                  <input
                    type="radio"
                    name="payment"
                    value="place_order"
                    checked={paymentMethod === "place_order"}
                    onChange={() => setPaymentMethod("place_order")}
                    className="accent-primary"
                  />
                  <Wallet className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Pay at Counter</p>
                    <p className="text-xs text-muted-foreground">Order now, pay when you arrive or at delivery</p>
                  </div>
                </label>

                <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${paymentMethod === "paymongo" ? "border-primary bg-primary/5" : "border-border hover:border-foreground/20"}`}>
                  <input
                    type="radio"
                    name="payment"
                    value="paymongo"
                    checked={paymentMethod === "paymongo"}
                    onChange={() => setPaymentMethod("paymongo")}
                    className="accent-primary"
                  />
                  <CreditCard className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Online Payment</p>
                    <p className="text-xs text-muted-foreground">Pay via GCash, Maya, or card through PayMongo</p>
                  </div>
                </label>
              </div>
            </div>

            {/* Reservation notice */}
            {total >= MIN_RESERVATION_AMOUNT && (
              <div className="flex items-start gap-3 bg-primary/10 border border-primary/20 rounded-lg px-4 py-3">
                <CalendarDays className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <p className="text-xs text-muted-foreground">
                  After placing this order you'll be able to <strong className="text-foreground">reserve a table</strong> — your total meets the ₱{MIN_RESERVATION_AMOUNT} minimum.
                </p>
              </div>
            )}

            <button
              onClick={handlePlaceOrder}
              disabled={isPending || items.length === 0}
              data-testid="button-place-order"
              className="w-full flex items-center justify-center gap-2 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {paymentMethod === "paymongo" ? "Redirecting to PayMongo…" : "Placing Order…"}
                </>
              ) : paymentMethod === "paymongo" ? (
                <>
                  <CreditCard className="h-4 w-4" />
                  Pay ₱{total.toFixed(2)} via PayMongo
                </>
              ) : (
                <>
                  Place Order · ₱{total.toFixed(2)}
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
