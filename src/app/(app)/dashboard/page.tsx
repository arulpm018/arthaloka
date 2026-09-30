"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { startOfMonth, endOfMonth, format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { CalendarRange, ChevronRight } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Logo } from "@/components/shared/Logo";
import { BudgetHero } from "@/components/dashboard/BudgetHero";
import { BudgetWatchlist } from "@/components/dashboard/BudgetWatchlist";
import { BalanceStrip } from "@/components/dashboard/BalanceStrip";
import { RecentTransactions } from "@/components/dashboard/RecentTransactions";
import { LoadingState } from "@/components/shared/LoadingState";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { useBudgetStatus } from "@/hooks/useBudgetStatus";
import { useTransactions } from "@/hooks/useTransactions";
import { useTransfers } from "@/hooks/useTransfers";
import { useAccounts } from "@/hooks/useAccounts";
import { useAppStore } from "@/store/useAppStore";
import { Transfer } from "@/types";

export default function DashboardPage() {
  const router = useRouter();
  const openSheet = useAppStore((s) => s.openSheet);
  // Beranda selalu fokus ke bulan berjalan — bulan lain lewat Rekap/Budget.
  const currentMonth = useMemo(() => new Date(), []);
  const [deleteTransferTarget, setDeleteTransferTarget] = useState<Transfer | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Deep-link dari notifikasi pengingat: /dashboard?add=1 langsung buka form catat.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("add") === "1") {
      openSheet("expense");
      router.replace("/dashboard");
    }
  }, [openSheet, router]);

  const { accounts, isLoading: accountsLoading } = useAccounts();
  const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0);
  const { summary, isLoading: budgetLoading } = useBudgetStatus(currentMonth);
  const { transactions, isLoading: txLoading } = useTransactions({
    startDate: startOfMonth(currentMonth),
    endDate: endOfMonth(currentMonth),
  });
  const { transfers, isLoading: tfLoading, remove: removeTransfer } = useTransfers({
    startDate: startOfMonth(currentMonth),
    endDate: endOfMonth(currentMonth),
  });

  const isLoading = accountsLoading || budgetLoading || txLoading || tfLoading;
  const monthLabel = format(currentMonth, "MMMM", { locale: idLocale });

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

      <div className="mx-auto w-full max-w-4xl space-y-4 p-4 md:max-w-5xl md:p-6">
        {isLoading ? (
          <LoadingState variant="page" />
        ) : (
          <>
            <BudgetHero summary={summary} monthLabel={monthLabel} />
            <BudgetWatchlist items={summary.items} />
            <RecentTransactions
              transactions={transactions}
              transfers={transfers}
              limit={5}
              onEdit={(tx) => openSheet(tx.type, tx)}
              onEditTransfer={(tf) => openSheet("transfer", tf)}
              onDeleteTransfer={(tf) => setDeleteTransferTarget(tf)}
            />
            <BalanceStrip totalBalance={totalBalance} />
            <Link
              href="/recap"
              className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:bg-accent/50 active:bg-accent"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <CalendarRange className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">Rekap Bulanan</p>
                <p className="text-xs text-muted-foreground">Arus kas, kategori & insight bulan ini</p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </Link>
          </>
        )}
      </div>

      <ConfirmDialog
        open={!!deleteTransferTarget}
        onClose={() => setDeleteTransferTarget(null)}
        onConfirm={handleDeleteTransfer}
        title="Hapus Transfer?"
        description="Saldo kedua rekening akan dikembalikan. Tindakan ini tidak bisa dibatalkan."
        isLoading={isDeleting}
      />
    </>
  );
}
