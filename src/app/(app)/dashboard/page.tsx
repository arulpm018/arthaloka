"use client";

import { useState } from "react";
import { startOfMonth, endOfMonth } from "date-fns";
import { Header } from "@/components/layout/Header";
import { MonthPicker } from "@/components/shared/MonthPicker";
import { FAB } from "@/components/layout/FAB";
import { ActionSheet } from "@/components/layout/ActionSheet";
import { ExpenseSheet } from "@/components/transactions/ExpenseSheet";
import { IncomeSheet } from "@/components/transactions/IncomeSheet";
import { TransferSheet } from "@/components/transactions/TransferSheet";
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
  const { selectedMonth, setSelectedMonth, openSheet } = useAppStore();
  const [actionSheetOpen, setActionSheetOpen] = useState(false);
  const [deleteTransferTarget, setDeleteTransferTarget] = useState<Transfer | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { accounts } = useAccounts();
  const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0);

  const { income, expense, net, isLoading: summaryLoading } = useSummary(selectedMonth);
  const { budgets, isLoading: budgetLoading } = useBudgetStatus(selectedMonth);
  const { transactions, isLoading: txLoading } = useTransactions({
    startDate: startOfMonth(selectedMonth),
    endDate: endOfMonth(selectedMonth),
  });
  const { transfers, isLoading: tfLoading, remove: removeTransfer } = useTransfers({
    startDate: startOfMonth(selectedMonth),
    endDate: endOfMonth(selectedMonth),
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
      <Header title="Arthafiloka">
        <MonthPicker value={selectedMonth} onChange={setSelectedMonth} />
      </Header>

      <div className="p-4 space-y-6 max-w-4xl mx-auto">
        {isLoading ? (
          <LoadingState variant="page" />
        ) : (
          <>
            <SummaryCards totalBalance={totalBalance} income={income} expense={expense} net={net} accounts={accounts} />
            <SpendingByCategory budgets={budgets} />
            <RecentTransactions
              transactions={transactions}
              transfers={transfers}
              onEdit={(tx) => openSheet(tx.type, tx)}
              onEditTransfer={(tf) => openSheet("transfer", tf)}
              onDeleteTransfer={(tf) => setDeleteTransferTarget(tf)}
            />
          </>
        )}
      </div>

      <FAB onClick={() => setActionSheetOpen(true)} />
      <ActionSheet open={actionSheetOpen} onClose={() => setActionSheetOpen(false)} onSelect={(type) => openSheet(type)} />
      <ExpenseSheet />
      <IncomeSheet />
      <TransferSheet />

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
