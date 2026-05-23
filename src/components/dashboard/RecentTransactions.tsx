"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Timestamp } from "firebase/firestore";
import { format, isToday, isYesterday } from "date-fns";
import { id } from "date-fns/locale";
import { Transaction, Transfer } from "@/types";
import { TransactionItem } from "@/components/transactions/TransactionItem";
import { TransferItem } from "@/components/transactions/TransferItem";

interface RecentTransactionsProps {
  transactions: Transaction[];
  transfers?: Transfer[];
  onEdit: (tx: Transaction) => void;
  onEditTransfer?: (transfer: Transfer) => void;
  onDeleteTransfer?: (transfer: Transfer) => void;
}

type FeedItem =
  | { kind: "transaction"; data: Transaction; date: number }
  | { kind: "transfer"; data: Transfer; date: number };

const toMillis = (d: Timestamp | Date | { toDate?: () => Date }): number => {
  if (d instanceof Timestamp) return d.toMillis();
  if (d instanceof Date) return d.getTime();
  if (typeof (d as { toDate?: () => Date }).toDate === "function") {
    return (d as { toDate: () => Date }).toDate().getTime();
  }
  return new Date(d as unknown as string).getTime();
};

const formatDateLabel = (date: Date) => {
  if (isToday(date)) return "Hari ini";
  if (isYesterday(date)) return "Kemarin";
  return format(date, "d MMMM", { locale: id });
};

export const RecentTransactions = ({
  transactions,
  transfers = [],
  onEdit,
  onEditTransfer,
  onDeleteTransfer,
}: RecentTransactionsProps) => {
  const merged: FeedItem[] = [
    ...transactions.map((t) => ({
      kind: "transaction" as const,
      data: t,
      date: toMillis(t.date),
    })),
    ...transfers.map((t) => ({
      kind: "transfer" as const,
      data: t,
      date: toMillis(t.date),
    })),
  ].sort((a, b) => b.date - a.date);

  const recent = merged.slice(0, 10);
  if (recent.length === 0) return null;

  // Group by date
  const grouped = recent.reduce<Record<string, FeedItem[]>>((acc, item) => {
    const key = new Date(item.date).toDateString();
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  const sortedDates = Object.keys(grouped).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime()
  );

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <h3 className="text-sm font-medium">Transaksi Terakhir</h3>
        <Link
          href="/transactions"
          className="flex items-center gap-1 text-xs text-primary hover:underline"
        >
          Lihat semua
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      <div className="divide-y divide-border">
        {sortedDates.map((dateKey) => (
          <div key={dateKey}>
            <div className="px-4 py-1.5 bg-muted/40">
              <p className="text-xs font-medium text-muted-foreground">
                {formatDateLabel(new Date(dateKey))}
              </p>
            </div>
            <div className="divide-y divide-border">
              {grouped[dateKey].map((item) =>
                item.kind === "transaction" ? (
                  <TransactionItem
                    key={`tx-${item.data.transactionId}`}
                    transaction={item.data}
                    onTap={() => onEdit(item.data)}
                  />
                ) : (
                  <TransferItem
                    key={`tf-${item.data.transferId}`}
                    transfer={item.data}
                    onTap={() => onEditTransfer?.(item.data)}
                    onDelete={
                      onDeleteTransfer
                        ? () => onDeleteTransfer(item.data)
                        : undefined
                    }
                  />
                )
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
