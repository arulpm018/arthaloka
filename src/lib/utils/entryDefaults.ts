import type { Account, Owner } from "@/types";

export const LAST_ACCOUNT_STORAGE_KEY = "arthafiloka.lastAccountId";

/** Urutkan kategori: paling sering dipakai dulu, seri → `order`. */
export function sortCategoriesByUsage<T extends { categoryId: string; order: number }>(
  categories: T[],
  usage: Record<string, number>
): T[] {
  return [...categories].sort(
    (a, b) => (usage[b.categoryId] ?? 0) - (usage[a.categoryId] ?? 0) || a.order - b.order
  );
}

/**
 * Kategori yang tampil di grid. Kategori terpilih (mis. saat edit) selalu
 * ikut terlihat walau di luar `limit` teratas — menggantikan slot terakhir.
 */
export function pickVisibleCategories<T extends { categoryId: string }>(
  sorted: T[],
  selectedId: string | null,
  showAll: boolean,
  limit: number
): T[] {
  if (showAll) return sorted;
  const top = sorted.slice(0, limit);
  const selected = selectedId ? sorted.find((c) => c.categoryId === selectedId) : undefined;
  if (!selected || top.includes(selected)) return top;
  return [...top.slice(0, limit - 1), selected];
}

/** Rekening terakhir dipakai → rekening pertama milik user → rekening pertama. */
export function resolveDefaultAccountId(
  accounts: Pick<Account, "accountId" | "owner">[],
  lastAccountId: string | null,
  role: Owner | undefined
): string | null {
  if (lastAccountId && accounts.some((a) => a.accountId === lastAccountId)) {
    return lastAccountId;
  }
  const own = role ? accounts.find((a) => a.owner === role) : undefined;
  return (own ?? accounts[0])?.accountId ?? null;
}

/** Nama transaksi = catatan kalau diisi, kalau kosong = nama kategori. */
export function resolveTransactionName(note: string, categoryName: string): string {
  return note.trim() || categoryName;
}

export function readLastAccountId(): string | null {
  try {
    return window.localStorage.getItem(LAST_ACCOUNT_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function writeLastAccountId(id: string): void {
  try {
    window.localStorage.setItem(LAST_ACCOUNT_STORAGE_KEY, id);
  } catch {
    /* storage diblok/penuh — default rekening cukup jatuh ke fallback */
  }
}
