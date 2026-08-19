"use client";

import { ReceiptText } from "lucide-react";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import type { TransactionSummary } from "@/hooks/useTransactionSummary";

interface TransactionSummaryCardProps {
  summary: TransactionSummary;
  isLoading: boolean;
  showExpense?: boolean;
  showIncome?: boolean;
}

export const TransactionSummaryCard = ({
  summary,
  isLoading,
  showExpense = true,
  showIncome = true,
}: TransactionSummaryCardProps) => {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3">
      <div className="flex items-center gap-2 min-w-0">
        <ReceiptText className="h-4 w-4 text-muted-foreground shrink-0" />
        <span className="text-sm font-medium tabular-nums truncate">
          {isLoading ? "Memuat…" : `${summary.count} transaksi`}
        </span>
      </div>
      {!isLoading && (
        <div className="flex items-center gap-3 text-xs font-mono font-medium tabular-nums shrink-0">
          {showExpense && (
            <span className="text-expense">
              -{formatCurrency(summary.expenseTotal)}
            </span>
          )}
          {showIncome && (
            <span className="text-income">
              +{formatCurrency(summary.incomeTotal)}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
