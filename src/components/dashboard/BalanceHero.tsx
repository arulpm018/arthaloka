"use client";

import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { MemeReaction } from "@/components/shared/MemeReaction";
import { MOOD_CAPTION, MOOD_EMOJI } from "@/lib/constants/memes";
import { summarizeAccountsByOwner } from "@/lib/utils/accounts";
import type { BudgetMood } from "@/lib/utils/budgetMood";
import { cn } from "@/lib/utils/cn";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import { useAppStore } from "@/store/useAppStore";
import type { Account } from "@/types";

/** Warna chip caption per mood: hijau aman, oranye waspada, merah lewat. */
const MOOD_CHIP_CLASS: Record<BudgetMood, string> = {
  hemat: "bg-income/10 text-income",
  aman: "bg-income/10 text-income",
  boros: "bg-warning/10 text-warning",
  mepet: "bg-warning/10 text-warning",
  boncos: "bg-expense/10 text-expense",
};

interface BalanceHeroProps {
  accounts: Account[];
  /** Kondisi budget bulan ini untuk meme; null = tanpa meme */
  mood: BudgetMood | null;
  /** Penentu GIF (mis. tanggal hari ini) */
  memeSeed: number;
}

/** Kartu utama Beranda: total saldo semua rekening + chip & meme kondisi budget. */
export const BalanceHero = ({ accounts, mood, memeSeed }: BalanceHeroProps) => {
  const hideBalance = useAppStore((s) => s.hideBalance);
  const setHideBalance = useAppStore((s) => s.setHideBalance);
  const { total } = summarizeAccountsByOwner(accounts);

  return (
    <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-5">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <p className="text-xs font-medium text-muted-foreground">Total saldo rekening</p>
            <button
              type="button"
              onClick={() => setHideBalance(!hideBalance)}
              aria-label={hideBalance ? "Tampilkan saldo" : "Sembunyikan saldo"}
              className="shrink-0 rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted"
            >
              {hideBalance ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </button>
          </div>
          <Link href="/accounts" className="block">
            <p className="truncate font-mono text-2xl font-bold tabular-nums tracking-tight md:text-3xl">
              {hideBalance ? "••••••••" : formatCurrency(total)}
            </p>
          </Link>
        </div>
        {mood && <MemeReaction mood={mood} seed={memeSeed} className="h-20 w-20 shrink-0 rounded-xl" />}
      </div>

      {mood && (
        <span
          className={cn(
            "mt-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
            MOOD_CHIP_CLASS[mood]
          )}
        >
          <span aria-hidden="true">{MOOD_EMOJI[mood]}</span>
          {MOOD_CAPTION[mood]}
        </span>
      )}
    </div>
  );
};
