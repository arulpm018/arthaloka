"use client";

import { useMemo } from "react";
import {
  startOfMonth,
  endOfMonth,
  subMonths,
  getDaysInMonth,
  isSameMonth,
} from "date-fns";
import {
  CalendarDays,
  CalendarRange,
  Flame,
  Receipt,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { Header } from "@/components/layout/Header";
import { MonthPicker } from "@/components/shared/MonthPicker";
import { LoadingState } from "@/components/shared/LoadingState";
import { EmptyState } from "@/components/shared/EmptyState";
import { RecapHero } from "@/components/recap/RecapHero";
import { DailySpendingChart } from "@/components/recap/DailySpendingChart";
import { RecapCategoryBreakdown } from "@/components/recap/RecapCategoryBreakdown";
import { TopExpenses } from "@/components/recap/TopExpenses";
import { useSummary } from "@/hooks/useSummary";
import { useMonthTransactions } from "@/hooks/useMonthTransactions";
import { useCategories } from "@/hooks/useCategories";
import { useTransfers } from "@/hooks/useTransfers";
import { useAppStore } from "@/store/useAppStore";
import { Transaction } from "@/types";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import { cn } from "@/lib/utils/cn";

const InsightTile = ({
  icon: Icon,
  label,
  value,
  sub,
  valueClassName,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  sub?: string;
  valueClassName?: string;
}) => (
  <div className="rounded-xl border border-border bg-card p-4">
    <div className="flex items-center gap-1.5 mb-1.5">
      <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      <p className="text-xs text-muted-foreground truncate">{label}</p>
    </div>
    <p
      className={cn(
        "text-base font-mono font-semibold tabular-nums truncate",
        valueClassName
      )}
    >
      {value}
    </p>
    {sub && (
      <p className="text-[11px] text-muted-foreground truncate mt-0.5">{sub}</p>
    )}
  </div>
);

export default function RecapPage() {
  const { selectedMonth, setSelectedMonth } = useAppStore();
  const prevMonth = useMemo(() => subMonths(selectedMonth, 1), [selectedMonth]);

  const {
    income,
    expense,
    net,
    isLoading: summaryLoading,
  } = useSummary(selectedMonth);
  const {
    income: prevIncome,
    expense: prevExpense,
    isLoading: prevLoading,
  } = useSummary(prevMonth);
  const { transactions, isLoading: txLoading } = useMonthTransactions(selectedMonth);
  const { categories } = useCategories();
  const { transfers } = useTransfers({
    startDate: startOfMonth(selectedMonth),
    endDate: endOfMonth(selectedMonth),
  });

  const isLoading = summaryLoading || prevLoading || txLoading;

  const daysInMonth = getDaysInMonth(selectedMonth);
  const isCurrentMonth = isSameMonth(new Date(), selectedMonth);
  const daysElapsed = isCurrentMonth ? new Date().getDate() : daysInMonth;

  const avgPerDay = daysElapsed > 0 ? expense / daysElapsed : 0;
  const projection = avgPerDay * daysInMonth;
  const expenseCount = transactions.filter((t) => t.type === "expense").length;
  const avgPerTx = expenseCount > 0 ? expense / expenseCount : 0;
  const topTx = transactions
    .filter((t) => t.type === "expense")
    .reduce<Transaction | null>(
      (max, t) => (!max || t.amount > max.amount ? t : max),
      null
    );

  const hasNoActivity = !isLoading && transactions.length === 0 && transfers.length === 0;

  return (
    <>
      <Header title="Rekap Bulanan">
        <MonthPicker value={selectedMonth} onChange={setSelectedMonth} />
      </Header>
      <div className="p-4 space-y-4 max-w-4xl mx-auto">
        {isLoading ? (
          <LoadingState variant="page" />
        ) : hasNoActivity ? (
          <EmptyState
            icon={CalendarRange}
            title="Belum ada aktivitas"
            description="Belum ada transaksi di bulan ini"
          />
        ) : (
          <>
            <RecapHero
              income={income}
              expense={expense}
              net={net}
              prevIncome={prevIncome}
              prevExpense={prevExpense}
            />

            <div className="grid grid-cols-2 gap-3">
              <InsightTile
                icon={CalendarDays}
                label="Rata-rata / hari"
                value={formatCurrency(Math.round(avgPerDay))}
                sub={`dari ${daysElapsed} hari`}
              />
              {isCurrentMonth ? (
                <InsightTile
                  icon={TrendingUp}
                  label="Proyeksi akhir bulan"
                  value={formatCurrency(Math.round(projection))}
                  sub="estimasi pengeluaran"
                />
              ) : (
                <InsightTile
                  icon={Receipt}
                  label="Rata-rata / transaksi"
                  value={formatCurrency(Math.round(avgPerTx))}
                  sub={`${expenseCount} pengeluaran`}
                />
              )}
              <InsightTile
                icon={Flame}
                label="Transaksi terbesar"
                value={topTx ? `-${formatCurrency(topTx.amount)}` : "-"}
                sub={topTx?.name}
                valueClassName="text-expense"
              />
              <InsightTile
                icon={Receipt}
                label="Aktivitas"
                value={`${transactions.length} transaksi`}
                sub={`${transfers.length} transfer antar akun`}
              />
            </div>

            <DailySpendingChart transactions={transactions} month={selectedMonth} />

            <RecapCategoryBreakdown
              transactions={transactions}
              categories={categories}
            />

            <TopExpenses transactions={transactions} />
          </>
        )}
      </div>
    </>
  );
}
