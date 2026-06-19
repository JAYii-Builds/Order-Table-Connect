import { DashboardLayout } from "@/components/dashboard-layout";
import { MessageSquare } from "lucide-react";

export default function ManagerFeedbackPage() {
  return (
    <DashboardLayout role="manager" roleLabel="Manager" roleColor="text-chart-4">
      <div className="p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <MessageSquare className="h-6 w-6" />
            Customer Feedback
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Monitor customer reviews and satisfaction ratings.
          </p>
        </div>

        <div className="text-center py-24 bg-card border border-card-border rounded-xl">
          <MessageSquare className="h-12 w-12 text-muted-foreground/20 mx-auto mb-3" />
          <p className="text-muted-foreground font-medium">No feedback yet.</p>
          <p className="text-muted-foreground text-sm mt-1">
            Customer reviews will appear here once the feedback system is live.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
