"use client";

import { useState } from "react";
import { TrendingUp, TrendingDown, Wallet, Eye, EyeOff, Building2, Smartphone, PiggyBank } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { MemeReaction } from "@/components/shared/MemeReaction";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import { getMoodForBalance } from "@/lib/utils/memeMood";
import { OWNER_LABELS, OWNER_COLORS } from "@/lib/constants/labels";
import { useAppStore } from "@/store/useAppStore";
import { Account, Owner } from "@/types";

const HIDDEN_PLACEHOLDER = "••••••••";

interface SummaryCardsProps {
  totalBalance: number;
  income: number;
  expense: number;
  accounts?: Account[];
}

const iconMap: Record<string, React.ElementType> = {
  bank: Building2,
  cash: Wallet,
  "e-wallet": Smartphone,
  savings: PiggyBank,
  investment: TrendingUp,
};

const accountTypeLabels: Record<string, string> = {
  bank: "Bank",
  cash: "Tunai",
  "e-wallet": "E-wallet",
  savings: "Tabungan",
  investment: "Investasi",
};

export const SummaryCards = ({ totalBalance, income, expense, accounts = [] }: SummaryCardsProps) => {
  const [sheetOpen, setSheetOpen] = useState(false);
  const hideBalance = useAppStore((state) => state.hideBalance);
  const setHideBalance = useAppStore((state) => state.setHideBalance);
  const showBalance = !hideBalance;

  // Group accounts by owner
  const grouped = accounts.reduce<Record<string, Account[]>>((acc, account) => {
    const key = account.owner;
    if (!acc[key]) acc[key] = [];
    acc[key].push(account);
    return acc;
  }, {});

  const ownerOrder: Owner[] = ["arul", "fifi", "shared"];
  const totalAccounts = accounts.length;

  return (
    <div className="space-y-3">
      {/* Hero Balance Card — Tappable */}
      <button
        onClick={() => setSheetOpen(true)}
        className="w-full text-left rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 p-5 transition-all active:scale-[0.98]"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 mb-1">
            <Wallet className="h-4 w-4 text-primary" />
            <p className="text-xs text-muted-foreground font-medium">Total Kekayaan</p>
          </div>
          <span
            role="button"
            aria-label={showBalance ? "Sembunyikan saldo" : "Tampilkan saldo"}
            onClick={(e) => {
              e.stopPropagation();
              setHideBalance(!hideBalance);
            }}
            className="p-1 -m-1 rounded-full hover:bg-muted/50 transition-colors"
          >
            {showBalance ? (
              <Eye className="h-4 w-4 text-muted-foreground" />
            ) : (
              <EyeOff className="h-4 w-4 text-muted-foreground" />
            )}
          </span>
        </div>
        <div className="flex items-end gap-3">
          <p className="text-3xl font-mono font-bold tabular-nums tracking-tight">
            {showBalance ? formatCurrency(totalBalance) : HIDDEN_PLACEHOLDER}
          </p>
          {/* Mood reaction — hanya muncul kalau saldo ditampilkan, biar
              kondisi finansial nggak ke-leak via emoji saat hideBalance ON.
              `ml-auto mr-6` → push ke tengah-tengah antara angka dan tepi
              card (bukan flush kanan, bukan nempel angka). */}
          {showBalance && (
            <MemeReaction
              mood={getMoodForBalance(totalBalance)}
              size="md"
              seed={`balance-${getMoodForBalance(totalBalance)}`}
              className="ml-auto mr-6"
            />
          )}
        </div>
      </button>

      {/* Account Breakdown Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] overflow-y-auto pb-8">
          <SheetHeader className="text-left pb-6">
            <SheetTitle className="text-base font-semibold">Ringkasan Kekayaan</SheetTitle>
            <SheetDescription className="sr-only">Detail akun berdasarkan pemilik</SheetDescription>
          </SheetHeader>

          {/* Total — typographic hero, tanpa card */}
          <div className="pb-6">
            <p className="text-xs text-muted-foreground mb-1.5">Total semua akun</p>
            <p className="text-3xl font-mono font-bold tabular-nums tracking-tight">
              {showBalance ? formatCurrency(totalBalance) : HIDDEN_PLACEHOLDER}
            </p>
            {totalAccounts > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                {totalAccounts} akun aktif
              </p>
            )}
          </div>

          {/* Accounts by Owner */}
          {accounts.length === 0 ? (
            <div className="py-12 text-center">
              <Wallet className="h-8 w-8 text-muted-foreground/60 mx-auto mb-2" strokeWidth={1.5} />
              <p className="text-sm text-muted-foreground">Belum ada akun</p>
            </div>
          ) : (
            <div className="divide-y divide-border border-t border-border">
              {ownerOrder.map((owner) => {
                const ownerAccounts = grouped[owner];
                if (!ownerAccounts || ownerAccounts.length === 0) return null;
                const ownerTotal = ownerAccounts.reduce((sum, a) => sum + a.balance, 0);
                const totalShare = totalBalance > 0 ? (ownerTotal / totalBalance) * 100 : 0;

                return (
                  <section key={owner} className="py-4">
                    {/* Owner Header */}
                    <div className="flex items-baseline justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="h-2 w-2 rounded-full shrink-0"
                          style={{ backgroundColor: OWNER_COLORS[owner] }}
                          aria-hidden
                        />
                        <h4 className="text-sm font-medium truncate">
                          {OWNER_LABELS[owner]}
                        </h4>
                        <span className="text-[11px] text-muted-foreground tabular-nums">
                          {totalShare.toFixed(0)}%
                        </span>
                      </div>
                      <span className="text-sm font-mono font-semibold tabular-nums shrink-0">
                        {showBalance ? formatCurrency(ownerTotal) : HIDDEN_PLACEHOLDER}
                      </span>
                    </div>

                    {/* Account Items — flat list, no card chrome */}
                    <ul className="space-y-0.5">
                      {ownerAccounts.map((account) => {
                        const Icon = iconMap[account.type] || Wallet;
                        return (
                          <li
                            key={account.accountId}
                            className="flex items-center gap-3 py-2 -mx-1 px-1 rounded-md"
                          >
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted shrink-0">
                              <Icon
                                className="h-3.5 w-3.5 text-muted-foreground"
                                strokeWidth={2}
                                style={{ color: account.color }}
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm truncate">{account.name}</p>
                              <p className="text-[11px] text-muted-foreground">
                                {accountTypeLabels[account.type] ?? account.type}
                              </p>
                            </div>
                            <p className="text-sm font-mono tabular-nums text-muted-foreground">
                              {showBalance ? formatCurrency(account.balance) : HIDDEN_PLACEHOLDER}
                            </p>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                );
              })}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Income & Expense Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-full bg-income/10 flex items-center justify-center">
              <TrendingUp className="h-3.5 w-3.5 text-income" />
            </div>
            <p className="text-xs text-muted-foreground">Pemasukan</p>
          </div>
          <p className="text-base font-mono font-semibold tabular-nums text-income">
            {showBalance ? `+${formatCurrency(income)}` : HIDDEN_PLACEHOLDER}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-full bg-expense/10 flex items-center justify-center">
              <TrendingDown className="h-3.5 w-3.5 text-expense" />
            </div>
            <p className="text-xs text-muted-foreground">Pengeluaran</p>
          </div>
          <p className="text-base font-mono font-semibold tabular-nums text-expense">
            {showBalance ? `-${formatCurrency(expense)}` : HIDDEN_PLACEHOLDER}
          </p>
        </div>
      </div>
    </div>
  );
};
