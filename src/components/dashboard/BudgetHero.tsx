"use client";

import Link from "next/link";
import { cn } from "@/lib/utils/cn";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import { budgetLevel, type MonthBudgetSummary } from "@/lib/utils/budget";
import type { BudgetMood } from "@/lib/utils/budgetMood";
import { MOOD_CAPTION, MOOD_EMOJI } from "@/lib/constants/memes";
import { MemeReaction } from "@/components/shared/MemeReaction";

interface BudgetHeroProps {
  summary: MonthBudgetSummary;
  /** Nama bulan, mis. "Oktober" */
  monthLabel: string;
  /** Kondisi keuangan untuk meme; null = tanpa meme */
  mood?: BudgetMood | null;
  /** Penentu GIF (mis. tanggal hari ini) */
  memeSeed?: number;
}

const BAR_COLOR = { normal: "bg-income", warning: "bg-warning", over: "bg-expense" } as const;

/** Kartu utama Beranda: sisa budget bulan ini + jatah per hari. */
export const BudgetHero = ({ summary, monthLabel, mood = null, memeSeed = 0 }: BudgetHeroProps) => {
  if (summary.totalBudget === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-5 text-center">
        <p className="text-sm font-medium">Belum ada budget bulanan</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Atur limit per kategori supaya kelihatan sisa uang bulan ini.
        </p>
        <Link href="/budget" className="mt-3 inline-block text-sm font-medium text-primary">
          Atur budget
        </Link>
      </div>
    );
  }

  const over = summary.remaining < 0;
  const pct = Math.min(100, Math.round((summary.totalSpent / summary.totalBudget) * 100));
  const level = budgetLevel(summary.totalSpent, summary.totalBudget);

  return (
    <Link
      href="/budget"
      className="block rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-5 transition-transform active:scale-[0.99]"
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-muted-foreground">
            {over ? `Budget ${monthLabel} terlewati` : `Sisa budget ${monthLabel}`}
          </p>
          <p className={cn("mt-1 truncate font-mono text-3xl font-bold tabular-nums tracking-tight", over && "text-expense")}>
            {over ? `Lewat ${formatCurrency(Math.abs(summary.remaining))}` : formatCurrency(summary.remaining)}
          </p>
          {mood && (
            <p className="mt-1 text-xs font-medium text-muted-foreground">
              {MOOD_EMOJI[mood]} {MOOD_CAPTION[mood]}
            </p>
          )}
        </div>
        {mood && <MemeReaction mood={mood} seed={memeSeed} className="h-20 w-20 shrink-0 rounded-xl" />}
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full rounded-full transition-all", BAR_COLOR[level])} style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="truncate">
          {formatCurrency(summary.totalSpent)} dari {formatCurrency(summary.totalBudget)}
        </span>
        {!over && summary.daysLeft > 0 && (
          <span className="shrink-0">
            {formatCurrency(summary.perDay)}/hari · {summary.daysLeft} hari lagi
          </span>
        )}
      </div>
    </Link>
  );
};
