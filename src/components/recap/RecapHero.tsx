"use client";

import { TrendingUp, TrendingDown } from "lucide-react";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import { cn } from "@/lib/utils/cn";

interface RecapHeroProps {
  income: number;
  expense: number;
  net: number;
  prevIncome: number;
  prevExpense: number;
}

const MomDelta = ({
  current,
  previous,
  positiveIsGood,
}: {
  current: number;
  previous: number;
  positiveIsGood: boolean;
}) => {
  if (previous <= 0 || current === previous) return null;

  const delta = Math.round(((current - previous) / previous) * 100);
  const isUp = delta > 0;
  const isGood = positiveIsGood ? isUp : !isUp;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-[11px] font-medium tabular-nums",
        isGood ? "text-income" : "text-expense"
      )}
    >
      {isUp ? "▲" : "▼"} {Math.abs(delta)}%
    </span>
  );
};

export const RecapHero = ({
  income,
  expense,
  net,
  prevIncome,
  prevExpense,
}: RecapHeroProps) => {
  const savingsRate = income > 0 ? Math.round((net / income) * 100) : null;
  const isSurplus = net >= 0;

  return (
    <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
      <div>
        <div className="flex items-center justify-between gap-2 mb-1">
          <p className="text-xs text-muted-foreground font-medium">
            Arus Kas Bersih
          </p>
          {savingsRate !== null && (
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[11px] font-medium",
                isSurplus
                  ? "bg-income/10 text-income"
                  : "bg-expense/10 text-expense"
              )}
            >
              {isSurplus ? "Tabungan" : "Defisit"} {savingsRate}%
            </span>
          )}
        </div>
        <p
          className={cn(
            "text-3xl font-mono font-bold tabular-nums tracking-tight",
            isSurplus ? "text-income" : "text-expense"
          )}
        >
          {isSurplus ? "+" : "-"}
          {formatCurrency(Math.abs(net))}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Selisih pemasukan dan pengeluaran bulan ini
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-income/5 p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp className="h-3.5 w-3.5 text-income" />
            <p className="text-xs text-muted-foreground">Pemasukan</p>
          </div>
          <p className="text-sm font-mono font-semibold tabular-nums text-income">
            +{formatCurrency(income)}
          </p>
          <div className="h-4 mt-0.5">
            <MomDelta current={income} previous={prevIncome} positiveIsGood />
          </div>
        </div>

        <div className="rounded-xl bg-expense/5 p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingDown className="h-3.5 w-3.5 text-expense" />
            <p className="text-xs text-muted-foreground">Pengeluaran</p>
          </div>
          <p className="text-sm font-mono font-semibold tabular-nums text-expense">
            -{formatCurrency(expense)}
          </p>
          <div className="h-4 mt-0.5">
            <MomDelta current={expense} previous={prevExpense} positiveIsGood={false} />
          </div>
        </div>
      </div>
    </div>
  );
};
