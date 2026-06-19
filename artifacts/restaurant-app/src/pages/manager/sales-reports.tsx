import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp, ShoppingBag, Loader2, BarChart2, Award } from "lucide-react";

type Period = "today" | "week" | "month";

interface DailyRow {
  day: string;
  revenue: number;
  order_count: number;
}

interface TopItem {
  menu_item_id: string;
  name: string;
  quantity: number;
  revenue: number;
}

interface SalesReport {
  period: string;
  total_revenue: number;
  total_orders: number;
  daily: DailyRow[];
  top_items: TopItem[];
}

const PERIOD_LABELS: Record<Period, string> = {
  today: "Today",
  week: "Last 7 Days",
  month: "Last 30 Days",
};

function fetchReport(period: Period): Promise<SalesReport> {
  return customFetch<SalesReport>(`/api/sales/reports?period=${period}`);
}

export default function ManagerSalesReportsPage() {
  const [period, setPeriod] = useState<Period>("today");

  const { data, isLoading } = useQuery({
    queryKey: ["sales-reports", period],
    queryFn: () => fetchReport(period),
  });

  return (
    <DashboardLayout role="manager" roleLabel="Manager" roleColor="text-chart-4">
      <div className="p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <BarChart2 className="h-6 w-6" />
            Sales Reports
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Revenue overview and top-selling menu items.
          </p>
        </div>

        {/* Period toggle */}
        <div className="flex gap-2 mb-6">
          {(["today", "week", "month"] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                period === p
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : data ? (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-card border border-card-border rounded-xl p-5">
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                  <TrendingUp className="h-4 w-4" />
                  Total Revenue
                </div>
                <p className="text-2xl font-bold text-foreground">
                  ₱{data.total_revenue.toFixed(2)}
                </p>
              </div>
              <div className="bg-card border border-card-border rounded-xl p-5">
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                  <ShoppingBag className="h-4 w-4" />
                  Delivered Orders
                </div>
                <p className="text-2xl font-bold text-foreground">{data.total_orders}</p>
              </div>
            </div>

            {/* Revenue chart */}
            <div className="bg-card border border-card-border rounded-xl p-5 mb-6">
              <h2 className="text-sm font-semibold text-foreground mb-4">Daily Revenue (₱)</h2>
              {data.daily.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-10">No data for this period.</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={data.daily} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="day"
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      tickFormatter={(v: string) => v.slice(5)}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      tickFormatter={(v: number) => `₱${v}`}
                      width={60}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                      formatter={(v: number) => [`₱${v.toFixed(2)}`, "Revenue"]}
                    />
                    <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Orders chart */}
            <div className="bg-card border border-card-border rounded-xl p-5 mb-6">
              <h2 className="text-sm font-semibold text-foreground mb-4">Daily Order Count</h2>
              {data.daily.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-10">No data for this period.</p>
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={data.daily} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="day"
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      tickFormatter={(v: string) => v.slice(5)}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      allowDecimals={false}
                      width={40}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                      formatter={(v: number) => [v, "Orders"]}
                    />
                    <Bar dataKey="order_count" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Top items */}
            <div className="bg-card border border-card-border rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-border flex items-center gap-2">
                <Award className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold text-foreground">Top Items by Quantity Sold</h2>
              </div>
              {data.top_items.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-10">No items sold in this period.</p>
              ) : (
                <div className="divide-y divide-border">
                  {data.top_items.map((item, i) => (
                    <div key={item.menu_item_id} className="flex items-center gap-4 px-5 py-3">
                      <span className="w-6 text-center text-xs font-bold text-muted-foreground">
                        {i + 1}
                      </span>
                      <span className="flex-1 text-sm font-medium text-foreground">{item.name}</span>
                      <span className="text-xs text-muted-foreground">×{item.quantity}</span>
                      <span className="text-sm font-semibold text-foreground min-w-[70px] text-right">
                        ₱{item.revenue.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : null}
      </div>
    </DashboardLayout>
  );
}
