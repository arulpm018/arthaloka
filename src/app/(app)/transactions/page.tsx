"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { startOfMonth, endOfMonth } from "date-fns";
import { Receipt, X } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { MonthPicker } from "@/components/shared/MonthPicker";
import { TransactionList } from "@/components/transactions/TransactionList";
import { TransferList } from "@/components/transactions/TransferList";
import { TransactionFilters } from "@/components/transactions/TransactionFilters";
import { TransactionSummaryCard } from "@/components/transactions/TransactionSummaryCard";
import { LoadingState } from "@/components/shared/LoadingState";
import { EmptyState } from "@/components/shared/EmptyState";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { CategoryIcon } from "@/components/shared/CategoryIcon";
import { useTransactions } from "@/hooks/useTransactions";
import { useTransfers } from "@/hooks/useTransfers";
import { useTransactionSummary } from "@/hooks/useTransactionSummary";
import { useCategories } from "@/hooks/useCategories";
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
  const [activeTab, setActiveTab] = useState<"transactions" | "transfers">("transactions");

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
  const { categories } = useCategories();
  const { transfers, isLoading: transfersLoading, remove: removeTransfer } = useTransfers({
    startDate: startOfMonth(selectedMonth),
    endDate: endOfMonth(selectedMonth),
  });

  const activeCategory = useMemo(
    () => categories.find((c) => c.categoryId === partialFilters.categoryId),
    [categories, partialFilters.categoryId]
  );

  const clearCategoryFilter = () => {
    setPartialFilters((prev) => {
      const next = { ...prev };
      delete next.categoryId;
      return next;
    });
    if (categoryParam) router.replace("/transactions");
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
            {/* Ringkasan bulan ini */}
            <TransactionSummaryCard
              summary={summary}
              isLoading={summaryLoading}
              showExpense={filters.type !== "income"}
              showIncome={filters.type !== "expense"}
            />

            {partialFilters.categoryId && (
              <div className="flex items-center gap-2 w-fit rounded-full border border-border bg-muted/50 pl-2 pr-1 py-1">
                {activeCategory ? (
                  <CategoryIcon
                    icon={activeCategory.icon}
                    color={activeCategory.color}
                    size="sm"
                  />
                ) : (
                  <Receipt className="h-4 w-4 text-muted-foreground ml-1" />
                )}
                <span className="text-xs font-medium max-w-[180px] truncate">
                  {activeCategory?.name ??
                    filteredTransactions[0]?.categoryName ??
                    "Kategori"}
                </span>
                <button
                  onClick={clearCategoryFilter}
                  aria-label="Hapus filter kategori"
                  className="rounded-full p-1 text-muted-foreground transition-colors hover:text-foreground hover:bg-accent"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            <TransactionFilters
              filters={partialFilters}
              onChange={setPartialFilters}
            />

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
