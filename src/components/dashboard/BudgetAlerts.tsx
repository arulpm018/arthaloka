"use client";

import { AlertTriangle } from "lucide-react";
import { BudgetStatus } from "@/types";
import { cn } from "@/lib/utils/cn";
import { MemeReaction } from "@/components/shared/MemeReaction";
import { getMoodForBudgets } from "@/lib/utils/memeMood";

interface BudgetAlertsProps {
  budgets: BudgetStatus[];
}

export const BudgetAlerts = ({ budgets }: BudgetAlertsProps) => {
  const alerts = budgets.filter(
    (b) => b.status === "warning" || b.status === "over"
  );
  if (alerts.length === 0) return null;

  // Mood escalates: 1 warning → thinking, 2+ warning → stress, any over → panic.
  const mood = getMoodForBudgets(alerts);

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-warning" />
          <h3 className="text-sm font-medium">Budget Alerts</h3>
        </div>
        {/* Reaction GIF — fallback ke emoji unicode kalau aset belum ada.
            Seed by mood + count → stabil dalam 1 render cycle, ganti kalau
            severity berubah. */}
        <MemeReaction
          mood={mood}
          size="sm"
          seed={`budget-${mood}-${alerts.length}`}
        />
      </div>
      <div className="space-y-2">
        {alerts.map((b) => (
          <div key={b.categoryId} className="flex items-center gap-3">
            <span className="text-base">{b.categoryIcon}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium truncate">
                  {b.categoryName}
                </span>
                <span
                  className={cn(
                    "text-xs font-mono font-medium",
                    b.status === "over" ? "text-expense" : "text-warning"
                  )}
                >
                  {b.percentage}%
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    b.status === "over" ? "bg-expense" : "bg-warning"
                  )}
                  style={{ width: `${Math.min(b.percentage, 100)}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
