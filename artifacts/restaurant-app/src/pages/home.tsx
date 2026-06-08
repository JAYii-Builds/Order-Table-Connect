import { useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/contexts/auth-context";
import { UtensilsCrossed, CalendarDays, CreditCard, ChevronRight, Star } from "lucide-react";

const ROLE_ROUTES: Record<string, string> = {
  customer: "/customer/dashboard",
  staff: "/staff/dashboard",
  kitchen_staff: "/kitchen/dashboard",
  manager: "/manager/dashboard",
  owner: "/owner/dashboard",
  admin: "/admin/dashboard",
};

export default function HomePage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (user) {
      setLocation(ROLE_ROUTES[user.role] ?? "/login");
    }
  }, [user, setLocation]);

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UtensilsCrossed className="h-6 w-6 text-primary" />
            <span className="font-bold text-lg tracking-tight">TableServe</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <button
                data-testid="button-login"
                className="px-4 py-2 text-sm font-medium text-foreground hover:text-primary transition-colors"
              >
                Sign In
              </button>
            </Link>
            <Link href="/register">
              <button
                data-testid="button-register"
                className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity"
              >
                Get Started
              </button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 py-24 text-center">
        <div className="inline-flex items-center gap-2 bg-accent text-accent-foreground px-3 py-1 rounded-full text-sm font-medium mb-6">
          <Star className="h-3.5 w-3.5" />
          Complete Restaurant Management
        </div>
        <h1 className="text-5xl font-bold tracking-tight text-foreground mb-6 leading-tight">
          Order, Reserve, and Manage<br />
          <span className="text-primary">All in One Place</span>
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
          A full-featured restaurant platform for customers, staff, kitchen teams, and management — each with their own dedicated workspace.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link href="/register">
            <button
              data-testid="button-hero-register"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-md font-medium hover:opacity-90 transition-opacity"
            >
              Create Account <ChevronRight className="h-4 w-4" />
            </button>
          </Link>
          <Link href="/login">
            <button
              data-testid="button-hero-login"
              className="px-6 py-3 border border-border rounded-md font-medium hover:bg-muted transition-colors"
            >
              Sign In
            </button>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              icon: UtensilsCrossed,
              title: "Online Ordering",
              description: "Browse menus, customize orders, and pay seamlessly — all online.",
            },
            {
              icon: CalendarDays,
              title: "Table Reservations",
              description: "Book your table in seconds. No waiting, no phone calls required.",
            },
            {
              icon: CreditCard,
              title: "Multiple Payments",
              description: "Flexible payment options to suit every customer's preference.",
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className="p-6 bg-card border border-card-border rounded-xl hover:shadow-md transition-shadow"
              data-testid={`card-feature-${feature.title.toLowerCase().replace(/\s+/g, "-")}`}
            >
              <div className="h-10 w-10 bg-accent rounded-lg flex items-center justify-center mb-4">
                <feature.icon className="h-5 w-5 text-accent-foreground" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Roles */}
      <section className="bg-sidebar py-16">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-2xl font-bold text-sidebar-foreground text-center mb-10">
            Built for every role in your restaurant
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { role: "Customer", color: "bg-chart-1/20 text-chart-1" },
              { role: "Staff", color: "bg-chart-2/20 text-chart-2" },
              { role: "Kitchen", color: "bg-chart-3/20 text-chart-3" },
              { role: "Manager", color: "bg-chart-4/20 text-chart-4" },
              { role: "Owner", color: "bg-chart-5/20 text-chart-5" },
              { role: "Admin", color: "bg-primary/20 text-primary" },
            ].map((r) => (
              <div
                key={r.role}
                className="text-center p-4 rounded-lg bg-sidebar-accent"
                data-testid={`badge-role-${r.role.toLowerCase()}`}
              >
                <div className={`inline-flex items-center justify-center w-10 h-10 rounded-full mb-2 ${r.color} text-sm font-bold`}>
                  {r.role[0]}
                </div>
                <div className="text-xs font-medium text-sidebar-foreground">{r.role}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        <p>TableServe — Web-based Ordering and Table Reservation System</p>
      </footer>
    </div>
  );
}
