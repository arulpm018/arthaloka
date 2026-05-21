import { cn } from "@/lib/utils/cn";
import { Progress } from "@/components/ui/progress";

interface BudgetProgressBarProps {
  spent: number;
  budget: number;
  compact?: boolean;
  categoryName?: string;
  icon?: string;
}

export const BudgetProgressBar = ({
  spent,
  budget,
  compact,
  categoryName,
  icon,
}: BudgetProgressBarProps) => {
  const percentage = budget > 0 ? Math.round((spent / budget) * 100) : 0;
  const status =
    percentage >= 100 ? "over" : percentage >= 75 ? "warning" : "normal";

  const colorClass = {
    normal: "bg-income",
    warning: "bg-warning",
    over: "bg-expense",
  }[status];

  if (compact) {
    return (
      <div className="flex items-center gap-2 mt-0.5">
        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all", colorClass)}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
        <span className="text-xs text-muted-foreground">{percentage}%</span>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {categoryName && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {icon && <span>{icon}</span>}
            <span className="text-sm font-medium">{categoryName}</span>
          </div>
          <span className="text-xs text-muted-foreground">{percentage}%</span>
        </div>
      )}
      <Progress value={Math.min(percentage, 100)} className="h-2" />
      <p className="text-xs text-muted-foreground">
        Rp {spent.toLocaleString("id-ID")} / Rp{" "}
        {budget.toLocaleString("id-ID")}
      </p>
    </div>
  );
};
