import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import { customFetch, getGetMeQueryKey } from "@workspace/api-client-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { User, Phone, Mail, Lock, Loader2, CheckCircle2 } from "lucide-react";

function Field({
  label,
  icon: Icon,
  type = "text",
  value,
  onChange,
  placeholder,
  disabled,
}: {
  label: string;
  icon: React.ElementType;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-foreground mb-1.5">{label}</label>
      <div className="relative">
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full text-sm bg-background border border-input rounded-lg pl-10 pr-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-ring text-foreground placeholder:text-muted-foreground disabled:opacity-60"
        />
      </div>
    </div>
  );
}

export default function CustomerProfilePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [fullName, setFullName] = useState(user?.full_name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");

  useEffect(() => {
    if (user) {
      setFullName(user.full_name ?? "");
      setPhone(user.phone ?? "");
    }
  }, [user]);

  const profileMutation = useMutation({
    mutationFn: () =>
      customFetch(`/api/users/${user!.id}`, {
        method: "PATCH",
        body: JSON.stringify({ full_name: fullName.trim(), phone: phone.trim() || null }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
      toast({ title: "Profile updated" });
    },
    onError: (err: unknown) =>
      toast({ title: "Update failed", description: err instanceof Error ? err.message : "Error", variant: "destructive" }),
  });

  const passwordMutation = useMutation({
    mutationFn: () =>
      customFetch("/api/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ current_password: currentPw, new_password: newPw }),
      }),
    onSuccess: () => {
      toast({ title: "Password changed" });
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
    },
    onError: (err: unknown) =>
      toast({ title: "Password change failed", description: err instanceof Error ? err.message : "Error", variant: "destructive" }),
  });

  function handleProfileSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim()) return;
    profileMutation.mutate();
  }

  function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!currentPw || !newPw || !confirmPw) return;
    if (newPw !== confirmPw) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    passwordMutation.mutate();
  }

  return (
    <DashboardLayout role="customer" roleLabel="Customer" roleColor="text-chart-1">
      <div className="p-8 max-w-lg mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <User className="h-6 w-6" />
            My Profile
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Update your personal information and password.</p>
        </div>

        {/* Profile form */}
        <div className="bg-card border border-card-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border bg-muted/40">
            <h2 className="text-sm font-semibold text-foreground">Personal Information</h2>
          </div>
          <form onSubmit={handleProfileSubmit} className="p-5 space-y-4">
            <Field label="Full Name" icon={User} value={fullName} onChange={setFullName} placeholder="Your full name" />
            <Field label="Email" icon={Mail} value={user?.email ?? ""} onChange={() => {}} disabled />
            <Field label="Phone (optional)" icon={Phone} value={phone} onChange={setPhone} placeholder="09XXXXXXXXX" />
            <button
              type="submit"
              disabled={profileMutation.isPending || !fullName.trim()}
              className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {profileMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Save Changes
            </button>
          </form>
        </div>

        {/* Password form */}
        <div className="bg-card border border-card-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border bg-muted/40">
            <h2 className="text-sm font-semibold text-foreground">Change Password</h2>
          </div>
          <form onSubmit={handlePasswordSubmit} className="p-5 space-y-4">
            <Field label="Current Password" icon={Lock} type="password" value={currentPw} onChange={setCurrentPw} placeholder="Your current password" />
            <Field label="New Password" icon={Lock} type="password" value={newPw} onChange={setNewPw} placeholder="At least 6 characters" />
            <Field label="Confirm New Password" icon={Lock} type="password" value={confirmPw} onChange={setConfirmPw} placeholder="Repeat new password" />
            <button
              type="submit"
              disabled={passwordMutation.isPending || !currentPw || !newPw || !confirmPw}
              className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {passwordMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
              Change Password
            </button>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}
