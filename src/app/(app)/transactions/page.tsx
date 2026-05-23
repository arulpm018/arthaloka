"use client";

import { useState } from "react";
import { startOfMonth, endOfMonth } from "date-fns";
import { Receipt } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { MonthPicker } from "@/components/shared/MonthPicker";
import { TransactionList } from "@/components/transactions/TransactionList";
import { TransferList } from "@/components/transactions/TransferList";
import { TransactionFilters } from "@/components/transactions/TransactionFilters";
import { LoadingState } from "@/components/shared/LoadingState";
import { EmptyState } from "@/components/shared/EmptyState";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { useTransactions } from "@/hooks/useTransactions";
import { useTransfers } from "@/hooks/useTransfers";
import { useAppStore } from "@/store/useAppStore";
import { Transaction, Transfer, TxFilters } from "@/types";

export default function TransactionsPage() {
  const { selectedMonth, setSelectedMonth, openSheet } = useAppStore();
  const [partialFilters, setPartialFilters] = useState<Partial<TxFilters>>({});
  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null);
  const [deleteTransferTarget, setDeleteTransferTarget] = useState<Transfer | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState<"transactions" | "transfers">("transactions");

  const filters: TxFilters = {
    startDate: startOfMonth(selectedMonth),
    endDate: endOfMonth(selectedMonth),
    ...partialFilters,
  };

  const { transactions, isLoading, remove } = useTransactions(filters);
  const { transfers, isLoading: transfersLoading, remove: removeTransfer } = useTransfers({
    startDate: startOfMonth(selectedMonth),
    endDate: endOfMonth(selectedMonth),
  });

  const handleEdit = (tx: Transaction) => {
    openSheet(tx.type, tx);
  };

  const handleEditTransfer = (tf: Transfer) => {
    openSheet("transfer", tf);
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

  const handleDeleteTransfer = async () => {
    if (!deleteTransferTarget) return;
    setIsDeleting(true);
    try {
      await removeTransfer(deleteTransferTarget);
    } finally {
      setIsDeleting(false);
      setDeleteTransferTarget(null);
    }
  };

  return (
    <>
      <Header title="Transaksi">
        <MonthPicker value={selectedMonth} onChange={setSelectedMonth} />
      </Header>
      <div className="p-4 space-y-4 max-w-4xl mx-auto">
        {/* Tabs */}
        <div className="flex rounded-lg border border-border bg-muted p-1">
          <button
            onClick={() => setActiveTab("transactions")}
            className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              activeTab === "transactions"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Transaksi
          </button>
          <button
            onClick={() => setActiveTab("transfers")}
            className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              activeTab === "transfers"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Transfer
          </button>
        </div>

        {activeTab === "transactions" && (
          <>
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
          </>
        )}

        {activeTab === "transfers" && (
          <>
            {transfersLoading ? (
              <LoadingState variant="transaction-list" count={8} />
            ) : transfers.length === 0 ? (
              <EmptyState
                icon={Receipt}
                title="Belum ada transfer"
                description="Transfer antar akun bulan ini akan muncul di sini"
              />
            ) : (
              <TransferList
                transfers={transfers}
                onEdit={handleEditTransfer}
                onDelete={(tf) => setDeleteTransferTarget(tf)}
              />
            )}
          </>
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

      <ConfirmDialog
        open={!!deleteTransferTarget}
        onClose={() => setDeleteTransferTarget(null)}
        onConfirm={handleDeleteTransfer}
        title="Hapus Transfer?"
        description="Saldo kedua akun akan dikembalikan. Tindakan ini tidak bisa dibatalkan."
        isLoading={isDeleting}
      />
    </>
  );
}
