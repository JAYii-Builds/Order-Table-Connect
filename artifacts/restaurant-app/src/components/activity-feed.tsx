import { Clock, Info, ShieldCheck, Activity } from "lucide-react";

interface ActivityItem {
  id: string;
  description: string;
  timestamp: string;
  type: string;
}

interface ActivityFeedProps {
  items: ActivityItem[];
}

const TYPE_ICONS: Record<string, typeof Clock> = {
  info: Info,
  system: Activity,
  auth: ShieldCheck,
  default: Clock,
};

const TYPE_COLORS: Record<string, string> = {
  info: "bg-chart-3/15 text-chart-3",
  system: "bg-chart-2/15 text-chart-2",
  auth: "bg-primary/15 text-primary",
  default: "bg-muted text-muted-foreground",
};

function formatTimestamp(ts: string): string {
  try {
    return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

export function ActivityFeed({ items }: ActivityFeedProps) {
  if (!items?.length) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        No recent activity
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const Icon = TYPE_ICONS[item.type] ?? TYPE_ICONS.default;
        const colorClass = TYPE_COLORS[item.type] ?? TYPE_COLORS.default;

        return (
          <div
            key={item.id}
            className="flex items-start gap-3"
            data-testid={`activity-item-${item.id}`}
          >
            <div className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${colorClass}`}>
              <Icon className="h-3.5 w-3.5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground leading-snug">{item.description}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{formatTimestamp(item.timestamp)}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
