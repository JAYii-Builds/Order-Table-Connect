import { useCart } from "@/contexts/cart-context";
import { DashboardLayout } from "@/components/dashboard-layout";
import { useLocation } from "wouter";
import {
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  UtensilsCrossed,
  ArrowRight,
  BookOpen,
} from "lucide-react";

export default function CustomerCartPage() {
  const { items, removeItem, updateQuantity, clearCart, total } = useCart();
  const [, navigate] = useLocation();

  const MIN_RESERVATION_AMOUNT = 200;

  return (
    <DashboardLayout role="customer" roleLabel="Customer" roleColor="text-chart-1">
      <div className="p-8 max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2" data-testid="text-page-title">
            <ShoppingCart className="h-6 w-6" />
            My Cart
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Review your items before placing an order.
          </p>
        </div>

        {items.length === 0 ? (
          <div className="text-center py-24 bg-card border border-card-border rounded-xl">
            <UtensilsCrossed className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground font-medium mb-1">Your cart is empty</p>
            <p className="text-muted-foreground/60 text-sm mb-5">Browse the menu to add items.</p>
            <button
              onClick={() => navigate("/customer/menu")}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:opacity-90 transition-opacity"
            >
              <BookOpen className="h-4 w-4" />
              Browse Menu
            </button>
          </div>
        ) : (
          <>
            <div className="bg-card border border-card-border rounded-xl overflow-hidden mb-5">
              {items.map((cartItem, idx) => (
                <div
                  key={cartItem.menuItem.id}
                  className={`flex items-center gap-4 p-4 ${idx < items.length - 1 ? "border-b border-border" : ""}`}
                  data-testid={`cart-item-${cartItem.menuItem.id}`}
                >
                  {/* Image / icon */}
                  <div className="h-14 w-14 rounded-lg bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                    {cartItem.menuItem.image_url ? (
                      <img
                        src={cartItem.menuItem.image_url}
                        alt={cartItem.menuItem.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <UtensilsCrossed className="h-5 w-5 text-muted-foreground/30" />
                    )}
                  </div>

                  {/* Name + price */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground text-sm truncate">
                      {cartItem.menuItem.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      ₱{Number(cartItem.menuItem.price).toFixed(2)} each
                    </p>
                  </div>

                  {/* Quantity controls */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQuantity(cartItem.menuItem.id, cartItem.quantity - 1)}
                      data-testid={`button-decrease-${cartItem.menuItem.id}`}
                      className="h-7 w-7 flex items-center justify-center rounded-md border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="w-6 text-center text-sm font-semibold text-foreground">
                      {cartItem.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(cartItem.menuItem.id, cartItem.quantity + 1)}
                      data-testid={`button-increase-${cartItem.menuItem.id}`}
                      className="h-7 w-7 flex items-center justify-center rounded-md border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Subtotal */}
                  <div className="w-20 text-right">
                    <span className="text-sm font-semibold text-primary">
                      ₱{(Number(cartItem.menuItem.price) * cartItem.quantity).toFixed(2)}
                    </span>
                  </div>

                  {/* Remove */}
                  <button
                    onClick={() => removeItem(cartItem.menuItem.id)}
                    data-testid={`button-remove-${cartItem.menuItem.id}`}
                    className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Summary */}
            <div className="bg-card border border-card-border rounded-xl p-5 mb-5">
              <div className="flex items-center justify-between text-sm mb-2 text-muted-foreground">
                <span>Subtotal ({items.reduce((n, i) => n + i.quantity, 0)} items)</span>
                <span>₱{total.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between font-bold text-lg text-foreground border-t border-border pt-3">
                <span>Total</span>
                <span className="text-primary">₱{total.toFixed(2)}</span>
              </div>
              {total >= MIN_RESERVATION_AMOUNT && (
                <p className="text-xs text-chart-2 mt-2 flex items-center gap-1">
                  ✓ Eligible for table reservation (₱{MIN_RESERVATION_AMOUNT}+ order)
                </p>
              )}
              {total > 0 && total < MIN_RESERVATION_AMOUNT && (
                <p className="text-xs text-muted-foreground mt-2">
                  Add ₱{(MIN_RESERVATION_AMOUNT - total).toFixed(2)} more to unlock table reservations.
                </p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={clearCart}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium border border-border rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <Trash2 className="h-4 w-4" />
                Clear Cart
              </button>
              <button
                onClick={() => navigate("/customer/checkout")}
                data-testid="button-checkout"
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
              >
                Proceed to Checkout
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
