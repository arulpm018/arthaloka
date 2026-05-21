"use client";

import { Transaction } from "@/types";
import { TransactionItem } from "./TransactionItem";
import { formatRelativeDate } from "@/lib/utils/formatDate";
import { Timestamp } from "firebase/firestore";

interface TransactionListProps {
  transactions: Transaction[];
  onEdit: (tx: Transaction) => void;
  onDelete: (tx: Transaction) => void;
}

export const TransactionList = ({
  transactions,
  onEdit,
  onDelete,
}: TransactionListProps) => {
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

  return (
    <div className="space-y-4">
      {sortedDates.map((dateKey) => (
        <div key={dateKey}>
          <p className="text-xs font-medium text-muted-foreground mb-1 px-1">
            {formatRelativeDate(new Date(dateKey))}
          </p>
          <div className="space-y-0.5">
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
    </div>
  );
};
