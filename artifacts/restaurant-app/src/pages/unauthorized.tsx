import { Link } from "wouter";
import { ShieldX, ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";

const ROLE_ROUTES: Record<string, string> = {
  customer: "/customer/dashboard",
  staff: "/staff/dashboard",
  kitchen_staff: "/kitchen/dashboard",
  manager: "/manager/dashboard",
  owner: "/owner/dashboard",
  admin: "/admin/dashboard",
};

export default function UnauthorizedPage() {
  const { user } = useAuth();
  const dashboardRoute = user ? ROLE_ROUTES[user.role] ?? "/" : "/login";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <div className="inline-flex items-center justify-center h-16 w-16 bg-destructive/10 rounded-full mb-6">
          <ShieldX className="h-8 w-8 text-destructive" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2" data-testid="text-unauthorized-title">
          Access Denied
        </h1>
        <p className="text-muted-foreground mb-8">
          You don't have permission to view this page. This area is restricted to a different role.
        </p>
        <Link href={dashboardRoute}>
          <button
            data-testid="button-go-to-dashboard"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <ArrowLeft className="h-4 w-4" />
            Go to my dashboard
          </button>
        </Link>
      </div>
    </div>
  );
}
