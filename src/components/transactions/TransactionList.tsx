"use client";

import { useEffect, useRef } from "react";
import { Transaction } from "@/types";
import { TransactionItem } from "./TransactionItem";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { Timestamp } from "firebase/firestore";

interface TransactionListProps {
  transactions: Transaction[];
  onEdit: (tx: Transaction) => void;
  onDelete: (tx: Transaction) => void;
  hasMore?: boolean;
  onLoadMore?: () => void;
}

export const TransactionList = ({
  transactions,
  onEdit,
  onDelete,
  hasMore,
  onLoadMore,
}: TransactionListProps) => {
  const triggerRef = useRef<HTMLDivElement | null>(null);

  // Group by date
  const grouped = transactions.reduce<Record<string, Transaction[]>>(
    (acc, tx) => {
      const date =
        tx.date instanceof Timestamp ? tx.date.toDate() : new Date(tx.date);
      const key = date.toDateString();
      if (!acc[key]) acc[key] = [];
      acc[key].push(tx);
      return acc;
    },
    {}
  );

  const sortedDates = Object.keys(grouped).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime()
  );

  const showLoadMore = !!hasMore && !!onLoadMore;

  useEffect(() => {
    if (!showLoadMore) return;
    const node = triggerRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            onLoadMore?.();
          }
        }
      },
      { rootMargin: "200px 0px" }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [showLoadMore, onLoadMore]);

  return (
    <div className="space-y-4">
      {sortedDates.map((dateKey) => (
        <div key={dateKey} className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-4 pt-3 pb-1.5">
            <p className="text-xs font-medium text-muted-foreground">
              {format(new Date(dateKey), "d MMMM", { locale: id })}
            </p>
          </div>
          <div className="divide-y divide-border">
            {grouped[dateKey].map((tx) => (
              <TransactionItem
                key={tx.transactionId}
                transaction={tx}
                onTap={() => onEdit(tx)}
                onDelete={() => onDelete(tx)}
              />
            ))}
          </div>
        </div>
      ))}

      {showLoadMore && (
        <div className="flex flex-col items-center gap-2 pt-2">
          <div ref={triggerRef} className="h-4 w-full" aria-hidden />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onLoadMore?.()}
          >
            Muat lebih banyak
          </Button>
        </div>
      )}
    </div>
  );
};
