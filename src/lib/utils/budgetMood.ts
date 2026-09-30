import type { MonthBudgetSummary } from "./budget";

export type BudgetMood = "hemat" | "aman" | "boros" | "mepet" | "boncos";

/** Selisih (poin persen) antara budget terpakai dan bulan yang sudah lewat. */
const PACE_TOLERANCE = 20;

/**
 * Mood keuangan bulan ini untuk meme di Beranda:
 * lewat budget → boncos; ≥90% terpakai → mepet; belanja lebih cepat dari
 * jalannya bulan → boros; jauh lebih lambat → hemat; selain itu → aman.
 * `null` kalau belum ada budget.
 */
export function budgetMood(summary: MonthBudgetSummary, month: Date): BudgetMood | null {
  if (summary.totalBudget <= 0) return null;
  if (summary.remaining < 0) return "boncos";

  const spentPct = (summary.totalSpent / summary.totalBudget) * 100;
  if (spentPct >= 90) return "mepet";

  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  // daysLeft termasuk hari ini → hari ke-N = daysInMonth - daysLeft + 1
  const elapsedPct = Math.min(100, ((daysInMonth - summary.daysLeft + 1) / daysInMonth) * 100);
  const pace = spentPct - elapsedPct;

  if (pace > PACE_TOLERANCE) return "boros";
  if (pace < -PACE_TOLERANCE) return "hemat";
  return "aman";
}
