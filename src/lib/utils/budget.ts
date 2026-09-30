import type { BudgetStatus, Category } from "@/types";

/** Ambang peringatan budget (persen) — sama dengan ambang notifikasi. */
export const BUDGET_WARNING_PCT = 80;

export type BudgetLevel = BudgetStatus["status"];

export function budgetLevel(spent: number, budget: number): BudgetLevel {
  if (budget <= 0) return "normal";
  const pct = (spent / budget) * 100;
  if (pct >= 100) return "over";
  if (pct >= BUDGET_WARNING_PCT) return "warning";
  return "normal";
}

/** Sisa hari di `month` termasuk hari ini; 0 untuk bulan yang sudah lewat. */
export function daysLeftInMonth(month: Date, today: Date): number {
  const y = month.getFullYear();
  const m = month.getMonth();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const ty = today.getFullYear();
  const tm = today.getMonth();
  if (ty === y && tm === m) return daysInMonth - today.getDate() + 1;
  if (ty > y || (ty === y && tm > m)) return 0;
  return daysInMonth;
}

export interface MonthBudgetSummary {
  /** Σ limit kategori pengeluaran yang punya limit */
  totalBudget: number;
  /** Σ terpakai pada kategori ber-limit */
  totalSpent: number;
  remaining: number;
  /** Sisa hari termasuk hari ini (0 untuk bulan lampau) */
  daysLeft: number;
  /** Jatah harian dari sisa; 0 kalau sisa ≤ 0 atau bulan sudah lewat */
  perDay: number;
  items: BudgetStatus[];
}

type BudgetCategory = Pick<Category, "categoryId" | "name" | "icon" | "type" | "budgetAmount">;

export function summarizeMonthBudget(
  categories: BudgetCategory[],
  spendingByCategory: Record<string, number>,
  month: Date,
  today: Date
): MonthBudgetSummary {
  const items: BudgetStatus[] = categories
    .filter((c) => c.type !== "income" && c.budgetAmount > 0)
    .map((c) => {
      const spent = spendingByCategory[c.categoryId] ?? 0;
      return {
        categoryId: c.categoryId,
        categoryName: c.name,
        categoryIcon: c.icon,
        budgetAmount: c.budgetAmount,
        spent,
        percentage: Math.round((spent / c.budgetAmount) * 100),
        status: budgetLevel(spent, c.budgetAmount),
      };
    });

  const totalBudget = items.reduce((sum, i) => sum + i.budgetAmount, 0);
  const totalSpent = items.reduce((sum, i) => sum + i.spent, 0);
  const remaining = totalBudget - totalSpent;
  const daysLeft = daysLeftInMonth(month, today);
  const perDay = daysLeft > 0 && remaining > 0 ? Math.floor(remaining / daysLeft) : 0;

  return { totalBudget, totalSpent, remaining, daysLeft, perDay, items };
}

export interface CategorySpendingRow {
  categoryId: string;
  name: string;
  icon: string;
  color: string;
  spent: number;
  /** Limit per bulan; 0 = tanpa limit */
  budget: number;
  percentage: number;
  level: BudgetLevel;
}

type SpendingCategory = Pick<Category, "categoryId" | "name" | "icon" | "color" | "type" | "budgetAmount">;

/**
 * Baris "pengeluaran per kategori" bulan ini: kategori non-pemasukan yang
 * ada pengeluarannya atau punya limit, urut dari pengeluaran terbesar.
 */
export function categorySpendingRows(
  categories: SpendingCategory[],
  spendingByCategory: Record<string, number>
): CategorySpendingRow[] {
  return categories
    .filter((c) => c.type !== "income")
    .map((c) => {
      const spent = spendingByCategory[c.categoryId] ?? 0;
      const budget = c.budgetAmount > 0 ? c.budgetAmount : 0;
      return {
        categoryId: c.categoryId,
        name: c.name,
        icon: c.icon,
        color: c.color,
        spent,
        budget,
        percentage: budget > 0 ? Math.round((spent / budget) * 100) : 0,
        level: budgetLevel(spent, budget),
      };
    })
    .filter((row) => row.spent > 0 || row.budget > 0)
    .sort((a, b) => b.spent - a.spent || a.name.localeCompare(b.name));
}
