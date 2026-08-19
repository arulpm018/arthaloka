"use client";

import { getDaysInMonth, isSameMonth, isToday, format } from "date-fns";
import { id } from "date-fns/locale";
import { Transaction } from "@/types";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import { cn } from "@/lib/utils/cn";

interface DailySpendingChartProps {
  transactions: Transaction[];
  month: Date;
}

export const DailySpendingChart = ({
  transactions,
  month,
}: DailySpendingChartProps) => {
  const daysInMonth = getDaysInMonth(month);
  const isCurrentMonth = isSameMonth(new Date(), month);

  const dailyTotals = Array.from<number>({ length: daysInMonth }).fill(0);
  transactions.forEach((tx) => {
    if (tx.type !== "expense") return;
    const day = tx.date.toDate().getDate();
    dailyTotals[day - 1] += tx.amount;
  });

  const max = Math.max(...dailyTotals, 0);
  const maxDay = dailyTotals.indexOf(max) + 1;
  const maxDate = new Date(month.getFullYear(), month.getMonth(), maxDay);
  const hasData = max > 0;

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Pengeluaran Harian</h3>
        {hasData && (
          <p className="text-[11px] text-muted-foreground">
            Tertinggi:{" "}
            <span className="font-medium text-foreground">
              {format(maxDate, "d MMM", { locale: id })}
            </span>{" "}
            • {formatCurrency(max)}
          </p>
        )}
      </div>

      <div className="flex items-end gap-[2px] h-24" aria-hidden>
        {dailyTotals.map((total, i) => {
          const day = i + 1;
          const date = new Date(month.getFullYear(), month.getMonth(), day);
          const isFuture = isCurrentMonth && date > new Date();
          const heightPct = hasData ? (total / max) * 100 : 0;

          return (
            <div key={day} className="flex-1 h-full flex items-end">
              {total === 0 ? (
                <div
                  className={cn(
                    "w-full rounded-sm",
                    isFuture ? "h-[2px] bg-transparent" : "h-[2px] bg-muted"
                  )}
                />
              ) : (
                <div
                  className={cn(
                    "w-full rounded-sm transition-all",
                    isToday(date)
                      ? "bg-primary"
                      : "bg-muted-foreground/40"
                  )}
                  style={{ height: `${Math.max(heightPct, 6)}%` }}
                />
              )}
            </div>
          );
        })}
      </div>

      <div className="flex gap-[2px]">
        {dailyTotals.map((_, i) => {
          const day = i + 1;
          const showLabel = day === 1 || day % 5 === 0 || day === daysInMonth;
          return (
            <div
              key={day}
              className="flex-1 text-center text-[9px] text-muted-foreground tabular-nums"
            >
              {showLabel ? day : ""}
            </div>
          );
        })}
      </div>
    </div>
  );
};
