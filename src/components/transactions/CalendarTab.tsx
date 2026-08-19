"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getDaysInMonth,
  isSameMonth,
  isToday,
  format,
} from "date-fns";
import { id } from "date-fns/locale";
import { Receipt } from "lucide-react";
import { Transaction } from "@/types";
import { TransactionList } from "./TransactionList";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingState } from "@/components/shared/LoadingState";
import { useMonthTransactions } from "@/hooks/useMonthTransactions";
import { formatCompactAmount } from "@/lib/utils/formatCurrency";
import { cn } from "@/lib/utils/cn";

const WEEKDAYS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

interface DayStat {
  expense: number;
  income: number;
}

interface CalendarTabProps {
  month: Date;
  onEdit: (tx: Transaction) => void;
  onDelete: (tx: Transaction) => void;
}

export const CalendarTab = ({ month, onEdit, onDelete }: CalendarTabProps) => {
  const { transactions, isLoading } = useMonthTransactions(month);

  const monthMs = month.getTime();

  const [selectedDate, setSelectedDate] = useState<Date | null>(() =>
    isSameMonth(new Date(), month) ? new Date() : null
  );

  // Reset pilihan saat bulan berganti (default: hari ini kalau bulan berjalan)
  useEffect(() => {
    setSelectedDate(isSameMonth(new Date(), monthMs) ? new Date() : null);
  }, [monthMs]);

  const dayStats = useMemo(() => {
    const monthDate = new Date(monthMs);
    const stats: DayStat[] = Array.from({ length: getDaysInMonth(monthDate) }).map(
      () => ({ expense: 0, income: 0 })
    );
    transactions.forEach((tx) => {
      const day = tx.date.toDate().getDate();
      if (tx.type === "income") stats[day - 1].income += tx.amount;
      else stats[day - 1].expense += tx.amount;
    });
    return stats;
  }, [transactions, monthMs]);

  // Monday-first offset
  const firstWeekday = (new Date(month.getFullYear(), month.getMonth(), 1).getDay() + 6) % 7;
  const isCurrentMonth = isSameMonth(new Date(), month);

  const selectedDayTx = useMemo(() => {
    if (!selectedDate) return [];
    return transactions.filter((tx) => {
      const d = tx.date.toDate();
      return (
        d.getFullYear() === selectedDate.getFullYear() &&
        d.getMonth() === selectedDate.getMonth() &&
        d.getDate() === selectedDate.getDate()
      );
    });
  }, [transactions, selectedDate]);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-3">
        {/* Weekday header */}
        <div className="grid grid-cols-7 mb-1">
          {WEEKDAYS.map((d) => (
            <div
              key={d}
              className="text-center text-[10px] font-medium text-muted-foreground py-1"
            >
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: firstWeekday }).map((_, i) => (
            <div key={`pad-${i}`} />
          ))}

          {dayStats.map((stat, i) => {
            const day = i + 1;
            const date = new Date(month.getFullYear(), month.getMonth(), day);
            const isSelected =
              selectedDate !== null && selectedDate.toDateString() === date.toDateString();
            const isFuture = isCurrentMonth && date > new Date();
            const hasExpense = stat.expense > 0;
            const hasIncome = stat.income > 0;

            return (
              <button
                key={day}
                onClick={() => setSelectedDate(date)}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 rounded-lg py-1.5 min-h-[48px] transition-colors",
                  isSelected
                    ? "bg-foreground text-background"
                    : "hover:bg-accent active:bg-accent",
                  !isSelected && isToday(date) && "ring-1 ring-primary"
                )}
                aria-label={`Lihat transaksi tanggal ${format(date, "d MMMM yyyy", { locale: id })}`}
                aria-pressed={isSelected}
              >
                <span
                  className={cn(
                    "text-xs tabular-nums",
                    !isSelected && isFuture && "text-muted-foreground/50",
                    !isSelected && !isFuture && "font-medium"
                  )}
                >
                  {day}
                </span>
                {hasExpense || hasIncome ? (
                  <span
                    className={cn(
                      "text-[9px] font-mono tabular-nums leading-none",
                      isSelected
                        ? "text-background/70"
                        : hasExpense
                          ? "text-expense"
                          : "text-income"
                    )}
                  >
                    {formatCompactAmount(hasExpense ? stat.expense : stat.income)}
                  </span>
                ) : (
                  <span className="h-[9px]" aria-hidden />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Transaksi hari terpilih */}
      {isLoading ? (
        <LoadingState variant="transaction-list" count={3} />
      ) : !selectedDate ? (
        <EmptyState
          icon={Receipt}
          title="Pilih tanggal"
          description="Tap salah satu tanggal untuk melihat transaksinya"
        />
      ) : selectedDayTx.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="Tidak ada transaksi"
          description={`Tidak ada transaksi pada ${format(selectedDate, "d MMMM", { locale: id })}`}
        />
      ) : (
        <TransactionList
          transactions={selectedDayTx}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      )}
    </div>
  );
};
