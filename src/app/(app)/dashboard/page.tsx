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
import { useSummary } from "@/hooks/useSummary";
import { useBudgetStatus } from "@/hooks/useBudgetStatus";
import { useTransactions } from "@/hooks/useTransactions";
import { useAccounts } from "@/hooks/useAccounts";
import { useAppStore } from "@/store/useAppStore";

export default function DashboardPage() {
  const { selectedMonth, setSelectedMonth, openSheet } = useAppStore();
  const [actionSheetOpen, setActionSheetOpen] = useState(false);

  const { accounts } = useAccounts();
  const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0);

  const { income, expense, net, isLoading: summaryLoading } = useSummary(selectedMonth);
  const { budgets, isLoading: budgetLoading } = useBudgetStatus(selectedMonth);
  const { transactions, isLoading: txLoading } = useTransactions({
    startDate: startOfMonth(selectedMonth),
    endDate: endOfMonth(selectedMonth),
  });

  const isLoading = summaryLoading || budgetLoading || txLoading;

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
            <RecentTransactions transactions={transactions} onEdit={(tx) => openSheet(tx.type, tx)} />
          </>
        )}
      </div>

      <FAB onClick={() => setActionSheetOpen(true)} />
      <ActionSheet open={actionSheetOpen} onClose={() => setActionSheetOpen(false)} onSelect={(type) => openSheet(type)} />
      <ExpenseSheet />
      <IncomeSheet />
      <TransferSheet />
    </>
  );
}
