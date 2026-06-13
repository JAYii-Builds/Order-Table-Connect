import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/auth-context";
import { CartProvider } from "@/contexts/cart-context";
import { ProtectedRoute } from "@/components/protected-route";
import NotFound from "@/pages/not-found";
import HomePage from "@/pages/home";
import LoginPage from "@/pages/login";
import RegisterPage from "@/pages/register";
import UnauthorizedPage from "@/pages/unauthorized";
import CustomerDashboard from "@/pages/customer/dashboard";
import CustomerMenuPage from "@/pages/customer/menu";
import CustomerCartPage from "@/pages/customer/cart";
import CustomerCheckoutPage from "@/pages/customer/checkout";
import CustomerOrdersPage from "@/pages/customer/orders";
import CustomerReservationsPage from "@/pages/customer/reservations";
import StaffDashboard from "@/pages/staff/dashboard";
import StaffPosPage from "@/pages/staff/pos";
import StaffOrdersPage from "@/pages/staff/orders";
import KitchenDashboard from "@/pages/kitchen/dashboard";
import ManagerDashboard from "@/pages/manager/dashboard";
import ManagerMenuPage from "@/pages/manager/menu";
import OwnerDashboard from "@/pages/owner/dashboard";
import AdminDashboard from "@/pages/admin/dashboard";
import AdminUsersPage from "@/pages/admin/users";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 1000 * 30 },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/login" component={LoginPage} />
      <Route path="/register" component={RegisterPage} />
      <Route path="/unauthorized" component={UnauthorizedPage} />

      <Route path="/customer/dashboard">
        <ProtectedRoute allowedRoles={["customer"]}>
          <CustomerDashboard />
        </ProtectedRoute>
      </Route>
      <Route path="/customer/menu">
        <ProtectedRoute allowedRoles={["customer"]}>
          <CustomerMenuPage />
        </ProtectedRoute>
      </Route>
      <Route path="/customer/cart">
        <ProtectedRoute allowedRoles={["customer"]}>
          <CustomerCartPage />
        </ProtectedRoute>
      </Route>
      <Route path="/customer/checkout">
        <ProtectedRoute allowedRoles={["customer"]}>
          <CustomerCheckoutPage />
        </ProtectedRoute>
      </Route>
      <Route path="/customer/orders">
        <ProtectedRoute allowedRoles={["customer"]}>
          <CustomerOrdersPage />
        </ProtectedRoute>
      </Route>
      <Route path="/customer/reservations">
        <ProtectedRoute allowedRoles={["customer"]}>
          <CustomerReservationsPage />
        </ProtectedRoute>
      </Route>

      <Route path="/staff/dashboard">
        <ProtectedRoute allowedRoles={["staff"]}>
          <StaffDashboard />
        </ProtectedRoute>
      </Route>
      <Route path="/staff/pos">
        <ProtectedRoute allowedRoles={["staff"]}>
          <StaffPosPage />
        </ProtectedRoute>
      </Route>
      <Route path="/staff/orders">
        <ProtectedRoute allowedRoles={["staff"]}>
          <StaffOrdersPage />
        </ProtectedRoute>
      </Route>

      <Route path="/kitchen/dashboard">
        <ProtectedRoute allowedRoles={["kitchen_staff"]}>
          <KitchenDashboard />
        </ProtectedRoute>
      </Route>

      <Route path="/manager/dashboard">
        <ProtectedRoute allowedRoles={["manager"]}>
          <ManagerDashboard />
        </ProtectedRoute>
      </Route>
      <Route path="/manager/menu">
        <ProtectedRoute allowedRoles={["manager"]}>
          <ManagerMenuPage />
        </ProtectedRoute>
      </Route>

      <Route path="/owner/dashboard">
        <ProtectedRoute allowedRoles={["owner"]}>
          <OwnerDashboard />
        </ProtectedRoute>
      </Route>

      <Route path="/admin/dashboard">
        <ProtectedRoute allowedRoles={["admin"]}>
          <AdminDashboard />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/users">
        <ProtectedRoute allowedRoles={["admin"]}>
          <AdminUsersPage />
        </ProtectedRoute>
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthProvider>
            <CartProvider>
              <Router />
            </CartProvider>
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
