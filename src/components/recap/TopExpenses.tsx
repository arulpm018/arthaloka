"use client";

import { format } from "date-fns";
import { id } from "date-fns/locale";
import { Transaction } from "@/types";
import { CategoryIcon } from "@/components/shared/CategoryIcon";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import { useAppStore } from "@/store/useAppStore";

interface TopExpensesProps {
  transactions: Transaction[];
  limit?: number;
}

export const TopExpenses = ({ transactions, limit = 5 }: TopExpensesProps) => {
  const openSheet = useAppStore((s) => s.openSheet);

  const top = transactions
    .filter((t) => t.type === "expense")
    .sort((a, b) => b.amount - a.amount)
    .slice(0, limit);

  if (top.length === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <h3 className="text-sm font-medium">Pengeluaran Terbesar</h3>

      <div className="divide-y divide-border">
        {top.map((tx, i) => (
          <button
            key={tx.transactionId}
            onClick={() => openSheet(tx.type, tx)}
            className="flex w-full items-center gap-3 py-2.5 -mx-1 px-1 text-left transition-colors hover:bg-accent/50 active:bg-accent rounded-lg"
          >
            <span className="w-5 text-xs font-mono text-muted-foreground tabular-nums shrink-0">
              {i + 1}
            </span>
            <CategoryIcon icon={tx.categoryIcon} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{tx.name}</p>
              <p className="text-[11px] text-muted-foreground truncate">
                {tx.categoryName} •{" "}
                {format(tx.date.toDate(), "d MMM", { locale: id })}
              </p>
            </div>
            <span className="text-sm font-mono font-medium tabular-nums text-expense shrink-0">
              -{formatCurrency(tx.amount)}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};
