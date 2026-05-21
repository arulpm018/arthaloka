"use client";

import { useState } from "react";
import { startOfMonth, endOfMonth } from "date-fns";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/layout/Header";
import { MonthPicker } from "@/components/shared/MonthPicker";
import { FAB } from "@/components/layout/FAB";
import { ActionSheet } from "@/components/layout/ActionSheet";
import { ExpenseSheet } from "@/components/transactions/ExpenseSheet";
import { IncomeSheet } from "@/components/transactions/IncomeSheet";
import { TransferSheet } from "@/components/transactions/TransferSheet";
import { AccountCard } from "@/components/accounts/AccountCard";
import { AccountForm } from "@/components/accounts/AccountForm";
import { RecentTransactions } from "@/components/dashboard/RecentTransactions";
import { LoadingState } from "@/components/shared/LoadingState";
import { useSummary } from "@/hooks/useSummary";
import { useAccounts } from "@/hooks/useAccounts";
import { useTransactions } from "@/hooks/useTransactions";
import { useAppStore } from "@/store/useAppStore";
import { formatCurrency } from "@/lib/utils/formatCurrency";

export default function FifiPage() {
  const { selectedMonth, setSelectedMonth, openSheet } = useAppStore();
  const [actionSheetOpen, setActionSheetOpen] = useState(false);
  const [accountFormOpen, setAccountFormOpen] = useState(false);

  const { accounts, isLoading: accountsLoading } = useAccounts("fifi");
  const { income, expense, isLoading: summaryLoading } = useSummary(selectedMonth, "fifi");
  const { transactions, isLoading: txLoading } = useTransactions({
    startDate: startOfMonth(selectedMonth),
    endDate: endOfMonth(selectedMonth),
    owner: "fifi",
  });

  const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0);
  const isLoading = accountsLoading || summaryLoading || txLoading;

  return (
    <>
      <Header title="Fifi">
        <MonthPicker value={selectedMonth} onChange={setSelectedMonth} />
      </Header>

      <div className="p-4 space-y-6 max-w-4xl mx-auto">
        {isLoading ? (
          <LoadingState variant="page" />
        ) : (
          <>
            {/* Summary */}
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Total Balance</p>
              <p className="text-2xl font-mono font-semibold tabular-nums">
                {formatCurrency(totalBalance)}
              </p>
              <div className="flex gap-4 text-sm">
                <span className="text-income">+{formatCurrency(income)}</span>
                <span className="text-expense">-{formatCurrency(expense)}</span>
              </div>
            </div>

            {/* Accounts */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Akun</h3>
                <Button size="sm" variant="ghost" onClick={() => setAccountFormOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Tambah
                </Button>
              </div>
              {accounts.map((acc) => (
                <AccountCard key={acc.accountId} account={acc} />
              ))}
            </div>

            {/* Recent Transactions */}
            <RecentTransactions
              transactions={transactions}
              onEdit={(tx) => openSheet(tx.type, tx)}
            />
          </>
        )}
      </div>

      <FAB onClick={() => setActionSheetOpen(true)} />
      <ActionSheet
        open={actionSheetOpen}
        onClose={() => setActionSheetOpen(false)}
        onSelect={(type) => openSheet(type)}
      />
      <ExpenseSheet />
      <IncomeSheet />
      <TransferSheet />
      <AccountForm
        open={accountFormOpen}
        onClose={() => setAccountFormOpen(false)}
      />
    </>
  );
}
