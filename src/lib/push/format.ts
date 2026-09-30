import { formatCurrency } from "@/lib/utils/formatCurrency";

export interface PushPayload {
  title: string;
  body: string;
  /** URL yang dibuka saat notifikasi di-tap */
  url: string;
  /** Notif dengan tag sama saling menggantikan di HP */
  tag?: string;
}

export const BUDGET_THRESHOLDS = [80, 100] as const;
export type BudgetThreshold = (typeof BUDGET_THRESHOLDS)[number];

/** Ambang budget (persen) yang sudah tercapai. */
export function budgetThresholdsReached(spent: number, budget: number): BudgetThreshold[] {
  if (budget <= 0) return [];
  const pct = (spent / budget) * 100;
  return BUDGET_THRESHOLDS.filter((t) => pct >= t);
}

export interface RecordedItem {
  type: "expense" | "income";
  amount: number;
  categoryName: string;
  accountName: string;
}

export function partnerTransactionPayload(recorderName: string, items: RecordedItem[]): PushPayload {
  if (items.length === 1) {
    const [it] = items;
    return {
      title: `${recorderName} catat ${formatCurrency(it.amount)}`,
      body: `${it.categoryName} · ${it.accountName}${it.type === "income" ? " (pemasukan)" : ""}`,
      url: "/transactions",
      tag: "partner-tx",
    };
  }
  const total = items.reduce((sum, i) => sum + i.amount, 0);
  return {
    title: `${recorderName} catat ${items.length} transaksi`,
    body: `Total ${formatCurrency(total)}`,
    url: "/transactions",
    tag: "partner-tx",
  };
}

export function budgetPayload(input: {
  categoryId: string;
  categoryName: string;
  threshold: BudgetThreshold;
  spent: number;
  budget: number;
}): PushPayload {
  return {
    title:
      input.threshold >= 100
        ? `${input.categoryName} lewat budget`
        : `${input.categoryName} sudah ${input.threshold}% budget`,
    body: `${formatCurrency(input.spent)} dari ${formatCurrency(input.budget)} bulan ini`,
    url: "/budget",
    tag: `budget-${input.categoryId}`,
  };
}

export const DAILY_REMINDER_PAYLOAD: PushPayload = {
  title: "Udah catat pengeluaran hari ini?",
  body: "Catat sekarang biar sisa budget tetap akurat.",
  url: "/dashboard?add=1",
  tag: "daily-reminder",
};

export function monthlySummaryPayload(input: {
  monthLabel: string;
  income: number;
  expense: number;
  topCategory: string | null;
}): PushPayload {
  return {
    title: `Rekap ${input.monthLabel}`,
    body: `Keluar ${formatCurrency(input.expense)}, masuk ${formatCurrency(input.income)}.${
      input.topCategory ? ` Paling boros: ${input.topCategory}.` : ""
    }`,
    url: "/recap",
    tag: "monthly-summary",
  };
}
