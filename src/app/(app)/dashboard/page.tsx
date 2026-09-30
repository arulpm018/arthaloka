"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { startOfMonth, endOfMonth, format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { CalendarRange } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Logo } from "@/components/shared/Logo";
import { BalanceHero } from "@/components/dashboard/BalanceHero";
import { CategorySpendingList } from "@/components/dashboard/CategorySpendingList";
import { RecentTransactions } from "@/components/dashboard/RecentTransactions";
import { LoadingState } from "@/components/shared/LoadingState";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { useBudgetStatus } from "@/hooks/useBudgetStatus";
import { budgetMood } from "@/lib/utils/budgetMood";
import { categorySpendingRows } from "@/lib/utils/budget";
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
  const { summary, spendingByCategory, categories, isLoading: budgetLoading } = useBudgetStatus(currentMonth);
  const spendingRows = useMemo(
    () => categorySpendingRows(categories, spendingByCategory),
    [categories, spendingByCategory]
  );
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
      <Header titleSlot={<Logo size="lg" />}>
        <Link
          href="/recap"
          aria-label="Rekap Bulanan"
          title="Rekap Bulanan"
          className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <CalendarRange className="h-5 w-5" />
        </Link>
      </Header>

      <div className="mx-auto w-full max-w-4xl space-y-4 p-4 md:max-w-5xl md:p-6">
        {isLoading ? (
          <LoadingState variant="page" />
        ) : (
          <>
            <BalanceHero
              accounts={accounts}
              mood={budgetMood(summary, currentMonth)}
              memeSeed={currentMonth.getDate()}
            />
            <CategorySpendingList rows={spendingRows} monthLabel={monthLabel} />
            <RecentTransactions
              transactions={transactions}
              transfers={transfers}
              limit={5}
              onEdit={(tx) => openSheet(tx.type, tx)}
              onEditTransfer={(tf) => openSheet("transfer", tf)}
              onDeleteTransfer={(tf) => setDeleteTransferTarget(tf)}
            />
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
