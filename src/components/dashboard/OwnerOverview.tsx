"use client";

import { useState, useEffect } from "react";
import { startOfMonth, endOfMonth } from "date-fns";
import { Plus, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/layout/Header";
import { OwnerSwitcherTitle } from "@/components/layout/OwnerSwitcherTitle";
import { MonthPicker } from "@/components/shared/MonthPicker";
import { AccountCard } from "@/components/accounts/AccountCard";
import { AccountForm } from "@/components/accounts/AccountForm";
import { AccountDetailSheet } from "@/components/accounts/AccountDetailSheet";
import { RecentTransactions } from "@/components/dashboard/RecentTransactions";
import { LoadingState } from "@/components/shared/LoadingState";
import { MemeReaction } from "@/components/shared/MemeReaction";
import { CoupleHero } from "@/components/shared/CoupleHero";
import { useSummary } from "@/hooks/useSummary";
import { useAccounts } from "@/hooks/useAccounts";
import { useTransactions } from "@/hooks/useTransactions";
import { useTransfers } from "@/hooks/useTransfers";
import { useAppStore } from "@/store/useAppStore";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import { getMoodForBalance, getMoodForNet } from "@/lib/utils/memeMood";
import { OWNER_COLORS } from "@/lib/constants/labels";
import { Account, Owner } from "@/types";

const HIDDEN_PLACEHOLDER = "••••••••";

interface OwnerOverviewProps {
  owner: Owner;
}

export const OwnerOverview = ({ owner }: OwnerOverviewProps) => {
  const { selectedMonth, setSelectedMonth, openSheet, setDefaultOwner } = useAppStore();
  const [accountFormOpen, setAccountFormOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);

  useEffect(() => {
    setDefaultOwner(owner);
    return () => setDefaultOwner(null);
  }, [setDefaultOwner, owner]);

  const { accounts, isLoading: accountsLoading } = useAccounts(owner);
  const { income, expense, isLoading: summaryLoading } = useSummary(selectedMonth, owner);
  const { transactions, isLoading: txLoading } = useTransactions({
    startDate: startOfMonth(selectedMonth),
    endDate: endOfMonth(selectedMonth),
    owner,
  });
  const { transfers, isLoading: tfLoading } = useTransfers({
    startDate: startOfMonth(selectedMonth),
    endDate: endOfMonth(selectedMonth),
    owner,
  });

  const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0);
  const isLoading = accountsLoading || summaryLoading || txLoading || tfLoading;

  const hideBalance = useAppStore((s) => s.hideBalance);
  const setHideBalance = useAppStore((s) => s.setHideBalance);
  const showBalance = !hideBalance;
  const currentUser = useAppStore((s) => s.currentUser);
  const partner = useAppStore((s) => s.partner);

  // Anniversary date — primary source: current user; fallback: partner
  // (kasus user belum set sendiri, tapi pasangannya udah).
  const anniversaryDate =
    currentUser?.relationship?.anniversaryDate ??
    partner?.relationship?.anniversaryDate ??
    null;

  // Mood untuk hero:
  // - shared: based on saldo "Pacaran" account.
  // - arul/fifi: based on net bulan ini (income - expense).
  const pacaranAccount =
    owner === "shared"
      ? accounts.find((a) => /pacaran/i.test(a.name))
      : undefined;
  const heroMood =
    owner === "shared"
      ? pacaranAccount
        ? getMoodForBalance(pacaranAccount.balance)
        : "romance"
      : getMoodForNet(income, expense);

  const handleAccountTap = (account: Account) => {
    setSelectedAccount(account);
    setDetailSheetOpen(true);
  };

  const handleEditAccount = (account: Account) => {
    setEditingAccount(account);
    setAccountFormOpen(true);
  };

  return (
    <>
      <Header
        ownerColor={OWNER_COLORS[owner]}
        titleSlot={<OwnerSwitcherTitle activeOwner={owner} />}
      >
        <MonthPicker value={selectedMonth} onChange={setSelectedMonth} />
      </Header>

      <div className="p-4 space-y-6 max-w-4xl mx-auto">
        {isLoading ? (
          <LoadingState variant="page" />
        ) : (
          <>
            {/* Identity hero — couple photo for shared, header strip dilebur ke balance card untuk arul/fifi. */}
            {owner === "shared" && (
              <CoupleHero anniversaryDate={anniversaryDate} />
            )}

            {/* Balance hero card — gradient tinted by owner color, meme 96px */}
            <div
              className="relative rounded-2xl border p-5 transition-colors"
              style={{
                borderColor: `${OWNER_COLORS[owner]}33`,
                background: `linear-gradient(135deg, ${OWNER_COLORS[owner]}14 0%, ${OWNER_COLORS[owner]}05 50%, transparent 100%)`,
              }}
            >
              {/* Eye toggle — absolute top-right, biar tidak makan vertikal space dan tidak tabrakan dengan meme. */}
              <button
                type="button"
                aria-label={showBalance ? "Sembunyikan saldo" : "Tampilkan saldo"}
                onClick={() => setHideBalance(!hideBalance)}
                className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-muted/50 transition-colors z-10"
              >
                {showBalance ? (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                )}
              </button>

              {/* Balance + meme — meme self-center aligns with balance block */}
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  {/* Padding-right kecil supaya label nggak ke-overlap eye toggle. */}
                  <p className="text-xs text-muted-foreground pr-8">Total Balance</p>
                  <p className="text-3xl font-mono font-bold tabular-nums tracking-tight">
                    {showBalance ? formatCurrency(totalBalance) : HIDDEN_PLACEHOLDER}
                  </p>
                </div>
                {showBalance && (
                  <MemeReaction
                    mood={heroMood}
                    size="lg"
                    seed={`${owner}-${heroMood}`}
                    className="h-24 w-24 text-4xl shrink-0 mr-6"
                  />
                )}
              </div>

              {/* Income / expense pills */}
              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-income/10 px-3 py-2">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                    Pemasukan
                  </p>
                  <p className="text-sm font-mono font-semibold text-income tabular-nums">
                    {showBalance ? `+${formatCurrency(income)}` : HIDDEN_PLACEHOLDER}
                  </p>
                </div>
                <div className="rounded-lg bg-expense/10 px-3 py-2">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                    Pengeluaran
                  </p>
                  <p className="text-sm font-mono font-semibold text-expense tabular-nums">
                    {showBalance ? `-${formatCurrency(expense)}` : HIDDEN_PLACEHOLDER}
                  </p>
                </div>
              </div>
            </div>

            {/* Accounts */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Akun</h3>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setEditingAccount(null);
                    setAccountFormOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Tambah
                </Button>
              </div>
              {accounts.map((acc) => (
                <AccountCard
                  key={acc.accountId}
                  account={acc}
                  onTap={() => handleAccountTap(acc)}
                />
              ))}
            </div>

            {/* Recent Transactions */}
            <RecentTransactions
              transactions={transactions}
              transfers={transfers}
              onEdit={(tx) => openSheet(tx.type, tx)}
              onEditTransfer={(tf) => openSheet("transfer", tf)}
            />
          </>
        )}
      </div>

      <AccountForm
        open={accountFormOpen}
        onClose={() => {
          setAccountFormOpen(false);
          setEditingAccount(null);
        }}
        editingAccount={editingAccount}
      />
      <AccountDetailSheet
        open={detailSheetOpen}
        onClose={() => {
          setDetailSheetOpen(false);
          setSelectedAccount(null);
        }}
        account={selectedAccount}
        onEdit={handleEditAccount}
      />
    </>
  );
};
