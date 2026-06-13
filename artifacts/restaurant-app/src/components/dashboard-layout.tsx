import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/auth-context";
import { useLogout } from "@workspace/api-client-react";
import { useCart } from "@/contexts/cart-context";
import {
  UtensilsCrossed,
  LogOut,
  User,
  LayoutDashboard,
  ChevronRight,
  Users,
  ShoppingBag,
  BookOpen,
  ShoppingCart,
  CalendarDays,
  ClipboardList,
  MonitorSmartphone,
  UserPlus,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  badge?: number;
}

interface DashboardLayoutProps {
  children: ReactNode;
  role: string;
  roleLabel: string;
  roleColor: string;
}

export function DashboardLayout({
  children,
  role,
  roleLabel,
  roleColor,
}: DashboardLayoutProps) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const logoutMutation = useLogout();
  const { itemCount } = useCart();

  function handleLogout() {
    logoutMutation.mutate(undefined, { onSettled: () => logout() });
  }

  const ROLE_NAV: Record<string, NavItem[]> = {
    customer: [
      { label: "Dashboard", href: "/customer/dashboard", icon: LayoutDashboard },
      { label: "Menu", href: "/customer/menu", icon: BookOpen },
      { label: "My Cart", href: "/customer/cart", icon: ShoppingCart, badge: itemCount || undefined },
      { label: "My Orders", href: "/customer/orders", icon: ClipboardList },
      { label: "Reservations", href: "/customer/reservations", icon: CalendarDays },
    ],
    staff: [
      { label: "Dashboard",    href: "/staff/dashboard", icon: LayoutDashboard },
      { label: "Walk-in Order", href: "/staff/walkin",   icon: UserPlus },
      { label: "POS",          href: "/pos",             icon: MonitorSmartphone },
    ],
    kitchen: [
      { label: "Dashboard", href: "/kitchen/dashboard", icon: LayoutDashboard },
    ],
    manager: [
      { label: "Dashboard", href: "/manager/dashboard", icon: LayoutDashboard },
      { label: "Menu",      href: "/manager/menu",      icon: ShoppingBag },
      { label: "POS",       href: "/pos",               icon: MonitorSmartphone },
    ],
    owner: [
      { label: "Dashboard", href: "/owner/dashboard", icon: LayoutDashboard },
    ],
    admin: [
      { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
      { label: "Users",     href: "/admin/users",     icon: Users },
      { label: "POS",       href: "/pos",             icon: MonitorSmartphone },
    ],
  };

  const navItems = ROLE_NAV[role] ?? [
    { label: "Dashboard", href: `/${role}/dashboard`, icon: LayoutDashboard },
  ];

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-sidebar flex flex-col shrink-0">
        {/* Logo */}
        <div className="h-16 px-6 flex items-center gap-2 border-b border-sidebar-border">
          <UtensilsCrossed className="h-5 w-5 text-primary" />
          <span className="font-bold text-sidebar-foreground tracking-tight">TableServe</span>
        </div>

        {/* Role badge */}
        <div className="px-4 py-3 mx-3 mt-4 rounded-lg bg-sidebar-accent">
          <div className="text-xs text-sidebar-foreground/50 uppercase tracking-wider font-medium mb-0.5">
            Signed in as
          </div>
          <div className={`text-sm font-semibold ${roleColor}`}>{roleLabel}</div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <div
                  data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
                  className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                    isActive
                      ? "bg-sidebar-primary text-sidebar-primary-foreground"
                      : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                  }`}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1">{item.label}</span>
                  {item.badge ? (
                    <span className="bg-primary text-primary-foreground text-xs font-bold rounded-full h-5 min-w-5 flex items-center justify-center px-1.5">
                      {item.badge > 99 ? "99+" : item.badge}
                    </span>
                  ) : isActive ? (
                    <ChevronRight className="h-3.5 w-3.5 opacity-60" />
                  ) : null}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* User footer */}
        <div className="p-3 border-t border-sidebar-border">
          <div className="flex items-center gap-3 px-3 py-2 rounded-md bg-sidebar-accent mb-2">
            <div className="h-7 w-7 bg-primary/20 rounded-full flex items-center justify-center shrink-0">
              <User className="h-3.5 w-3.5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div
                className="text-xs font-medium text-sidebar-foreground truncate"
                data-testid="text-user-name"
              >
                {user?.full_name}
              </div>
              <div className="text-xs text-sidebar-foreground/50 truncate">{user?.email}</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            disabled={logoutMutation.isPending}
            data-testid="button-logout"
            className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
