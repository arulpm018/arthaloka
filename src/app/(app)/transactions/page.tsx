"use client";

import { useState } from "react";
import { startOfMonth, endOfMonth } from "date-fns";
import { Receipt } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { MonthPicker } from "@/components/shared/MonthPicker";
import { TransactionList } from "@/components/transactions/TransactionList";
import { TransactionFilters } from "@/components/transactions/TransactionFilters";
import { LoadingState } from "@/components/shared/LoadingState";
import { EmptyState } from "@/components/shared/EmptyState";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { useTransactions } from "@/hooks/useTransactions";
import { useAppStore } from "@/store/useAppStore";
import { Transaction, TxFilters } from "@/types";

export default function TransactionsPage() {
  const { selectedMonth, setSelectedMonth, openSheet } = useAppStore();
  const [partialFilters, setPartialFilters] = useState<Partial<TxFilters>>({});
  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const filters: TxFilters = {
    startDate: startOfMonth(selectedMonth),
    endDate: endOfMonth(selectedMonth),
    ...partialFilters,
  };

  const { transactions, isLoading, remove } = useTransactions(filters);

  const handleEdit = (tx: Transaction) => {
    openSheet(tx.type, tx);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await remove(deleteTarget);
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  return (
    <>
      <Header title="Transaksi">
        <MonthPicker value={selectedMonth} onChange={setSelectedMonth} />
      </Header>
      <div className="p-4 space-y-4 max-w-4xl mx-auto">
        <TransactionFilters
          filters={partialFilters}
          onChange={setPartialFilters}
        />

        {isLoading ? (
          <LoadingState variant="transaction-list" count={8} />
        ) : transactions.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="Belum ada transaksi"
            description="Transaksi bulan ini akan muncul di sini"
          />
        ) : (
          <TransactionList
            transactions={transactions}
            onEdit={handleEdit}
            onDelete={(tx) => setDeleteTarget(tx)}
          />
        )}
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Hapus Transaksi?"
        description="Saldo akun akan dikembalikan. Tindakan ini tidak bisa dibatalkan."
        isLoading={isDeleting}
      />
    </>
  );
}
