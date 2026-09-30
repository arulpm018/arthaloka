"use client";

import { Account } from "@/types";
import { OWNER_LABELS } from "@/lib/constants/labels";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import { summarizeAccountsByOwner } from "@/lib/utils/accounts";
import { useAppStore } from "@/store/useAppStore";
import { AccountCard } from "./AccountCard";

interface AccountListProps {
  accounts: Account[];
  onAccountTap: (account: Account) => void;
}

const HIDDEN_PLACEHOLDER = "••••••••";

export const AccountList = ({ accounts, onAccountTap }: AccountListProps) => {
  const hideBalance = useAppStore((s) => s.hideBalance);
  const money = (n: number) => (hideBalance ? HIDDEN_PLACEHOLDER : formatCurrency(n));
  const { total, groups } = summarizeAccountsByOwner(accounts);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-xs text-muted-foreground">Total semua rekening</p>
        <p className="mt-0.5 font-mono text-2xl font-bold tabular-nums">{money(total)}</p>
      </div>

      {groups.map((group) => (
        <section key={group.owner}>
          <div className="mb-2 flex items-baseline justify-between px-1">
            <h3 className="text-sm-label font-medium uppercase tracking-wide text-muted-foreground">
              Rekening {OWNER_LABELS[group.owner]}
            </h3>
            <span className="font-mono text-xs tabular-nums text-muted-foreground">{money(group.subtotal)}</span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {group.accounts.map((account) => (
              <AccountCard key={account.accountId} account={account} onTap={() => onAccountTap(account)} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
};
