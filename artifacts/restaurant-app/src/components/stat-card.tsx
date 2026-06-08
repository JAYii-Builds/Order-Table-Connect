import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  colorClass?: string;
  testId?: string;
}

export function StatCard({
  title,
  value,
  icon: Icon,
  description,
  colorClass = "bg-primary/10 text-primary",
  testId,
}: StatCardProps) {
  return (
    <div
      className="bg-card border border-card-border rounded-xl p-5 hover:shadow-sm transition-shadow"
      data-testid={testId}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${colorClass}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className="text-2xl font-bold text-foreground mb-0.5" data-testid={testId ? `${testId}-value` : undefined}>
        {value}
      </div>
      <div className="text-sm font-medium text-foreground/70">{title}</div>
      {description && (
        <div className="text-xs text-muted-foreground mt-1">{description}</div>
      )}
    </div>
  );
}
