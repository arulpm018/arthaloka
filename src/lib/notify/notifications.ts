import { OWNER_LABELS } from "@/lib/constants/labels";
import {
  budgetPayload,
  budgetThresholdsReached,
  DAILY_REMINDER_PAYLOAD,
  monthlySummaryPayload,
  partnerTransactionPayload,
  type BudgetThreshold,
  type PushPayload,
} from "@/lib/push/format";
import {
  MONTH_NAMES_ID,
  wibDayRange,
  wibMonthKey,
  wibMonthRange,
  wibParts,
  wibPreviousMonth,
} from "@/lib/utils/wib";
import type { NotifyRepo } from "./repo";

export type PushFn = (uids: string[], payload: PushPayload) => Promise<unknown>;

export interface NotifyDeps {
  repo: NotifyRepo;
  push: PushFn;
}

const MAX_IDS = 50;
const unique = (values: string[]) => values.filter((v, i) => values.indexOf(v) === i);

/**
 * Setelah transaksi baru tersimpan: kabari pasangan, lalu cek ambang budget
 * (80/100%) kategori pengeluaran bulan berjalan — masing-masing sekali per bulan.
 */
export async function notifyTransactionsCreated(
  deps: NotifyDeps,
  input: { recorderUid: string; transactionIds: string[]; now: Date }
): Promise<void> {
  const ids = input.transactionIds.slice(0, MAX_IDS);
  if (ids.length === 0) return;

  const [users, fetched] = await Promise.all([deps.repo.listUsers(), deps.repo.getTransactions(ids)]);
  // Hanya transaksi milik pemanggil — cegah notif atas nama orang lain.
  const transactions = fetched.filter((t) => t.ownerUid === input.recorderUid);
  if (transactions.length === 0) return;

  const recorder = users.find((u) => u.uid === input.recorderUid);
  const partnerUids = users.filter((u) => u.uid !== input.recorderUid).map((u) => u.uid);
  if (recorder && partnerUids.length > 0) {
    await deps.push(
      partnerUids,
      partnerTransactionPayload(
        OWNER_LABELS[recorder.role],
        transactions.map((t) => ({
          type: t.type,
          amount: t.amount,
          categoryName: t.categoryName,
          accountName: t.accountName,
        }))
      )
    );
  }

  const monthKey = wibMonthKey(input.now);
  const categoryIds = unique(
    transactions.filter((t) => t.type === "expense" && wibMonthKey(t.date) === monthKey).map((t) => t.categoryId)
  );
  if (categoryIds.length === 0) return;

  const categories = (await deps.repo.getCategories(categoryIds)).filter((c) => c.budgetAmount > 0);
  if (categories.length === 0) return;

  const { year, month } = wibParts(input.now);
  const { start, end } = wibMonthRange(year, month);
  const spending = await deps.repo.expenseByCategory(start, end);
  const everyone = users.map((u) => u.uid);

  for (const category of categories) {
    const spent = spending[category.id] ?? 0;
    const fresh: BudgetThreshold[] = [];
    for (const threshold of budgetThresholdsReached(spent, category.budgetAmount)) {
      if (await deps.repo.claimOnce(`${monthKey}_${category.id}_${threshold}`)) fresh.push(threshold);
    }
    if (fresh.length === 0) continue;
    // 80 & 100 sama-sama baru → cukup kirim yang tertinggi.
    await deps.push(
      everyone,
      budgetPayload({
        categoryId: category.id,
        categoryName: category.name,
        threshold: fresh[fresh.length - 1],
        spent,
        budget: category.budgetAmount,
      })
    );
  }
}

/** Ingatkan user yang belum mencatat transaksi apa pun hari ini (WIB). */
export async function runDailyReminder(deps: NotifyDeps, now: Date): Promise<string[]> {
  const [users, recorded] = await Promise.all([
    deps.repo.listUsers(),
    deps.repo.recorderUidsSince(wibDayRange(now).start),
  ]);
  const targets = users.map((u) => u.uid).filter((uid) => !recorded.includes(uid));
  if (targets.length > 0) await deps.push(targets, DAILY_REMINDER_PAYLOAD);
  return targets;
}

/** Rekap bulan lalu (WIB) ke semua user. */
export async function runMonthlySummary(deps: NotifyDeps, now: Date): Promise<void> {
  const { year, month } = wibPreviousMonth(now);
  const { start, end } = wibMonthRange(year, month);
  const [users, totals] = await Promise.all([deps.repo.listUsers(), deps.repo.monthTotals(start, end)]);
  const top = Object.entries(totals.expenseByCategoryName).sort((a, b) => b[1] - a[1])[0];
  await deps.push(
    users.map((u) => u.uid),
    monthlySummaryPayload({
      monthLabel: `${MONTH_NAMES_ID[month]} ${year}`,
      income: totals.income,
      expense: totals.expense,
      topCategory: top ? top[0] : null,
    })
  );
}
