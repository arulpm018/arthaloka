"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Transaction } from "@/types";
import { TransactionItem } from "@/components/transactions/TransactionItem";

interface RecentTransactionsProps {
  transactions: Transaction[];
  onEdit: (tx: Transaction) => void;
}

export const RecentTransactions = ({ transactions, onEdit }: RecentTransactionsProps) => {
  const recent = transactions.slice(0, 10);
  if (recent.length === 0) return null;

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
        {recent.map((tx) => (
          <TransactionItem key={tx.transactionId} transaction={tx} onTap={() => onEdit(tx)} />
        ))}
      </div>
    </div>
  );
};
