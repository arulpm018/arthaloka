"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { startOfMonth, endOfMonth } from "date-fns";
import { Receipt } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { MonthPicker } from "@/components/shared/MonthPicker";
import { TransactionList } from "@/components/transactions/TransactionList";
import { TransferList } from "@/components/transactions/TransferList";
import { TransactionFilters } from "@/components/transactions/TransactionFilters";
import { TransactionSummaryCard } from "@/components/transactions/TransactionSummaryCard";
import { CalendarTab } from "@/components/transactions/CalendarTab";
import { LoadingState } from "@/components/shared/LoadingState";
import { EmptyState } from "@/components/shared/EmptyState";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { useTransactions } from "@/hooks/useTransactions";
import { useTransfers } from "@/hooks/useTransfers";
import { useTransactionSummary } from "@/hooks/useTransactionSummary";
import { useAppStore } from "@/store/useAppStore";
import { Transaction, Transfer, TxFilters } from "@/types";

export default function TransactionsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-4 max-w-4xl mx-auto">
          <LoadingState variant="page" />
        </div>
      }
    >
      <TransactionsPageContent />
    </Suspense>
  );
}

function TransactionsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get("categoryId");

  const { selectedMonth, setSelectedMonth, openSheet } = useAppStore();
  const [partialFilters, setPartialFilters] = useState<Partial<TxFilters>>({});
  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null);
  const [deleteTransferTarget, setDeleteTransferTarget] = useState<Transfer | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState<"transactions" | "transfers" | "calendar">("transactions");

  // Deep-link dari halaman kategori/home: ?categoryId=<id> memfilter daftar
  useEffect(() => {
    if (categoryParam) {
      setPartialFilters((prev) => ({ ...prev, categoryId: categoryParam }));
    }
  }, [categoryParam]);

  const filters: TxFilters = {
    startDate: startOfMonth(selectedMonth),
    endDate: endOfMonth(selectedMonth),
    ...partialFilters,
  };

  const { transactions, isLoading, hasMore, loadMore, remove } = useTransactions(filters);
  const { summary, isLoading: summaryLoading } = useTransactionSummary(filters);
  const { transfers, isLoading: transfersLoading, remove: removeTransfer } = useTransfers({
    startDate: startOfMonth(selectedMonth),
    endDate: endOfMonth(selectedMonth),
  });

  // Deep-link ?categoryId= hanya pemeta awal; setelah user mengubah filter,
  // param dibuang supaya reload tidak memaksakan filter lama.
  const handleFiltersChange = (next: Partial<TxFilters>) => {
    setPartialFilters(next);
    if (categoryParam && !next.categoryId) router.replace("/transactions");
  };

  const filteredTransactions = useMemo(
    () =>
      partialFilters.search
        ? transactions.filter((t) =>
            t.name.toLowerCase().includes(partialFilters.search!.toLowerCase())
          )
        : transactions,
    [transactions, partialFilters.search]
  );

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
      <Header
        titleSlot={
          <MonthPicker value={selectedMonth} onChange={setSelectedMonth} />
        }
      />
      <div className="mx-auto w-full max-w-4xl space-y-4 p-4 md:max-w-5xl md:p-6">
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
          <button
            onClick={() => setActiveTab("calendar")}
            className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              activeTab === "calendar"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Kalender
          </button>
        </div>

        {activeTab === "transactions" && (
          <div className="space-y-4 lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start lg:gap-4 lg:space-y-0">
            {/* Filter & pencarian */}
            <div className="lg:col-start-2 lg:row-start-1">
              <TransactionFilters
                filters={partialFilters}
                onChange={handleFiltersChange}
              />
            </div>

            {/* Ringkasan bulan ini */}
            <div className="lg:col-start-2 lg:row-start-2">
              <TransactionSummaryCard
                summary={summary}
                isLoading={summaryLoading}
                showExpense={filters.type !== "income"}
                showIncome={filters.type !== "expense"}
              />
            </div>

            <div className="lg:col-start-1 lg:row-start-1 lg:row-span-2 lg:self-start">
              {isLoading ? (
                <LoadingState variant="transaction-list" count={8} />
              ) : filteredTransactions.length === 0 ? (
                <EmptyState
                  icon={Receipt}
                  title="Belum ada transaksi"
                  description={
                    partialFilters.search
                      ? `Tidak ada transaksi cocok dengan "${partialFilters.search}"`
                      : "Transaksi bulan ini akan muncul di sini"
                  }
                />
              ) : (
                <TransactionList
                  transactions={filteredTransactions}
                  onEdit={handleEdit}
                  onDelete={(tx) => setDeleteTarget(tx)}
                  hasMore={hasMore}
                  onLoadMore={loadMore}
                />
              )}
            </div>
          </div>
        )}

        {activeTab === "calendar" && (
          <CalendarTab
            month={selectedMonth}
            onEdit={handleEdit}
            onDelete={(tx) => setDeleteTarget(tx)}
          />
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
