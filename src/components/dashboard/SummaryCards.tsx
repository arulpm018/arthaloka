"use client";

import { useState } from "react";
import { TrendingUp, TrendingDown, Wallet, Eye, EyeOff, Building2, Smartphone, PiggyBank } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import { cn } from "@/lib/utils/cn";
import { Account } from "@/types";

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

const ownerLabels: Record<string, string> = {
  arul: "Arul",
  fifi: "Fifi",
  shared: "Together",
};

const ownerAccentColors: Record<string, string> = {
  arul: "border-l-blue-500",
  fifi: "border-l-pink-500",
  shared: "border-l-purple-500",
};



const ownerTextColors: Record<string, string> = {
  arul: "text-blue-600 dark:text-blue-400",
  fifi: "text-pink-600 dark:text-pink-400",
  shared: "text-purple-600 dark:text-purple-400",
};

export const SummaryCards = ({ totalBalance, income, expense, accounts = [] }: SummaryCardsProps) => {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [showBalance, setShowBalance] = useState(true);

  // Group accounts by owner
  const grouped = accounts.reduce<Record<string, Account[]>>((acc, account) => {
    const key = account.owner;
    if (!acc[key]) acc[key] = [];
    acc[key].push(account);
    return acc;
  }, {});

  const ownerOrder: Array<"arul" | "fifi" | "shared"> = ["arul", "fifi", "shared"];

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
              setShowBalance((prev) => !prev);
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
        <p className="text-3xl font-mono font-bold tabular-nums tracking-tight">
          {showBalance ? formatCurrency(totalBalance) : "••••••••"}
        </p>
      </button>

      {/* Account Breakdown Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] overflow-y-auto pb-8">
          <SheetHeader className="text-left pb-4">
            <SheetTitle className="text-lg">Ringkasan Kekayaan</SheetTitle>
            <SheetDescription className="sr-only">Detail akun berdasarkan pemilik</SheetDescription>
          </SheetHeader>

          {/* Total Balance Highlight */}
          <div className="rounded-xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 p-4 mb-5">
            <p className="text-xs text-muted-foreground font-medium mb-1">Total Semua Akun</p>
            <p className="text-2xl font-mono font-bold tabular-nums tracking-tight">
              {formatCurrency(totalBalance)}
            </p>
          </div>

          {/* Accounts by Owner */}
          {accounts.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-6 text-center">
              <Wallet className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Belum ada akun</p>
            </div>
          ) : (
            <div className="space-y-5">
              {ownerOrder.map((owner) => {
                const ownerAccounts = grouped[owner];
                if (!ownerAccounts || ownerAccounts.length === 0) return null;
                const ownerTotal = ownerAccounts.reduce((sum, a) => sum + a.balance, 0);

                return (
                  <div key={owner} className="space-y-2">
                    {/* Owner Header — aligned with account items below */}
                    <div className="flex items-center gap-3 px-3">
                      <div className="flex h-9 w-9 items-center justify-center shrink-0">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: owner === "arul" ? "#3b82f6" : owner === "fifi" ? "#ec4899" : "#a855f7" }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className={cn("text-sm font-semibold", ownerTextColors[owner])}>
                          {ownerLabels[owner]}
                        </h4>
                      </div>
                      <span className="text-sm font-mono font-semibold tabular-nums">
                        {formatCurrency(ownerTotal)}
                      </span>
                    </div>

                    {/* Account Items */}
                    <div className="space-y-1.5">
                      {ownerAccounts.map((account) => {
                        const Icon = iconMap[account.type] || Wallet;
                        return (
                          <div
                            key={account.accountId}
                            className={cn(
                              "flex items-center gap-3 rounded-xl border border-border bg-card p-3 border-l-[3px]",
                              ownerAccentColors[owner]
                            )}
                          >
                            <div
                              className="flex h-9 w-9 items-center justify-center rounded-full shrink-0"
                              style={{ backgroundColor: `${account.color}15` }}
                            >
                              <Icon className="h-4 w-4" style={{ color: account.color }} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{account.name}</p>
                              <p className="text-[11px] text-muted-foreground capitalize">{account.type}</p>
                            </div>
                            <p className="text-sm font-mono font-medium tabular-nums">
                              {formatCurrency(account.balance)}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
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
            +{formatCurrency(income)}
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
            -{formatCurrency(expense)}
          </p>
        </div>
      </div>
    </div>
  );
};
