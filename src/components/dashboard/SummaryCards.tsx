"use client";

import { TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import { cn } from "@/lib/utils/cn";

interface SummaryCardsProps {
  totalBalance: number;
  income: number;
  expense: number;
  net: number;
}

export const SummaryCards = ({ totalBalance, income, expense, net }: SummaryCardsProps) => {
  return (
    <div className="space-y-3">
      {/* Hero Balance Card */}
      <div className="rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 p-5">
        <div className="flex items-center gap-2 mb-1">
          <Wallet className="h-4 w-4 text-primary" />
          <p className="text-xs text-muted-foreground font-medium">Total Kekayaan</p>
        </div>
        <p className="text-3xl font-mono font-bold tabular-nums tracking-tight">
          {formatCurrency(totalBalance)}
        </p>
        <div className="flex items-center gap-1 mt-2">
          <span
            className={cn(
              "text-xs font-medium px-2 py-0.5 rounded-full",
              net >= 0
                ? "bg-income/10 text-income"
                : "bg-expense/10 text-expense"
            )}
          >
            {net >= 0 ? "+" : ""}{formatCurrency(net)} bulan ini
          </span>
        </div>
      </div>

      {/* Income & Expense Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-full bg-income/10 flex items-center justify-center">
              <TrendingUp className="h-3.5 w-3.5 text-income" />
            </div>
            <p className="text-xs text-muted-foreground">Pemasukan</p>
          </div>
          <p className="text-base font-mono font-semibold tabular-nums text-income">
            +{formatCurrency(income)}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-full bg-expense/10 flex items-center justify-center">
              <TrendingDown className="h-3.5 w-3.5 text-expense" />
            </div>
            <p className="text-xs text-muted-foreground">Pengeluaran</p>
          </div>
          <p className="text-base font-mono font-semibold tabular-nums text-expense">
            -{formatCurrency(expense)}
          </p>
        </div>
      </div>
    </div>
  );
};
