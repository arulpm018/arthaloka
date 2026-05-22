"use client";

import { useState } from "react";
import { TrendingUp, TrendingDown, Wallet, ChevronDown, Building2, Smartphone, PiggyBank } from "lucide-react";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import { cn } from "@/lib/utils/cn";
import { Account } from "@/types";

interface SummaryCardsProps {
  totalBalance: number;
  income: number;
  expense: number;
  net: number;
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

export const SummaryCards = ({ totalBalance, income, expense, net, accounts = [] }: SummaryCardsProps) => {
  const [expanded, setExpanded] = useState(false);

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
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 p-5 transition-all active:scale-[0.98]"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 mb-1">
            <Wallet className="h-4 w-4 text-primary" />
            <p className="text-xs text-muted-foreground font-medium">Total Kekayaan</p>
          </div>
          <ChevronDown
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform duration-200",
              expanded && "rotate-180"
            )}
          />
        </div>
        <p className="text-3xl font-mono font-bold tabular-nums tracking-tight">
          {formatCurrency(totalBalance)}
        </p>
        <div className="flex items-center gap-1 mt-2">
          <span
            className={cn(
              "text-xs font-medium px-2 py-0.5 rounded-full",
              net >= 0
                ? "bg-income/10 text-income"
                : "bg-expense/10 text-expense"
            )}
          >
            {net >= 0 ? "+" : ""}{formatCurrency(net)} bulan ini
          </span>
        </div>
      </button>

      {/* Expanded Account List */}
      {expanded && (
        <div className="space-y-4 animate-in slide-in-from-top-2 duration-200">
          {accounts.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-4 text-center">
              <p className="text-sm text-muted-foreground">Belum ada akun</p>
            </div>
          ) : (
            ownerOrder.map((owner) => {
              const ownerAccounts = grouped[owner];
              if (!ownerAccounts || ownerAccounts.length === 0) return null;
              const ownerTotal = ownerAccounts.reduce((sum, a) => sum + a.balance, 0);

              return (
                <div key={owner} className="space-y-1.5">
                  <div className="flex items-center justify-between px-1">
                    <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      {ownerLabels[owner]}
                    </h4>
                    <span className="text-xs font-mono text-muted-foreground tabular-nums">
                      {formatCurrency(ownerTotal)}
                    </span>
                  </div>
                  <div className="space-y-1">
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
                            className="flex h-8 w-8 items-center justify-center rounded-full shrink-0"
                            style={{ backgroundColor: `${account.color}15` }}
                          >
                            <Icon className="h-3.5 w-3.5" style={{ color: account.color }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{account.name}</p>
                            <p className="text-[10px] text-muted-foreground capitalize">{account.type}</p>
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
            })
          )}
        </div>
      )}

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
