"use client";

import { cn } from "@/lib/utils/cn";
import { Account } from "@/types";
import { Wallet, Building2, Smartphone, PiggyBank, TrendingUp } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";

interface AccountCardProps {
  account: Account;
  onTap?: () => void;
}

const HIDDEN_PLACEHOLDER = "••••••••";

const iconMap: Record<string, React.ElementType> = {
  bank: Building2,
  cash: Wallet,
  "e-wallet": Smartphone,
  savings: PiggyBank,
  investment: TrendingUp,
};

const ownerColors: Record<string, string> = {
  arul: "text-arul",
  fifi: "text-fifi",
  shared: "text-shared",
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export const AccountCard = ({ account, onTap }: AccountCardProps) => {
  const Icon = iconMap[account.type] || Wallet;
  const hideBalance = useAppStore((s) => s.hideBalance);

  return (
    <button
      onClick={onTap}
      className="flex w-full items-center gap-3 rounded-card-custom border border-border bg-card p-3 text-left transition-colors hover:bg-accent active:bg-accent"
    >
      <div
        className="flex h-9 w-9 items-center justify-center rounded-full"
        style={{ backgroundColor: `${account.color}20` }}
      >
        <Icon className="h-4 w-4" style={{ color: account.color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{account.name}</p>
        <p className={cn("text-xs capitalize", ownerColors[account.owner])}>
          {account.owner}
        </p>
      </div>
      <p className="text-sm font-mono font-medium tabular-nums">
        {hideBalance ? HIDDEN_PLACEHOLDER : formatCurrency(account.balance)}
      </p>
    </button>
  );
};
