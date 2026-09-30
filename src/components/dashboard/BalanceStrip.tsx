"use client";

import Link from "next/link";
import { Eye, EyeOff, Wallet } from "lucide-react";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import { useAppStore } from "@/store/useAppStore";

/** Total saldo semua rekening — ringkas, bisa disembunyikan. */
export const BalanceStrip = ({ totalBalance }: { totalBalance: number }) => {
  const hideBalance = useAppStore((s) => s.hideBalance);
  const setHideBalance = useAppStore((s) => s.setHideBalance);

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
      <Link href="/accounts" className="flex min-w-0 flex-1 items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <Wallet className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">Total saldo rekening</p>
          <p className="truncate font-mono text-sm font-semibold tabular-nums">
            {hideBalance ? "••••••••" : formatCurrency(totalBalance)}
          </p>
        </div>
      </Link>
      <button
        type="button"
        onClick={() => setHideBalance(!hideBalance)}
        aria-label={hideBalance ? "Tampilkan saldo" : "Sembunyikan saldo"}
        className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted"
      >
        {hideBalance ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
};
