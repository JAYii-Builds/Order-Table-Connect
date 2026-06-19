import { useQuery } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { MessageSquare, Star, Loader2 } from "lucide-react";

interface FeedbackItem {
  id: string;
  order_id: string;
  customer_id: string;
  customer_name: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

interface FeedbackResponse {
  average_rating: number | null;
  items: FeedbackItem[];
}

function StarDisplay({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${i <= rating ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground/30"}`}
        />
      ))}
    </div>
  );
}

export default function ManagerFeedbackPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["feedback"],
    queryFn: () => customFetch<FeedbackResponse>("/api/feedback"),
  });

  const items = data?.items ?? [];
  const avg = data?.average_rating;

  return (
    <DashboardLayout role="manager" roleLabel="Manager" roleColor="text-chart-4">
      <div className="p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <MessageSquare className="h-6 w-6" />
            Customer Feedback
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Customer ratings and comments submitted after delivered orders.
          </p>
        </div>

        {avg !== null && avg !== undefined && (
          <div className="mb-6 bg-card border border-card-border rounded-xl p-5 flex items-center gap-4">
            <div className="h-14 w-14 bg-yellow-500/10 rounded-xl flex items-center justify-center shrink-0">
              <Star className="h-7 w-7 text-yellow-400 fill-yellow-400" />
            </div>
            <div>
              <p className="text-3xl font-bold text-foreground">{avg.toFixed(1)}</p>
              <p className="text-sm text-muted-foreground">
                Average rating · {items.length} review{items.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-24 bg-card border border-card-border rounded-xl">
            <MessageSquare className="h-12 w-12 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">No feedback yet.</p>
            <p className="text-muted-foreground text-sm mt-1">
              Customers can leave a rating after their order is delivered.
            </p>
          </div>
        ) : (
          <div className="bg-card border border-card-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Customer</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Order</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Rating</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Comment</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {items.map((fb) => (
                    <tr key={fb.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 font-medium text-foreground">{fb.customer_name}</td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        #{fb.order_id.slice(0, 8).toUpperCase()}
                      </td>
                      <td className="px-4 py-3">
                        <StarDisplay rating={fb.rating} />
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground italic max-w-xs truncate">
                        {fb.comment ? `"${fb.comment}"` : <span className="not-italic text-muted-foreground/50">—</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(fb.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
