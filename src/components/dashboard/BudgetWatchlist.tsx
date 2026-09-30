"use client";

import Link from "next/link";
import { BudgetProgressBar } from "@/components/categories/BudgetProgressBar";
import { CategoryIcon } from "@/components/shared/CategoryIcon";
import { formatCompactAmount } from "@/lib/utils/formatCurrency";
import type { BudgetStatus } from "@/types";

const MAX_ITEMS = 3;

/** Kategori yang sudah ≥80% budget — maksimal 3, paling kritis dulu. */
export const BudgetWatchlist = ({ items }: { items: BudgetStatus[] }) => {
  const watched = items
    .filter((i) => i.status !== "normal")
    .sort((a, b) => b.percentage - a.percentage)
    .slice(0, MAX_ITEMS);

  if (watched.length === 0) return null;

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-sm font-medium">Perlu diperhatikan</h2>
        <Link href="/budget" className="text-xs text-muted-foreground hover:text-foreground">
          Lihat semua
        </Link>
      </div>
      <div className="divide-y divide-border rounded-xl border border-border bg-card">
        {watched.map((b) => (
          <Link
            key={b.categoryId}
            href={`/transactions?categoryId=${b.categoryId}`}
            className="flex items-center gap-3 p-3 transition-colors hover:bg-accent/50"
          >
            <CategoryIcon icon={b.categoryIcon} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-medium">{b.categoryName}</p>
                <span className="shrink-0 font-mono text-xs text-muted-foreground">
                  {formatCompactAmount(b.spent)} / {formatCompactAmount(b.budgetAmount)}
                </span>
              </div>
              <BudgetProgressBar spent={b.spent} budget={b.budgetAmount} compact />
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
};
