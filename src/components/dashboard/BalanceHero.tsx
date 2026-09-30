"use client";

import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { MemeReaction } from "@/components/shared/MemeReaction";
import { OWNER_LABELS } from "@/lib/constants/labels";
import { MOOD_CAPTION, MOOD_EMOJI } from "@/lib/constants/memes";
import { summarizeAccountsByOwner } from "@/lib/utils/accounts";
import type { BudgetMood } from "@/lib/utils/budgetMood";
import { formatCompactAmount, formatCurrency } from "@/lib/utils/formatCurrency";
import { useAppStore } from "@/store/useAppStore";
import type { Account } from "@/types";

interface BalanceHeroProps {
  accounts: Account[];
  /** Kondisi budget bulan ini untuk meme; null = tanpa meme */
  mood: BudgetMood | null;
  /** Penentu GIF (mis. tanggal hari ini) */
  memeSeed: number;
}

/** Kartu utama Beranda: total saldo semua rekening + rincian per pemilik. */
export const BalanceHero = ({ accounts, mood, memeSeed }: BalanceHeroProps) => {
  const hideBalance = useAppStore((s) => s.hideBalance);
  const setHideBalance = useAppStore((s) => s.setHideBalance);
  const { total, groups } = summarizeAccountsByOwner(accounts);

  return (
    <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-5">
      <div className="flex items-start gap-3">
        <Link href="/accounts" className="min-w-0 flex-1">
          <p className="text-xs font-medium text-muted-foreground">Total saldo rekening</p>
          <p className="mt-1 truncate font-mono text-3xl font-bold tabular-nums tracking-tight">
            {hideBalance ? "••••••••" : formatCurrency(total)}
          </p>
          {mood && (
            <p className="mt-1 text-xs font-medium text-muted-foreground">
              {MOOD_EMOJI[mood]} {MOOD_CAPTION[mood]}
            </p>
          )}
        </Link>
        {mood && <MemeReaction mood={mood} seed={memeSeed} className="h-20 w-20 shrink-0 rounded-xl" />}
      </div>

      <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
        <div className="flex min-w-0 flex-1 flex-wrap gap-x-3 gap-y-1">
          {groups.map((g) => (
            <span key={g.owner}>
              {OWNER_LABELS[g.owner]}{" "}
              <span className="font-mono text-foreground">{hideBalance ? "•••" : formatCompactAmount(g.subtotal)}</span>
            </span>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setHideBalance(!hideBalance)}
          aria-label={hideBalance ? "Tampilkan saldo" : "Sembunyikan saldo"}
          className="shrink-0 rounded-full p-1.5 transition-colors hover:bg-muted"
        >
          {hideBalance ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
};
