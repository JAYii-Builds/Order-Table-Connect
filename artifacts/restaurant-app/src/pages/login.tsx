import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { UtensilsCrossed, Eye, EyeOff, Loader2 } from "lucide-react";
import { useLogin } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/auth-context";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginValues = z.infer<typeof loginSchema>;

const ROLE_ROUTES: Record<string, string> = {
  customer: "/customer/dashboard",
  staff: "/staff/dashboard",
  kitchen_staff: "/kitchen/dashboard",
  manager: "/manager/dashboard",
  owner: "/owner/dashboard",
  admin: "/admin/dashboard",
};

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();
  const loginMutation = useLogin();

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  function onSubmit(values: LoginValues) {
    loginMutation.mutate(
      { data: values },
      {
        onSuccess: (res) => {
          login(res);
          const route = ROLE_ROUTES[res.user.role] ?? "/";
          setLocation(route);
        },
        onError: (err) => {
          const message =
            err && typeof err === "object" && "data" in err
              ? (err.data as { error?: string })?.error ?? "Login failed"
              : "Login failed. Please try again.";
          toast({ title: "Login failed", description: message, variant: "destructive" });
        },
      }
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-sidebar flex-col justify-between p-12">
        <div className="flex items-center gap-2">
          <UtensilsCrossed className="h-6 w-6 text-primary" />
          <span className="text-sidebar-foreground font-bold text-lg tracking-tight">TableServe</span>
        </div>
        <div>
          <h2 className="text-4xl font-bold text-sidebar-foreground leading-tight mb-4">
            Welcome back to your workspace
          </h2>
          <p className="text-sidebar-foreground/60 text-lg leading-relaxed">
            Sign in to access your personalized dashboard — orders, reservations, and everything your role needs.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[
            { role: "Customer", desc: "Order & reserve" },
            { role: "Staff", desc: "Manage tables" },
            { role: "Kitchen", desc: "Track orders" },
            { role: "Manager", desc: "Oversee ops" },
          ].map((r) => (
            <div key={r.role} className="bg-sidebar-accent rounded-lg p-3">
              <div className="text-sm font-semibold text-sidebar-foreground">{r.role}</div>
              <div className="text-xs text-sidebar-foreground/50">{r.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <UtensilsCrossed className="h-6 w-6 text-primary" />
            <span className="font-bold text-lg">TableServe</span>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-foreground mb-1">Sign in to your account</h1>
            <p className="text-muted-foreground text-sm">
              Enter your credentials to access your dashboard
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="email"
                        placeholder="you@example.com"
                        autoComplete="email"
                        data-testid="input-email"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          {...field}
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          autoComplete="current-password"
                          data-testid="input-password"
                        />
                        <button
                          type="button"
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          onClick={() => setShowPassword(!showPassword)}
                          data-testid="button-toggle-password"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full"
                disabled={loginMutation.isPending}
                data-testid="button-submit"
              >
                {loginMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>
          </Form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link href="/register" className="text-primary font-medium hover:underline" data-testid="link-register">
              Create one here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
