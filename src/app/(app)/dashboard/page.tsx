"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { startOfMonth, endOfMonth } from "date-fns";
import { CalendarRange, ChevronRight } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Logo } from "@/components/shared/Logo";
import { SummaryCards } from "@/components/dashboard/SummaryCards";
import { SpendingByCategory } from "@/components/dashboard/SpendingByCategory";
import { RecentTransactions } from "@/components/dashboard/RecentTransactions";
import { LoadingState } from "@/components/shared/LoadingState";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { useSummary } from "@/hooks/useSummary";
import { useBudgetStatus } from "@/hooks/useBudgetStatus";
import { useTransactions } from "@/hooks/useTransactions";
import { useTransfers } from "@/hooks/useTransfers";
import { useAccounts } from "@/hooks/useAccounts";
import { useAppStore } from "@/store/useAppStore";
import { Transfer } from "@/types";

export default function DashboardPage() {
  const { openSheet } = useAppStore();
  // Home selalu fokus ke bulan berjalan — ganti bulan cukup lewat Rekap Bulanan.
  const currentMonth = useMemo(() => new Date(), []);
  const [deleteTransferTarget, setDeleteTransferTarget] = useState<Transfer | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { accounts } = useAccounts();
  const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0);

  const { income, expense, isLoading: summaryLoading } = useSummary(currentMonth);
  const { budgets, isLoading: budgetLoading } = useBudgetStatus(currentMonth);
  const { transactions, isLoading: txLoading } = useTransactions({
    startDate: startOfMonth(currentMonth),
    endDate: endOfMonth(currentMonth),
  });
  const { transfers, isLoading: tfLoading, remove: removeTransfer } = useTransfers({
    startDate: startOfMonth(currentMonth),
    endDate: endOfMonth(currentMonth),
  });

  const isLoading = summaryLoading || budgetLoading || txLoading || tfLoading;

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
      <Header titleSlot={<Logo size="lg" />} />

      <div className="mx-auto w-full max-w-4xl space-y-6 p-4 md:max-w-5xl md:p-6">
        {isLoading ? (
          <LoadingState variant="page" />
        ) : (
          <>
            <SummaryCards totalBalance={totalBalance} income={income} expense={expense} accounts={accounts} />

            <Link
              href="/recap"
              className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:bg-accent/50 active:bg-accent"
            >
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <CalendarRange className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">Rekap Bulanan</p>
                <p className="text-xs text-muted-foreground">
                  Ringkasan lengkap arus kas, kategori & insight bulan ini
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </Link>

            <div className="space-y-6 xl:grid xl:grid-cols-[minmax(0,1fr)_400px] xl:items-start xl:gap-6 xl:space-y-0">
              <SpendingByCategory budgets={budgets} />
              <RecentTransactions
                transactions={transactions}
                transfers={transfers}
                onEdit={(tx) => openSheet(tx.type, tx)}
                onEditTransfer={(tf) => openSheet("transfer", tf)}
                onDeleteTransfer={(tf) => setDeleteTransferTarget(tf)}
              />
            </div>
          </>
        )}
      </div>

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
