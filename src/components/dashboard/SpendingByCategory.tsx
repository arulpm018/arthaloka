"use client";

import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { BudgetStatus } from "@/types";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import { CategoryIcon } from "@/components/shared/CategoryIcon";
import { cn } from "@/lib/utils/cn";

interface SpendingByCategoryProps {
  budgets: BudgetStatus[];
}

export const SpendingByCategory = ({ budgets }: SpendingByCategoryProps) => {
  const router = useRouter();

  const withSpending = budgets.filter((b) => b.spent > 0);
  if (withSpending.length === 0) return null;

  const sorted = [...withSpending].sort((a, b) => b.spent - a.spent);

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-4">
      <h3 className="text-sm font-medium">Pengeluaran per Kategori</h3>

      <div className="space-y-4">
        {sorted.map((item) => {
          const barPercent = item.budgetAmount > 0
            ? Math.min((item.spent / item.budgetAmount) * 100, 100)
            : 100;
          const isOver = item.spent > item.budgetAmount && item.budgetAmount > 0;

          return (
            <button
              key={item.categoryId}
              onClick={() =>
                router.push(`/transactions?categoryId=${item.categoryId}`)
              }
              className="w-full text-left rounded-lg -mx-1 px-1 py-1 transition-colors hover:bg-accent/50 active:bg-accent"
              aria-label={`Lihat transaksi kategori ${item.categoryName}`}
            >
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <CategoryIcon icon={item.categoryIcon} size="sm" />
                  <span className="text-sm font-medium flex-1 truncate">
                    {item.categoryName}
                  </span>
                  <span className="text-sm font-mono font-medium tabular-nums">
                    {formatCurrency(item.spent)}
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        isOver && "animate-pulse"
                      )}
                      style={{
                        width: `${barPercent}%`,
                        backgroundColor: isOver ? "#E03E3E" : "#64748b",
                      }}
                    />
                  </div>
                  {item.budgetAmount > 0 && (
                    <span className={cn(
                      "text-[11px] font-mono tabular-nums whitespace-nowrap",
                      isOver ? "text-expense font-medium" : "text-muted-foreground"
                    )}>
                      {item.percentage}%
                    </span>
                  )}
                </div>

                {item.budgetAmount > 0 && (
                  <p className="text-[11px] text-muted-foreground">
                    Budget: {formatCurrency(item.budgetAmount)}
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
