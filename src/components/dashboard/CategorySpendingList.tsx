"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { BudgetProgressBar } from "@/components/categories/BudgetProgressBar";
import { CategoryIcon } from "@/components/shared/CategoryIcon";
import type { CategorySpendingRow } from "@/lib/utils/budget";
import { formatCompactAmount, formatCurrency } from "@/lib/utils/formatCurrency";

const MAX_ROWS = 5;

interface CategorySpendingListProps {
  rows: CategorySpendingRow[];
  /** Nama bulan, mis. "Oktober" */
  monthLabel: string;
}

/** Pengeluaran per kategori bulan ini + progres terhadap limit budget. */
export const CategorySpendingList = ({ rows, monthLabel }: CategorySpendingListProps) => {
  const totalSpent = rows.reduce((sum, r) => sum + r.spent, 0);

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-baseline justify-between gap-2 px-4 pb-2 pt-4">
        <h2 className="text-sm font-medium">Pengeluaran {monthLabel}</h2>
        <span className="font-mono text-xs tabular-nums text-muted-foreground">{formatCurrency(totalSpent)}</span>
      </div>

      {rows.length === 0 ? (
        <p className="px-4 pb-4 text-sm text-muted-foreground">Belum ada pengeluaran bulan ini.</p>
      ) : (
        <div className="divide-y divide-border">
          {rows.slice(0, MAX_ROWS).map((row) => (
            <Link
              key={row.categoryId}
              href={`/transactions?categoryId=${row.categoryId}`}
              className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-accent/50"
            >
              <CategoryIcon icon={row.icon} color={row.color} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-medium">{row.name}</p>
                  <span className="shrink-0 font-mono text-xs text-muted-foreground">
                    {row.budget > 0
                      ? `${formatCompactAmount(row.spent)} / ${formatCompactAmount(row.budget)}`
                      : formatCompactAmount(row.spent)}
                  </span>
                </div>
                {row.budget > 0 ? (
                  <BudgetProgressBar spent={row.spent} budget={row.budget} compact />
                ) : (
                  <p className="text-[11px] text-muted-foreground">Tanpa limit</p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      <Link
        href="/budget"
        className="flex items-center justify-center gap-1 border-t border-border py-2.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        {rows.length > MAX_ROWS ? `Lihat semua (${rows.length})` : "Atur budget"}
        <ChevronRight className="h-3.5 w-3.5" />
      </Link>
    </section>
  );
};
