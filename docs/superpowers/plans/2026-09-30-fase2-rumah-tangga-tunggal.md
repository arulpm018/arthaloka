# Fase 2 — Rumah Tangga Tunggal (Model, Form Catat, Budget, Beranda) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Satu tampilan keuangan bersama: tidak ada filter/pilihan pemilik, rekening tetap berlabel pemilik, budget per kategori berulang tiap bulan dengan sisa budget di Beranda, dan form catat 3 tap.

**Architecture:** Skema Firestore tidak berubah. `owner` transaksi diturunkan otomatis dari rekening; `budgetScope` diabaikan. Logika murni (budget, default form, ringkasan rekening, label pencatat) dipisah ke `src/lib/utils/*` dan di-test dengan Vitest; komponen UI tipis di atasnya.

**Tech Stack:** Next.js 14, React 18, react-hook-form + zod v4, Zustand, Firestore web SDK, date-fns, Vitest, firebase-admin (khusus script).

**Spec:** `docs/superpowers/specs/2026-09-30-household-finance-redesign-design.md` (bagian "Fase 2")

**Prasyarat:** Fase 1 selesai (`docs/superpowers/plans/2026-09-30-fase1-pangkas-modul.md`).

## Global Constraints

- Jangan ubah skema/data Firestore dari app; jangan ubah `firestore.rules`.
- Jangan baca/ubah file `.env*`.
- Ambang peringatan budget = **80%**, lewat = **100%**.
- Transaksi baru: `owner` = `owner` rekening terpilih; `ownerUid` = uid user login; `name` = catatan kalau diisi, kalau kosong = nama kategori.
- Kategori baru selalu `budgetScope: "shared"`.
- Label pemilik: Arul / Fifi / **Bersama**.
- Setelah tiap task: `npm run lint && npm test && npm run build` hijau.
- Commit message gaya repo + baris `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Form ter-reset saat sedang mengetik** karena snapshot rekening berubah (pasangan mencatat di HP lain → saldo berubah). Harapan: isian tetap. Dipin di Task 3/4 lewat pola `initKeyRef` (reset hanya saat buka/ganti mode/ganti target edit) + langkah manual dua tab.
2. **Edit transaksi yang kategorinya bukan 8 teratas** → kategori terpilih tetap terlihat & tersorot. Dipin oleh test `pickVisibleCategories` (Task 2).
3. **Bulan lampau di halaman Budget/Beranda** → jatah per hari tidak tampil (0), tidak NaN/negatif. Dipin oleh test `daysLeftInMonth`/`summarizeMonthBudget` (Task 1).
4. **Kategori tipe `both` dengan limit** ikut dihitung di sisa budget; kategori `income` tidak. Dipin test Task 1.
5. **Rekening default tersimpan sudah dihapus/nonaktif** → jatuh ke rekening pertama milik user, bukan string kosong. Dipin test `resolveDefaultAccountId` (Task 2).

---

### Task 1: Util budget bulanan + ambang 80%

**Files:**
- Create: `src/lib/utils/budget.ts`, `src/lib/utils/__tests__/budget.test.ts`
- Replace: `src/hooks/useBudgetStatus.ts`
- Modify: `src/components/categories/BudgetProgressBar.tsx`

**Interfaces:**
- Consumes: `BudgetStatus`, `Category` dari `@/types`.
- Produces:
  - `BUDGET_WARNING_PCT = 80`
  - `budgetLevel(spent: number, budget: number): "normal" | "warning" | "over"`
  - `daysLeftInMonth(month: Date, today: Date): number`
  - `interface MonthBudgetSummary { totalBudget; totalSpent; remaining; daysLeft; perDay; items: BudgetStatus[] }` (semua number kecuali `items`)
  - `summarizeMonthBudget(categories, spendingByCategory: Record<string, number>, month: Date, today: Date): MonthBudgetSummary`
  - `useBudgetStatus(month)` → `{ budgets: BudgetStatus[]; summary: MonthBudgetSummary; spendingByCategory: Record<string, number>; isLoading: boolean }`

- [ ] **Step 1: Tulis test gagal — `src/lib/utils/__tests__/budget.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import {
  budgetLevel,
  daysLeftInMonth,
  summarizeMonthBudget,
} from "@/lib/utils/budget";
import type { Category } from "@/types";

type Cat = Pick<Category, "categoryId" | "name" | "icon" | "type" | "budgetAmount">;
const cat = (categoryId: string, type: Cat["type"], budgetAmount: number): Cat => ({
  categoryId,
  name: categoryId,
  icon: "package",
  type,
  budgetAmount,
});

describe("budgetLevel", () => {
  it("tanpa limit selalu normal", () => {
    expect(budgetLevel(999, 0)).toBe("normal");
  });
  it("di bawah 80% normal", () => {
    expect(budgetLevel(79, 100)).toBe("normal");
  });
  it("80% sampai <100% warning", () => {
    expect(budgetLevel(80, 100)).toBe("warning");
    expect(budgetLevel(99.9, 100)).toBe("warning");
  });
  it("100% ke atas over", () => {
    expect(budgetLevel(100, 100)).toBe("over");
    expect(budgetLevel(250, 100)).toBe("over");
  });
});

describe("daysLeftInMonth", () => {
  const sep = new Date(2026, 8, 1);
  it("bulan berjalan: termasuk hari ini", () => {
    expect(daysLeftInMonth(sep, new Date(2026, 8, 30))).toBe(1);
    expect(daysLeftInMonth(sep, new Date(2026, 8, 1))).toBe(30);
  });
  it("bulan lampau: 0", () => {
    expect(daysLeftInMonth(sep, new Date(2026, 9, 5))).toBe(0);
    expect(daysLeftInMonth(sep, new Date(2027, 0, 1))).toBe(0);
  });
  it("bulan depan: jumlah hari penuh", () => {
    expect(daysLeftInMonth(new Date(2026, 9, 1), new Date(2026, 8, 30))).toBe(31);
  });
});

describe("summarizeMonthBudget", () => {
  const categories = [
    cat("makan", "expense", 2_000_000),
    cat("transport", "expense", 500_000),
    cat("hiburan", "expense", 0),
    cat("gaji", "income", 0),
    cat("lainnya", "both", 100_000),
  ];
  const spending = { makan: 1_700_000, transport: 600_000, hiburan: 300_000 };

  it("hanya kategori non-income yang punya limit", () => {
    const s = summarizeMonthBudget(categories, spending, new Date(2026, 8, 1), new Date(2026, 8, 21));
    expect(s.items.map((i) => i.categoryId)).toEqual(["makan", "transport", "lainnya"]);
  });

  it("total, sisa, dan jatah per hari", () => {
    const s = summarizeMonthBudget(categories, spending, new Date(2026, 8, 1), new Date(2026, 8, 21));
    expect(s.totalBudget).toBe(2_600_000);
    expect(s.totalSpent).toBe(2_300_000);
    expect(s.remaining).toBe(300_000);
    expect(s.daysLeft).toBe(10);
    expect(s.perDay).toBe(30_000);
  });

  it("status & persen per kategori", () => {
    const s = summarizeMonthBudget(categories, spending, new Date(2026, 8, 1), new Date(2026, 8, 21));
    const byId = Object.fromEntries(s.items.map((i) => [i.categoryId, i]));
    expect(byId.makan).toMatchObject({ spent: 1_700_000, percentage: 85, status: "warning" });
    expect(byId.transport).toMatchObject({ percentage: 120, status: "over" });
    expect(byId.lainnya).toMatchObject({ spent: 0, percentage: 0, status: "normal" });
  });

  it("sisa negatif → jatah per hari 0", () => {
    const s = summarizeMonthBudget(
      [cat("makan", "expense", 100_000)],
      { makan: 150_000 },
      new Date(2026, 8, 1),
      new Date(2026, 8, 10)
    );
    expect(s.remaining).toBe(-50_000);
    expect(s.perDay).toBe(0);
  });

  it("bulan lampau → jatah per hari 0", () => {
    const s = summarizeMonthBudget(categories, {}, new Date(2026, 7, 1), new Date(2026, 8, 21));
    expect(s.daysLeft).toBe(0);
    expect(s.perDay).toBe(0);
  });
});
```

- [ ] **Step 2: Jalankan, pastikan gagal**

Run: `npx vitest run src/lib/utils/__tests__/budget.test.ts`
Expected: FAIL — `Failed to resolve import "@/lib/utils/budget"`.

- [ ] **Step 3: Implementasi `src/lib/utils/budget.ts`**

```ts
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
```

- [ ] **Step 4: Jalankan, pastikan lulus**

Run: `npx vitest run src/lib/utils/__tests__/budget.test.ts`
Expected: PASS (semua).

- [ ] **Step 5: Ganti isi `src/hooks/useBudgetStatus.ts`**

```ts
"use client";

import { useState, useEffect, useMemo } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
} from "firebase/firestore";
import { startOfMonth, endOfMonth } from "date-fns";
import { db } from "@/lib/firebase";
import { Transaction } from "@/types";
import { summarizeMonthBudget } from "@/lib/utils/budget";
import { useCategories } from "./useCategories";

/**
 * Pengeluaran per kategori di `month` (realtime) + ringkasan budget bulanan.
 * Budget berlaku sama tiap bulan (limit = `category.budgetAmount`).
 */
export function useBudgetStatus(month: Date) {
  const { categories } = useCategories();
  const [spendingByCategory, setSpendingByCategory] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);

  // Primitive dep supaya call-site yang kirim `new Date()` tiap render aman.
  const monthMs = month.getTime();

  useEffect(() => {
    const monthDate = new Date(monthMs);
    const q = query(
      collection(db, "transactions"),
      where("type", "==", "expense"),
      where("date", ">=", Timestamp.fromDate(startOfMonth(monthDate))),
      where("date", "<=", Timestamp.fromDate(endOfMonth(monthDate))),
      orderBy("date", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const spending: Record<string, number> = {};
        snapshot.docs.forEach((doc) => {
          const data = doc.data() as Transaction;
          spending[data.categoryId] = (spending[data.categoryId] || 0) + data.amount;
        });
        setSpendingByCategory(spending);
        setIsLoading(false);
      },
      (error) => {
        console.error("Error fetching budget status:", error);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [monthMs]);

  const summary = useMemo(
    () => summarizeMonthBudget(categories, spendingByCategory, new Date(monthMs), new Date()),
    [categories, spendingByCategory, monthMs]
  );

  return { budgets: summary.items, summary, spendingByCategory, isLoading };
}
```

- [ ] **Step 6: `src/components/categories/BudgetProgressBar.tsx`**
  - Tambah import `import { budgetLevel } from "@/lib/utils/budget";`.
  - Ganti dua baris `const status = percentage >= 100 ? "over" : percentage >= 75 ? "warning" : "normal";` menjadi `const status = budgetLevel(spent, budget);`.

- [ ] **Step 7: Verifikasi**

Run: `npm run lint && npm test && npm run build`
Expected: semua hijau.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "budget bulanan: util ringkasan (sisa, jatah per hari) + ambang peringatan 80%

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Default form catat (kategori tersering, rekening terakhir) + hook pemakaian kategori

**Files:**
- Create: `src/lib/utils/entryDefaults.ts`, `src/lib/utils/__tests__/entryDefaults.test.ts`, `src/hooks/useCategoryUsage.ts`

**Interfaces:**
- Consumes: `Account`, `Owner` dari `@/types`.
- Produces:
  - `sortCategoriesByUsage<T extends { categoryId: string; order: number }>(categories: T[], usage: Record<string, number>): T[]`
  - `pickVisibleCategories<T extends { categoryId: string }>(sorted: T[], selectedId: string | null, showAll: boolean, limit: number): T[]`
  - `resolveDefaultAccountId(accounts: Pick<Account, "accountId" | "owner">[], lastAccountId: string | null, role: Owner | undefined): string | null`
  - `resolveTransactionName(note: string, categoryName: string): string`
  - `readLastAccountId(): string | null`, `writeLastAccountId(id: string): void`, `LAST_ACCOUNT_STORAGE_KEY`
  - `useCategoryUsage(days = 90): Record<string, number>` (jumlah transaksi per `categoryId`)

- [ ] **Step 1: Tulis test gagal — `src/lib/utils/__tests__/entryDefaults.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import {
  pickVisibleCategories,
  resolveDefaultAccountId,
  resolveTransactionName,
  sortCategoriesByUsage,
} from "@/lib/utils/entryDefaults";

const c = (categoryId: string, order: number) => ({ categoryId, order });

describe("sortCategoriesByUsage", () => {
  it("paling sering dipakai dulu, seri → order", () => {
    const sorted = sortCategoriesByUsage(
      [c("a", 0), c("b", 1), c("c", 2), c("d", 3)],
      { c: 5, b: 5, d: 1 }
    );
    expect(sorted.map((x) => x.categoryId)).toEqual(["b", "c", "d", "a"]);
  });
  it("tidak mengubah array asli", () => {
    const input = [c("a", 1), c("b", 0)];
    sortCategoriesByUsage(input, {});
    expect(input.map((x) => x.categoryId)).toEqual(["a", "b"]);
  });
});

describe("pickVisibleCategories", () => {
  const sorted = ["a", "b", "c", "d", "e"].map((id, i) => c(id, i));
  it("potong sesuai limit", () => {
    expect(pickVisibleCategories(sorted, null, false, 3).map((x) => x.categoryId)).toEqual(["a", "b", "c"]);
  });
  it("showAll → semua", () => {
    expect(pickVisibleCategories(sorted, null, true, 3)).toHaveLength(5);
  });
  it("kategori terpilih di luar limit tetap terlihat (ganti slot terakhir)", () => {
    expect(pickVisibleCategories(sorted, "e", false, 3).map((x) => x.categoryId)).toEqual(["a", "b", "e"]);
  });
  it("kategori terpilih di dalam limit → tidak berubah", () => {
    expect(pickVisibleCategories(sorted, "b", false, 3).map((x) => x.categoryId)).toEqual(["a", "b", "c"]);
  });
});

describe("resolveDefaultAccountId", () => {
  const accounts = [
    { accountId: "bersama-1", owner: "shared" as const },
    { accountId: "fifi-1", owner: "fifi" as const },
    { accountId: "arul-1", owner: "arul" as const },
  ];
  it("pakai rekening terakhir kalau masih ada", () => {
    expect(resolveDefaultAccountId(accounts, "fifi-1", "arul")).toBe("fifi-1");
  });
  it("rekening terakhir sudah hilang → rekening pertama milik user", () => {
    expect(resolveDefaultAccountId(accounts, "hilang", "arul")).toBe("arul-1");
  });
  it("tanpa rekening milik user → rekening pertama", () => {
    expect(resolveDefaultAccountId(accounts.slice(0, 1), null, "arul")).toBe("bersama-1");
  });
  it("tanpa rekening sama sekali → null", () => {
    expect(resolveDefaultAccountId([], "x", "arul")).toBeNull();
  });
});

describe("resolveTransactionName", () => {
  it("catatan diisi → dipakai (trim)", () => {
    expect(resolveTransactionName("  Bakso  ", "Makan")).toBe("Bakso");
  });
  it("catatan kosong → nama kategori", () => {
    expect(resolveTransactionName("   ", "Makan")).toBe("Makan");
  });
});
```

- [ ] **Step 2: Jalankan, pastikan gagal**

Run: `npx vitest run src/lib/utils/__tests__/entryDefaults.test.ts`
Expected: FAIL — import `@/lib/utils/entryDefaults` tidak ditemukan.

- [ ] **Step 3: Implementasi `src/lib/utils/entryDefaults.ts`**

```ts
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
```

- [ ] **Step 4: Jalankan, pastikan lulus**

Run: `npx vitest run src/lib/utils/__tests__/entryDefaults.test.ts`
Expected: PASS.

- [ ] **Step 5: Buat `src/hooks/useCategoryUsage.ts`**

```ts
"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, Timestamp, where } from "firebase/firestore";
import { db } from "@/lib/firebase";

/**
 * Jumlah transaksi per `categoryId` dalam `days` hari terakhir (realtime).
 * Dipakai untuk mengurutkan grid kategori di form catat.
 */
export function useCategoryUsage(days = 90): Record<string, number> {
  const [usage, setUsage] = useState<Record<string, number>>({});

  useEffect(() => {
    const since = new Date();
    since.setDate(since.getDate() - days);
    since.setHours(0, 0, 0, 0);

    const q = query(
      collection(db, "transactions"),
      where("date", ">=", Timestamp.fromDate(since))
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const counts: Record<string, number> = {};
        snapshot.docs.forEach((doc) => {
          const categoryId = doc.get("categoryId") as string | undefined;
          if (categoryId) counts[categoryId] = (counts[categoryId] ?? 0) + 1;
        });
        setUsage(counts);
      },
      (error) => console.error("Error fetching category usage:", error)
    );

    return () => unsubscribe();
  }, [days]);

  return usage;
}
```

- [ ] **Step 6: Verifikasi**

Run: `npm run lint && npm test && npm run build`
Expected: semua hijau.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "default form catat: urutan kategori tersering, rekening terakhir, nama dari kategori

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Form catat minimalis (Keluar/Masuk) — 3 tap

**Files:**
- Create: `src/components/transactions/EntryTypeTabs.tsx`
- Replace: `src/components/transactions/TransactionSheet.tsx`, `src/lib/validations/transaction.schema.ts`, `src/components/categories/CategoryGrid.tsx`, `src/components/settings/SettingsScreen.tsx`
- Modify: `src/components/shared/AmountInput.tsx`, `src/components/categories/CategoryForm.tsx`, `src/lib/validations/category.schema.ts`, `src/components/layout/AppShell.tsx`

**Interfaces:**
- Consumes: Task 2 (`sortCategoriesByUsage`, `pickVisibleCategories`, `resolveDefaultAccountId`, `resolveTransactionName`, `readLastAccountId`, `writeLastAccountId`, `useCategoryUsage`).
- Produces:
  - `<TransactionSheet />` tanpa prop — satu instance melayani `activeSheet` `"expense"` & `"income"`.
  - `<EntryTypeTabs value="expense" | "income" | "transfer" />` — pindah jenis via `openSheet`.
  - `AmountInput` prop baru `size?: "default" | "lg"`.
  - `CategoryForm` prop baru `defaultType?: "expense" | "income"`; tidak ada lagi pilihan scope.
  - `transactionSchema` tanpa `owner`/`ownerUid`; `name: z.string()` (boleh kosong).
  - `SettingsScreen` tanpa grup "Akun default".

- [ ] **Step 1: Ganti isi `src/lib/validations/transaction.schema.ts`**

```ts
import { z } from "zod";

/**
 * Form catat transaksi. `name` boleh kosong (diisi nama kategori saat simpan);
 * `owner` & `ownerUid` tidak ada di form — diturunkan dari rekening & user login.
 */
export const transactionSchema = z.object({
  type: z.enum(["expense", "income"]),
  name: z.string(),
  amount: z.number().positive("Nominal harus lebih dari 0"),
  accountId: z.string().min(1, "Pilih rekening"),
  accountName: z.string().min(1),
  categoryId: z.string().min(1, "Pilih kategori"),
  categoryName: z.string().min(1),
  categoryIcon: z.string().min(1),
  date: z.any(), // Firestore Timestamp
  note: z.string().optional(),
});

export type TransactionFormValues = z.infer<typeof transactionSchema>;
```

- [ ] **Step 2: `src/components/shared/AmountInput.tsx`** — nominal besar untuk form catat
  - Di `AmountInputProps` tambahkan:

```ts
  /** "lg" = nominal besar di tengah (form catat). */
  size?: "default" | "lg";
```

  - Destructure props tambah `size = "default",`.
  - Setelah `const hasPrefix = prefix !== "";` tambah `const isLarge = size === "lg";`.
  - `className` pada `<span>` prefix menjadi `cn("absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground", isLarge ? "text-lg" : "text-sm")`.
  - `className` pada `<input>` menjadi:

```tsx
        className={cn(
          "flex w-full rounded-md border border-input bg-background pr-3 py-2 font-mono tabular-nums ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          isLarge ? "h-16 text-center text-3xl font-semibold" : "h-10 text-sm",
          hasPrefix ? (isLarge ? "pl-12" : "pl-10") : "pl-3"
        )}
```

- [ ] **Step 3: Ganti isi `src/components/categories/CategoryGrid.tsx`** (4 kolom, lebih rapat)

```tsx
"use client";

import { cn } from "@/lib/utils/cn";
import { Category } from "@/types";
import { getCategoryIcon } from "@/lib/utils/categoryIcons";

interface CategoryGridProps {
  categories: Category[];
  selected: string | null;
  onSelect: (categoryId: string) => void;
}

export const CategoryGrid = ({ categories, selected, onSelect }: CategoryGridProps) => {
  return (
    <div className="grid grid-cols-4 gap-1.5">
      {categories.map((cat) => {
        const Icon = getCategoryIcon(cat.icon);
        const isSelected = selected === cat.categoryId;
        return (
          <button
            key={cat.categoryId}
            type="button"
            onClick={() => onSelect(cat.categoryId)}
            aria-pressed={isSelected}
            className={cn(
              "flex flex-col items-center gap-1 rounded-lg p-2 text-center transition-colors",
              isSelected ? "bg-accent ring-2 ring-ring" : "hover:bg-accent/50"
            )}
          >
            <div
              className="flex h-8 w-8 items-center justify-center rounded-full"
              style={{ backgroundColor: `${cat.color}15` }}
            >
              <Icon className="h-4 w-4" style={{ color: cat.color }} />
            </div>
            <span className="w-full truncate text-[11px]">{cat.name}</span>
          </button>
        );
      })}
    </div>
  );
};
```

- [ ] **Step 4: Buat `src/components/transactions/EntryTypeTabs.tsx`**

```tsx
"use client";

import { cn } from "@/lib/utils/cn";
import { useAppStore } from "@/store/useAppStore";

type EntryType = "expense" | "income" | "transfer";

const OPTIONS: { value: EntryType; label: string }[] = [
  { value: "expense", label: "Keluar" },
  { value: "income", label: "Masuk" },
  { value: "transfer", label: "Transfer" },
];

/** Segmented Keluar · Masuk · Transfer di atas form catat. */
export const EntryTypeTabs = ({ value }: { value: EntryType }) => {
  const openSheet = useAppStore((s) => s.openSheet);

  return (
    <div role="tablist" aria-label="Jenis catatan" className="grid grid-cols-3 rounded-full bg-muted p-1">
      {OPTIONS.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => !active && openSheet(opt.value)}
            className={cn(
              "rounded-full py-1.5 text-sm font-medium transition-colors",
              active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
};
```

- [ ] **Step 5: Ganti isi `src/components/transactions/TransactionSheet.tsx` seluruhnya**

```tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Timestamp } from "firebase/firestore";
import { format } from "date-fns";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { transactionSchema, TransactionFormValues } from "@/lib/validations/transaction.schema";
import { transactionsService } from "@/lib/firestore/transactions";
import { useAccounts } from "@/hooks/useAccounts";
import { useCategories } from "@/hooks/useCategories";
import { useCategoryUsage } from "@/hooks/useCategoryUsage";
import { useAppStore } from "@/store/useAppStore";
import { OWNER_LABELS } from "@/lib/constants/labels";
import {
  pickVisibleCategories,
  readLastAccountId,
  resolveDefaultAccountId,
  resolveTransactionName,
  sortCategoriesByUsage,
  writeLastAccountId,
} from "@/lib/utils/entryDefaults";
import { AmountInput } from "@/components/shared/AmountInput";
import { CategoryGrid } from "@/components/categories/CategoryGrid";
import { CategoryForm } from "@/components/categories/CategoryForm";
import { DeleteTransactionDialog } from "@/components/transactions/DeleteTransactionDialog";
import { EntryTypeTabs } from "@/components/transactions/EntryTypeTabs";
import { CreateTransactionInput, TransactionType } from "@/types";

const VISIBLE_CATEGORIES = 8;

const MODE_COPY: Record<TransactionType, { title: string; editTitle: string; success: string }> = {
  expense: { title: "Catat Pengeluaran", editTitle: "Edit Pengeluaran", success: "Pengeluaran tersimpan" },
  income: { title: "Catat Pemasukan", editTitle: "Edit Pemasukan", success: "Pemasukan tersimpan" },
};

const toDateInput = (ts: Timestamp) => format(ts.toDate(), "yyyy-MM-dd");

/**
 * Sheet catat/edit pengeluaran & pemasukan — satu instance untuk dua mode
 * (mengikuti `activeSheet`). Wajib diisi cuma nominal + kategori; rekening,
 * tanggal & catatan sudah terisi default. Pemilik transaksi = pemilik rekening.
 */
export const TransactionSheet = () => {
  const { activeSheet, closeSheet, editingTransaction, currentUser } = useAppStore();
  const isOpen = activeSheet === "expense" || activeSheet === "income";
  const mode: TransactionType = activeSheet === "income" ? "income" : "expense";
  const isEditing = !!editingTransaction;
  const copy = MODE_COPY[mode];

  const { accounts } = useAccounts();
  const { categories } = useCategories();
  const usage = useCategoryUsage();
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [categoryFormOpen, setCategoryFormOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    control,
    formState: { errors, isSubmitting },
  } = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      type: mode,
      name: "",
      amount: 0,
      accountId: "",
      accountName: "",
      categoryId: "",
      categoryName: "",
      categoryIcon: "",
      date: Timestamp.now(),
      note: "",
    },
  });

  const selectedCategoryId = watch("categoryId");
  const selectedAccountId = watch("accountId");
  const date = watch("date") as Timestamp | undefined;

  const sortedCategories = useMemo(
    () => sortCategoriesByUsage(categories.filter((c) => c.type === mode || c.type === "both"), usage),
    [categories, mode, usage]
  );
  const visibleCategories = pickVisibleCategories(
    sortedCategories,
    selectedCategoryId || null,
    showAllCategories,
    VISIBLE_CATEGORIES
  );

  // Reset form HANYA saat sheet dibuka / ganti mode / ganti target edit —
  // bukan tiap snapshot rekening berubah (mis. pasangan baru mencatat),
  // supaya isian yang sedang diketik tidak hilang.
  const initKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (!isOpen) {
      initKeyRef.current = null;
      return;
    }
    const key = `${mode}:${editingTransaction?.transactionId ?? "new"}`;
    if (initKeyRef.current === key) return;
    if (!isEditing && accounts.length === 0) return; // tunggu rekening termuat
    initKeyRef.current = key;
    setShowAllCategories(false);

    if (isEditing && editingTransaction) {
      reset({
        type: editingTransaction.type,
        name: editingTransaction.name,
        amount: editingTransaction.amount,
        accountId: editingTransaction.accountId,
        accountName: editingTransaction.accountName,
        categoryId: editingTransaction.categoryId,
        categoryName: editingTransaction.categoryName,
        categoryIcon: editingTransaction.categoryIcon,
        date: editingTransaction.date,
        note: editingTransaction.note || "",
      });
      return;
    }

    const accountId = resolveDefaultAccountId(accounts, readLastAccountId(), currentUser?.role);
    const account = accounts.find((a) => a.accountId === accountId);
    reset({
      type: mode,
      name: "",
      amount: 0,
      accountId: account?.accountId ?? "",
      accountName: account?.name ?? "",
      categoryId: "",
      categoryName: "",
      categoryIcon: "",
      date: Timestamp.now(),
      note: "",
    });
  }, [isOpen, mode, isEditing, editingTransaction, accounts, currentUser, reset]);

  const onSubmit = async (data: TransactionFormValues) => {
    const account = accounts.find((a) => a.accountId === data.accountId);
    if (!account) {
      toast.error("Pilih rekening dulu");
      return;
    }
    const name = resolveTransactionName(data.name, data.categoryName);

    try {
      if (isEditing && editingTransaction) {
        await transactionsService.update(editingTransaction.transactionId, editingTransaction, {
          ...data,
          name,
          owner: account.owner,
        });
        toast.success("Perubahan tersimpan");
      } else {
        const input: CreateTransactionInput = {
          ...data,
          type: mode,
          name,
          date: data.date as Timestamp,
          owner: account.owner,
          ownerUid: currentUser?.uid ?? "",
        };
        await transactionsService.create(input);
        writeLastAccountId(account.accountId);
        toast.success(copy.success);
      }
      closeSheet();
    } catch (error) {
      console.error("Failed to save transaction:", error);
      toast.error("Gagal menyimpan. Coba lagi.");
    }
  };

  const handleCategorySelect = (categoryId: string) => {
    const cat = categories.find((c) => c.categoryId === categoryId);
    if (!cat) return;
    setValue("categoryId", cat.categoryId, { shouldValidate: true });
    setValue("categoryName", cat.name);
    setValue("categoryIcon", cat.icon);
  };

  const handleAccountChange = (accountId: string) => {
    const acc = accounts.find((a) => a.accountId === accountId);
    if (!acc) return;
    setValue("accountId", acc.accountId, { shouldValidate: true });
    setValue("accountName", acc.name);
  };

  const handleDelete = async () => {
    if (!editingTransaction) return;
    setIsDeleting(true);
    try {
      await transactionsService.delete(editingTransaction);
      toast.success("Transaksi dihapus");
      setDeleteDialogOpen(false);
      closeSheet();
    } catch (error) {
      console.error("Failed to delete transaction:", error);
      toast.error("Gagal menghapus. Coba lagi.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Sheet open={isOpen} onOpenChange={(next) => !next && closeSheet()}>
        <SheetContent side="bottom" className="max-h-[92dvh] overflow-y-auto rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>{isEditing ? copy.editTitle : copy.title}</SheetTitle>
          </SheetHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="mt-3 space-y-4">
            {!isEditing && <EntryTypeTabs value={mode} />}

            <div className="space-y-1">
              <Controller
                name="amount"
                control={control}
                render={({ field }) => (
                  <AmountInput value={field.value} onChange={field.onChange} autoFocus={!isEditing} size="lg" />
                )}
              />
              {errors.amount && (
                <p className="text-center text-xs text-destructive">{errors.amount.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <CategoryGrid
                categories={visibleCategories}
                selected={selectedCategoryId || null}
                onSelect={handleCategorySelect}
              />
              <div className="flex items-center justify-between text-xs">
                {sortedCategories.length > VISIBLE_CATEGORIES ? (
                  <button
                    type="button"
                    onClick={() => setShowAllCategories((v) => !v)}
                    className="font-medium text-muted-foreground hover:text-foreground"
                  >
                    {showAllCategories ? "Tampilkan lebih sedikit" : `Semua kategori (${sortedCategories.length})`}
                  </button>
                ) : (
                  <span />
                )}
                <button
                  type="button"
                  onClick={() => setCategoryFormOpen(true)}
                  className="flex items-center gap-0.5 font-medium text-muted-foreground hover:text-foreground"
                >
                  <Plus className="h-3 w-3" />
                  Kategori baru
                </button>
              </div>
              {errors.categoryId && (
                <p className="text-xs text-destructive">{errors.categoryId.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Select value={selectedAccountId || ""} onValueChange={handleAccountChange}>
                <SelectTrigger aria-label="Rekening" className="h-9 rounded-full text-xs">
                  <SelectValue placeholder="Pilih rekening" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((acc) => (
                    <SelectItem key={acc.accountId} value={acc.accountId}>
                      {acc.name} · {OWNER_LABELS[acc.owner]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="date"
                aria-label="Tanggal"
                className="h-9 rounded-full text-xs"
                value={date ? toDateInput(date) : ""}
                onChange={(e) => {
                  if (!e.target.value) return;
                  setValue("date", Timestamp.fromDate(new Date(`${e.target.value}T12:00:00`)));
                }}
              />
            </div>
            {errors.accountId && (
              <p className="text-xs text-destructive">{errors.accountId.message}</p>
            )}

            <Input placeholder="Catatan (opsional)" aria-label="Catatan" {...register("name")} />

            <Button
              type="submit"
              className={mode === "income" ? "w-full bg-income text-white hover:bg-income/90" : "w-full"}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Menyimpan..." : "Simpan"}
            </Button>

            {isEditing && (
              <Button
                type="button"
                variant="ghost"
                className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Hapus Transaksi
              </Button>
            )}
          </form>
        </SheetContent>
      </Sheet>

      <CategoryForm
        open={categoryFormOpen}
        onClose={() => setCategoryFormOpen(false)}
        defaultType={mode}
      />

      <DeleteTransactionDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDelete}
        transactionName={editingTransaction?.name ?? ""}
        isLoading={isDeleting}
      />
    </>
  );
};
```

- [ ] **Step 6: `src/components/layout/AppShell.tsx`** — ganti dua baris `<TransactionSheet mode="expense" />` dan `<TransactionSheet mode="income" />` menjadi satu baris `<TransactionSheet />`.

- [ ] **Step 7: `src/lib/validations/category.schema.ts`** — `budgetScope: z.enum(["arul", "fifi", "shared"]).default("arul"),` → `budgetScope: z.enum(["arul", "fifi", "shared"]).default("shared"),`.

- [ ] **Step 8: `src/components/categories/CategoryForm.tsx`** — kategori selalu bersama
  - `CategoryFormProps` tambah `defaultType?: "expense" | "income";` dan destructure `defaultType = "expense",`.
  - Hapus baris `const defaultOwner = useAppStore((s) => s.defaultOwner);`.
  - Di `defaultValues` dan di cabang `else` effect `reset(...)`: `type: "expense"` → `type: defaultType`, `budgetScope: defaultOwner || "arul"` → `budgetScope: "shared"`.
  - Dependency array effect: ganti `defaultOwner` dengan `defaultType`.
  - Hapus seluruh blok `<div className="space-y-1.5">` yang berisi label "Scope Budget" beserta `<Select>`-nya.
  - Hapus import `OWNER_LABELS`.
  - Blok budget: label `Budget Bulanan (IDR)` → `Limit per bulan`, dan tepat setelah `<Controller … />` tambahkan:

```tsx
            <p className="text-xs text-muted-foreground">Isi 0 kalau tanpa limit.</p>
```

- [ ] **Step 9: Ganti isi `src/components/settings/SettingsScreen.tsx`** — grup "Akun default" dihapus (diganti rekening terakhir)

```tsx
"use client";

import { useState } from "react";
import { useTheme } from "next-themes";
import { Eye, Image as ImageIcon, LogOut, Monitor, Moon, Sun } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { AvatarSection } from "@/components/settings/AvatarSection";
import { SettingsGroup, SettingsRow } from "@/components/settings/SettingsRow";
import { useAuth } from "@/hooks/useAuth";
import { useAppStore } from "@/store/useAppStore";
import { cn } from "@/lib/utils/cn";
import pkg from "../../../package.json";

/** Layar Pengaturan: profil, tema, privasi, tentang, logout. */
export function SettingsScreen() {
  const { logout } = useAuth();
  const { currentUser, hideBalance, setHideBalance } = useAppStore();
  const { theme, setTheme } = useTheme();

  const [logoutConfirm, setLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
    } finally {
      setIsLoggingOut(false);
      setLogoutConfirm(false);
    }
  };

  return (
    <>
      <Header title="Pengaturan" />
      <div className="mx-auto w-full max-w-2xl space-y-6 p-4 pb-20 md:max-w-3xl md:p-6">
        {currentUser ? (
          <AvatarSection user={currentUser} />
        ) : (
          <div className="h-32 rounded-xl bg-muted animate-pulse" />
        )}

        <SettingsGroup title="Tampilan">
          <div className="px-3 py-3">
            <p className="text-xs text-muted-foreground mb-2">Tema</p>
            <div className="grid grid-cols-3 gap-1.5 rounded-lg bg-muted p-1">
              <ThemeOption active={theme === "light"} onClick={() => setTheme("light")} icon={Sun} label="Light" />
              <ThemeOption active={theme === "dark"} onClick={() => setTheme("dark")} icon={Moon} label="Dark" />
              <ThemeOption active={theme === "system"} onClick={() => setTheme("system")} icon={Monitor} label="Auto" />
            </div>
          </div>
        </SettingsGroup>

        <SettingsGroup title="Privasi">
          <SettingsRow
            icon={Eye}
            label="Sembunyikan saldo"
            description="Saldo ditampilkan sebagai bullet"
            htmlFor="hide-balance-toggle"
            trailing={
              <Switch
                id="hide-balance-toggle"
                checked={hideBalance}
                onCheckedChange={setHideBalance}
                aria-label="Sembunyikan saldo otomatis"
              />
            }
          />
        </SettingsGroup>

        <SettingsGroup title="Tentang">
          <div className="flex items-center gap-3 px-3 py-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <ImageIcon className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium leading-tight">Arthafiloka</p>
              <p className="text-xs text-muted-foreground mt-0.5">Keuangan rumah tangga Arul &amp; Fifi 💕</p>
            </div>
            <span className="text-xs text-muted-foreground tabular-nums">v{pkg.version}</span>
          </div>
        </SettingsGroup>

        <Button
          variant="outline"
          className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={() => setLogoutConfirm(true)}
        >
          <LogOut className="h-4 w-4 mr-2" /> Logout
        </Button>
      </div>

      <ConfirmDialog
        open={logoutConfirm}
        onClose={() => setLogoutConfirm(false)}
        onConfirm={handleLogout}
        title="Logout?"
        description="Kamu akan keluar dari akun ini."
        confirmLabel="Logout"
        isLoading={isLoggingOut}
      />
    </>
  );
}

interface ThemeOptionProps {
  active: boolean;
  onClick: () => void;
  icon: typeof Sun;
  label: string;
}

const ThemeOption = ({ active, onClick, icon: Icon, label }: ThemeOptionProps) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      "flex flex-col items-center justify-center gap-1 rounded-md py-2 text-xs font-medium transition-colors",
      active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
    )}
  >
    <Icon className="h-4 w-4" />
    {label}
  </button>
);
```

- [ ] **Step 10: Verifikasi**

Run: `npm run lint && npm test && npm run build`
Expected: semua hijau.

Manual (`npm run dev`, viewport 375px):
- Tap **+** → "Catat Pengeluaran", nominal besar sudah fokus; ketik 45000 → tap kategori → Simpan → toast "Pengeluaran tersimpan", transaksi muncul di Transaksi dengan nama = nama kategori & rekening = rekening default.
- Buka lagi → rekening yang tadi dipakai sudah terpilih.
- Tab "Masuk" → grid berganti ke kategori pemasukan, tombol hijau. Tab "Transfer" → sheet transfer.
- Edit transaksi lama yang kategorinya jarang dipakai → kategori itu tampil & tersorot.
- **Reset saat mengetik**: buka form, ketik nominal; di tab browser lain catat transaksi → isian di tab pertama tetap.

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "form catat minimalis: nominal → kategori → simpan; pemilik dari rekening, rekening terakhir otomatis, tab keluar/masuk/transfer

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Form transfer menyesuaikan

**Files:**
- Modify: `src/components/transactions/TransferSheet.tsx`, `src/lib/validations/transfer.schema.ts`

**Interfaces:**
- Consumes: `EntryTypeTabs` (Task 3), `readLastAccountId` (Task 2).
- Produces: `transferSchema.name` boleh kosong (disimpan sebagai "Transfer"); `owner` transfer = pemilik rekening asal.

- [ ] **Step 1: `src/lib/validations/transfer.schema.ts`** — `name: z.string().min(1, "Keterangan harus diisi"),` → `name: z.string(),`.

- [ ] **Step 2: `src/components/transactions/TransferSheet.tsx`**
  - Import: `import { useEffect, useRef, useState } from "react";`, tambah `import { EntryTypeTabs } from "@/components/transactions/EntryTypeTabs";` dan `import { readLastAccountId } from "@/lib/utils/entryDefaults";`.
  - `const { activeSheet, closeSheet, currentUser, defaultOwner, editingTransfer } = useAppStore();` → hapus `defaultOwner`.
  - Di `defaultValues`: `fromAccountOwner`, `toAccountOwner`, `owner` → `"shared"`.
  - Ganti seluruh `useEffect` reset (yang berisi `if (isOpen) { if (isEditing …) … }`) dengan:

```tsx
  // Reset hanya saat dibuka / ganti target edit (bukan tiap snapshot rekening).
  const initKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (!isOpen) {
      initKeyRef.current = null;
      return;
    }
    const key = editingTransfer?.transferId ?? "new";
    if (initKeyRef.current === key) return;
    if (!isEditing && accounts.length === 0) return; // tunggu rekening termuat
    initKeyRef.current = key;

    if (isEditing && editingTransfer) {
      reset({
        name: editingTransfer.name,
        amount: editingTransfer.amount,
        fromAccountId: editingTransfer.fromAccountId,
        fromAccountName: editingTransfer.fromAccountName,
        fromAccountOwner: editingTransfer.fromAccountOwner,
        toAccountId: editingTransfer.toAccountId,
        toAccountName: editingTransfer.toAccountName,
        toAccountOwner: editingTransfer.toAccountOwner,
        owner: editingTransfer.owner,
        ownerUid: editingTransfer.ownerUid,
        date: editingTransfer.date,
        note: editingTransfer.note || "",
      });
      return;
    }

    const lastId = readLastAccountId();
    const from = accounts.find((a) => a.accountId === lastId);
    reset({
      name: "",
      amount: 0,
      fromAccountId: from?.accountId ?? "",
      fromAccountName: from?.name ?? "",
      fromAccountOwner: from?.owner ?? "shared",
      toAccountId: "",
      toAccountName: "",
      toAccountOwner: "shared",
      owner: from?.owner ?? "shared",
      ownerUid: currentUser?.uid || "",
      date: Timestamp.now(),
      note: "",
    });
  }, [isOpen, isEditing, editingTransfer, accounts, currentUser, reset]);
```

  - `onSubmit`: di awal fungsi tambah `const payload = { ...data, name: data.name.trim() || "Transfer" };` lalu pakai `payload` (bukan `data`) di `transfersService.update(…)` dan `transfersService.create(…)`.
  - `handleFromAccount`: setelah `setValue("fromAccountOwner", acc.owner);` tambah `setValue("owner", acc.owner);`.
  - Judul: `{isEditing ? "Edit Transfer" : "Transfer Antar Akun"}` → `{isEditing ? "Edit Transfer" : "Catat Transfer"}`.
  - Tepat setelah `<form …>` pembuka tambahkan `{!isEditing && <EntryTypeTabs value="transfer" />}`.
  - Blok "Name": hapus `<label>` "Keterangan", ganti placeholder input menjadi `placeholder="Catatan (opsional)"` + `aria-label="Catatan"`.
  - Hapus seluruh blok "Note" (label "Catatan (opsional)" + input `register("note")`) — `note` lama tetap tersimpan lewat `reset`.
  - Label "Dari Akun" → "Dari rekening", "Ke Akun" → "Ke rekening"; placeholder "Pilih akun asal/tujuan" → "Pilih rekening asal/tujuan".
  - Teks tombol submit `"Transfer"` → `"Simpan"`.

- [ ] **Step 3: Verifikasi**

Run: `npm run lint && npm test && npm run build`
Expected: semua hijau.

Manual: + → tab Transfer → rekening asal sudah terisi rekening terakhir; isi nominal & tujuan → Simpan tanpa catatan → di daftar Transfer tampil nama "Transfer"; saldo kedua rekening berubah.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "form transfer: catatan opsional, rekening asal otomatis, pemilik dari rekening asal

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Hapus filter & pilihan pemilik di seluruh app

**Files:**
- Replace: `src/hooks/useTransfers.ts`, `src/hooks/useAccounts.ts`
- Modify: `src/types/index.ts`, `src/hooks/useTransactions.ts`, `src/hooks/useSummary.ts`, `src/hooks/useMonthTransactions.ts`, `src/hooks/useTransactionSummary.ts`, `src/store/useAppStore.ts`, `src/components/transactions/TransactionFilters.tsx`, `src/components/accounts/AccountDetailSheet.tsx`, `src/components/accounts/AccountCard.tsx`, `src/components/ai/AiAssistantSheet.tsx`, `src/lib/constants/labels.ts`

**Interfaces:**
- Consumes: —
- Produces: `TxFilters`/`TransferFilters` tanpa `owner`; `useAccounts()`, `useSummary(month)`, `useMonthTransactions(month)` tanpa argumen owner; store tanpa `defaultOwner`/`setDefaultOwner`; `OWNER_LABELS.shared === "Bersama"`.

- [ ] **Step 1: `src/types/index.ts`** — hapus baris `owner?: "arul" | "fifi" | "shared";` di `TxFilters` dan di `TransferFilters`.

- [ ] **Step 2: Hook transaksi**
  - `src/hooks/useTransactions.ts`: hapus `if (filters.owner) constraints.push(where("owner", "==", filters.owner));`, hapus `const ownerFilter = filters.owner;`, dan hapus `ownerFilter,` dari dependency array.
  - `src/hooks/useSummary.ts`: signature → `export function useSummary(month: Date) {`; hapus `if (owner) constraints.push(where("owner", "==", owner));`; dependency `[monthMs, owner]` → `[monthMs]`.
  - `src/hooks/useMonthTransactions.ts`: signature → `export function useMonthTransactions(month: Date) {`; hapus baris `if (owner) …`; dependency → `[monthMs]`.
  - `src/hooks/useTransactionSummary.ts`: hapus `const ownerFilter = filters.owner;`, hapus `if (ownerFilter) constraints.push(where("owner", "==", ownerFilter));`, hapus `ownerFilter,` dari dependency array.

- [ ] **Step 3: Ganti isi `src/hooks/useTransfers.ts`**

```ts
"use client";

import { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Transfer, TransferFilters } from "@/types";
import { transfersService } from "@/lib/firestore/transfers";

export function useTransfers(filters: TransferFilters) {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const startMs = filters.startDate.getTime();
  const endMs = filters.endDate.getTime();

  useEffect(() => {
    const q = query(
      collection(db, "transfers"),
      where("date", ">=", Timestamp.fromMillis(startMs)),
      where("date", "<=", Timestamp.fromMillis(endMs)),
      orderBy("date", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          ...doc.data(),
          transferId: doc.id,
        })) as Transfer[];
        setTransfers(data);
        setIsLoading(false);
      },
      (error) => {
        console.error("Error fetching transfers:", error);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [startMs, endMs]);

  const remove = async (transfer: Transfer) => {
    await transfersService.delete(transfer);
  };

  return { transfers, isLoading, remove };
}
```

- [ ] **Step 4: Ganti isi `src/hooks/useAccounts.ts`**

```ts
"use client";

import { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Account, CreateAccountInput } from "@/types";
import { accountsService } from "@/lib/firestore/accounts";

/** Semua rekening aktif (milik Arul, Fifi, dan Bersama). */
export function useAccounts() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, "accounts"),
      where("isActive", "==", true),
      orderBy("order", "asc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          ...doc.data(),
          accountId: doc.id,
        })) as Account[];
        setAccounts(data);
        setIsLoading(false);
      },
      (error) => {
        console.error("Error fetching accounts:", error);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const create = async (input: CreateAccountInput): Promise<string> => {
    return accountsService.create(input);
  };

  const update = async (id: string, data: Partial<Account>): Promise<void> => {
    return accountsService.update(id, data);
  };

  const deactivate = async (id: string): Promise<void> => {
    return accountsService.deactivate(id);
  };

  const reorder = async (orderedIds: string[]): Promise<void> => {
    return accountsService.reorder(orderedIds);
  };

  return { accounts, isLoading, create, update, deactivate, reorder };
}
```

- [ ] **Step 5: `src/store/useAppStore.ts`** — hapus `defaultOwner: "arul" | "fifi" | "shared" | null;`, `setDefaultOwner: (…) => void;` (interface), `defaultOwner: null,`, dan `setDefaultOwner: (owner) => set({ defaultOwner: owner }),` (implementasi).

- [ ] **Step 6: `src/components/transactions/TransactionFilters.tsx`**
  - Hapus `import { OWNER_LABELS } from "@/lib/constants/labels";`.
  - Di `activeCount` hapus baris `filters.owner,`.
  - Hapus seluruh `<FacetChip label="Pemilik" … />`.
  - `<div className="grid grid-cols-3 gap-2">` → `<div className="grid grid-cols-2 gap-2">`.
  - `<FacetChip label="Akun"` → `<FacetChip label="Rekening"`.

- [ ] **Step 7: Rekening**
  - `src/components/accounts/AccountDetailSheet.tsx`: hapus baris `owner: account?.owner,` di argumen `useTransactions`; ganti `{account.owner === "shared" ? OWNER_LABELS["shared"] : account.owner}` → `{OWNER_LABELS[account.owner]}`.
  - `src/components/accounts/AccountCard.tsx`: tambah `import { OWNER_LABELS } from "@/lib/constants/labels";`; pada `<p className={cn("text-xs capitalize", ownerColors[account.owner])}>` hapus kata `capitalize`; isi `{account.owner}` → `{OWNER_LABELS[account.owner]}`.

- [ ] **Step 8: `src/components/ai/AiAssistantSheet.tsx`** (ditulis ulang di Fase 3; di sini supaya kompilasi) — hapus `const defaultOwner = useAppStore((s) => s.defaultOwner);` dan ganti `const ownerHint = defaultOwner || role;` → `const ownerHint = role;`.

- [ ] **Step 9: `src/lib/constants/labels.ts`** — `shared: "Bareng",` → `shared: "Bersama",`; JSDoc di atasnya ganti menjadi:

```ts
/**
 * Label pemilik rekening. Database tetap pakai value `"shared"`, UI
 * menampilkan "Bersama".
 */
```

- [ ] **Step 10: Grep sisa pemakaian pemilik sebagai filter**

Run: `grep -rnE "defaultOwner|filters\.owner|ownerFilter|useAccounts\([a-z]|useSummary\([^)]*," src`
Expected: tidak ada output.

- [ ] **Step 11: Verifikasi**

Run: `npm run lint && npm test && npm run build`
Expected: semua hijau.

Manual: Transaksi → baris filter berisi Kategori & Rekening (tanpa Pemilik); transaksi Arul & Fifi tampil bersama.

- [ ] **Step 12: Commit**

```bash
git add -A
git commit -m "satu tampilan bersama: hapus filter/pilihan pemilik dari hook, store & filter transaksi; label shared jadi Bersama

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Halaman Budget (`/budget`) menggantikan Kategori

**Files:**
- Create: `src/app/(app)/budget/page.tsx`
- Delete: `src/app/(app)/categories/`
- Replace: `src/components/categories/CategoryList.tsx`
- Modify: `src/components/layout/BottomNav.tsx`, `src/components/layout/Sidebar.tsx`, `src/components/layout/AppShell.tsx`, `next.config.mjs`

**Interfaces:**
- Consumes: `useBudgetStatus(month)` → `{ summary, spendingByCategory, isLoading }` (Task 1), `CategoryForm`, `BudgetProgressBar`.
- Produces: route `/budget`; `CategoryList` props `{ categories; spendingMap?; onCategoryTap?; onViewTransactions? }` (tanpa `showScope`).

- [ ] **Step 1: Ganti isi `src/components/categories/CategoryList.tsx`**

```tsx
"use client";

import { ReceiptText } from "lucide-react";
import { Category } from "@/types";
import { BudgetProgressBar } from "./BudgetProgressBar";
import { CategoryIcon } from "@/components/shared/CategoryIcon";
import { formatCompactAmount, formatCurrency } from "@/lib/utils/formatCurrency";

interface CategoryListProps {
  categories: Category[];
  /** Pengeluaran bulan terpilih per categoryId */
  spendingMap?: Record<string, number>;
  onCategoryTap?: (category: Category) => void;
  onViewTransactions?: (category: Category) => void;
}

export const CategoryList = ({
  categories,
  spendingMap = {},
  onCategoryTap,
  onViewTransactions,
}: CategoryListProps) => {
  const sections = [
    { title: "Pengeluaran", items: categories.filter((c) => c.type === "expense"), showTotal: true },
    { title: "Keduanya", items: categories.filter((c) => c.type === "both"), showTotal: false },
    { title: "Pemasukan", items: categories.filter((c) => c.type === "income"), showTotal: false },
  ].filter((s) => s.items.length > 0);

  return (
    <div className="space-y-6">
      {sections.map((section) => (
        <section key={section.title} className="space-y-1.5">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {section.title}
            </h3>
            {section.showTotal && (
              <span className="pr-2 font-mono text-xs text-muted-foreground">
                {formatCurrency(section.items.reduce((sum, c) => sum + (c.budgetAmount || 0), 0))}
              </span>
            )}
          </div>
          <div className="space-y-1">
            {section.items.map((cat) => (
              <CategoryItem
                key={cat.categoryId}
                category={cat}
                spent={spendingMap[cat.categoryId] || 0}
                onTap={onCategoryTap}
                onViewTransactions={onViewTransactions}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
};

const CategoryItem = ({
  category: cat,
  spent,
  onTap,
  onViewTransactions,
}: {
  category: Category;
  spent: number;
  onTap?: (category: Category) => void;
  onViewTransactions?: (category: Category) => void;
}) => {
  const hasLimit = cat.budgetAmount > 0;

  return (
    <div className="flex items-center rounded-xl transition-colors hover:bg-accent active:bg-accent">
      <button onClick={() => onTap?.(cat)} className="flex min-w-0 flex-1 items-center gap-3 p-3 text-left">
        <CategoryIcon icon={cat.icon} color={cat.color} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-sm font-medium">{cat.name}</p>
            {hasLimit ? (
              <span className="shrink-0 font-mono text-xs text-muted-foreground">
                {formatCompactAmount(spent)} / {formatCompactAmount(cat.budgetAmount)}
              </span>
            ) : cat.type !== "income" ? (
              <span className="shrink-0 text-xs text-muted-foreground">
                Tanpa limit{spent > 0 ? ` · ${formatCompactAmount(spent)}` : ""}
              </span>
            ) : null}
          </div>
          {hasLimit && <BudgetProgressBar spent={spent} budget={cat.budgetAmount} compact />}
        </div>
      </button>
      {onViewTransactions && (
        <button
          onClick={() => onViewTransactions(cat)}
          className="mr-1 shrink-0 rounded-lg p-2.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label={`Lihat transaksi kategori ${cat.name}`}
        >
          <ReceiptText className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};
```

- [ ] **Step 2: Buat `src/app/(app)/budget/page.tsx`**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/layout/Header";
import { MonthPicker } from "@/components/shared/MonthPicker";
import { CategoryList } from "@/components/categories/CategoryList";
import { CategoryForm } from "@/components/categories/CategoryForm";
import { BudgetProgressBar } from "@/components/categories/BudgetProgressBar";
import { LoadingState } from "@/components/shared/LoadingState";
import { EmptyState } from "@/components/shared/EmptyState";
import { useCategories } from "@/hooks/useCategories";
import { useBudgetStatus } from "@/hooks/useBudgetStatus";
import { useAppStore } from "@/store/useAppStore";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import { Category } from "@/types";

/** Budget bersama: limit per kategori (berlaku tiap bulan) + progres bulan terpilih. */
export default function BudgetPage() {
  const router = useRouter();
  const { categories, isLoading } = useCategories();
  const { selectedMonth, setSelectedMonth } = useAppStore();
  const { summary, spendingByCategory } = useBudgetStatus(selectedMonth);

  const [formOpen, setFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const handleClose = () => {
    setFormOpen(false);
    setEditingCategory(null);
  };

  return (
    <>
      <Header title="Budget">
        <MonthPicker value={selectedMonth} onChange={setSelectedMonth} />
      </Header>
      <div className="mx-auto w-full max-w-4xl space-y-4 p-4 md:max-w-5xl md:p-6">
        {summary.totalBudget > 0 && (
          <div className="space-y-1 rounded-xl border border-border bg-card p-4">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-sm text-muted-foreground">Terpakai</p>
              <p className="font-mono text-sm tabular-nums">
                {formatCurrency(summary.totalSpent)} / {formatCurrency(summary.totalBudget)}
              </p>
            </div>
            <BudgetProgressBar spent={summary.totalSpent} budget={summary.totalBudget} compact />
          </div>
        )}

        {isLoading ? (
          <LoadingState variant="list" count={8} />
        ) : categories.length === 0 ? (
          <EmptyState
            icon={Tag}
            title="Belum ada kategori"
            description="Tambahkan kategori lalu isi limit per bulan"
            action={
              <Button size="sm" onClick={() => setFormOpen(true)}>
                <Plus className="mr-1 h-4 w-4" />
                Tambah
              </Button>
            }
          />
        ) : (
          <CategoryList
            categories={categories}
            spendingMap={spendingByCategory}
            onCategoryTap={(c) => {
              setEditingCategory(c);
              setFormOpen(true);
            }}
            onViewTransactions={(c) => router.push(`/transactions?categoryId=${c.categoryId}`)}
          />
        )}
      </div>

      <Button
        size="sm"
        className="fixed bottom-24 right-4 rounded-full shadow-lg md:bottom-6"
        onClick={() => setFormOpen(true)}
      >
        <Plus className="mr-1 h-4 w-4" />
        Kategori
      </Button>

      <CategoryForm open={formOpen} onClose={handleClose} editingCategory={editingCategory} />
    </>
  );
}
```

- [ ] **Step 3: Hapus halaman lama**

```bash
git rm -r -q "src/app/(app)/categories"
```

- [ ] **Step 4: Ganti tautan `/categories` → `/budget`**
  - `src/components/layout/BottomNav.tsx`: `{ href: "/categories", label: "Budget", icon: PieChart }` → `{ href: "/budget", label: "Budget", icon: PieChart }`.
  - `src/components/layout/Sidebar.tsx`: sama.
  - `src/components/layout/AppShell.tsx`: `"/categories": "Budget",` → `"/budget": "Budget",`.
  - `next.config.mjs` `redirects()` tambah: `{ source: "/categories", destination: "/budget", permanent: false },`

- [ ] **Step 5: Grep**

Run: `grep -rn "/categories\|showScope\|budgetScope ===" src`
Expected: tidak ada output.

- [ ] **Step 6: Verifikasi**

Run: `npm run lint && npm test && npm run build`
Expected: semua hijau.

Manual: `/budget` → kartu "Terpakai X / Y", daftar kategori dengan progres; kategori tanpa limit menampilkan "Tanpa limit"; tap kategori → form tanpa pilihan scope, ubah limit → progres ikut berubah; ganti bulan ke bulan lalu → angka bulan lalu.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "halaman budget bersama menggantikan kategori: limit per kategori berulang, tanpa scope pemilik

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Beranda baru — sisa budget, kategori mepet, transaksi terakhir

**Files:**
- Create: `src/components/dashboard/BudgetHero.tsx`, `src/components/dashboard/BudgetWatchlist.tsx`, `src/components/dashboard/BalanceStrip.tsx`
- Replace: `src/app/(app)/dashboard/page.tsx`
- Modify: `src/components/dashboard/RecentTransactions.tsx`
- Delete: `src/components/dashboard/SummaryCards.tsx`, `src/components/dashboard/SpendingByCategory.tsx`

**Interfaces:**
- Consumes: `MonthBudgetSummary`, `budgetLevel` (Task 1); `useBudgetStatus`; `BudgetProgressBar`; `CategoryIcon`.
- Produces: `/dashboard?add=1` membuka form catat pengeluaran lalu membersihkan query (dipakai notifikasi pengingat Fase 4). `RecentTransactions` prop baru `limit?: number` (default 10).

- [ ] **Step 1: Buat `src/components/dashboard/BudgetHero.tsx`**

```tsx
"use client";

import Link from "next/link";
import { cn } from "@/lib/utils/cn";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import { budgetLevel, type MonthBudgetSummary } from "@/lib/utils/budget";

interface BudgetHeroProps {
  summary: MonthBudgetSummary;
  /** Nama bulan, mis. "Oktober" */
  monthLabel: string;
}

const BAR_COLOR = { normal: "bg-income", warning: "bg-warning", over: "bg-expense" } as const;

/** Kartu utama Beranda: sisa budget bulan ini + jatah per hari. */
export const BudgetHero = ({ summary, monthLabel }: BudgetHeroProps) => {
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
      <p className="text-xs font-medium text-muted-foreground">
        {over ? `Budget ${monthLabel} terlewati` : `Sisa budget ${monthLabel}`}
      </p>
      <p className={cn("mt-1 truncate font-mono text-3xl font-bold tabular-nums tracking-tight", over && "text-expense")}>
        {over ? `Lewat ${formatCurrency(Math.abs(summary.remaining))}` : formatCurrency(summary.remaining)}
      </p>
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
```

- [ ] **Step 2: Buat `src/components/dashboard/BudgetWatchlist.tsx`**

```tsx
"use client";

import Link from "next/link";
import { BudgetProgressBar } from "@/components/categories/BudgetProgressBar";
import { CategoryIcon } from "@/components/shared/CategoryIcon";
import { formatCompactAmount } from "@/lib/utils/formatCurrency";
import type { BudgetStatus } from "@/types";

const MAX_ITEMS = 3;

/** Kategori yang sudah ≥80% budget — maksimal 3, paling kritis dulu. */
export const BudgetWatchlist = ({ items }: { items: BudgetStatus[] }) => {
  const watched = items
    .filter((i) => i.status !== "normal")
    .sort((a, b) => b.percentage - a.percentage)
    .slice(0, MAX_ITEMS);

  if (watched.length === 0) return null;

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-sm font-medium">Perlu diperhatikan</h2>
        <Link href="/budget" className="text-xs text-muted-foreground hover:text-foreground">
          Lihat semua
        </Link>
      </div>
      <div className="divide-y divide-border rounded-xl border border-border bg-card">
        {watched.map((b) => (
          <Link
            key={b.categoryId}
            href={`/transactions?categoryId=${b.categoryId}`}
            className="flex items-center gap-3 p-3 transition-colors hover:bg-accent/50"
          >
            <CategoryIcon icon={b.categoryIcon} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-medium">{b.categoryName}</p>
                <span className="shrink-0 font-mono text-xs text-muted-foreground">
                  {formatCompactAmount(b.spent)} / {formatCompactAmount(b.budgetAmount)}
                </span>
              </div>
              <BudgetProgressBar spent={b.spent} budget={b.budgetAmount} compact />
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
};
```

- [ ] **Step 3: Buat `src/components/dashboard/BalanceStrip.tsx`**

```tsx
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
```

- [ ] **Step 4: `src/components/dashboard/RecentTransactions.tsx`**
  - Di `RecentTransactionsProps` tambah `/** Jumlah item maksimal (default 10) */ limit?: number;`.
  - Destructure tambah `limit = 10,`.
  - `const recent = merged.slice(0, 10);` → `const recent = merged.slice(0, limit);`.

- [ ] **Step 5: Ganti isi `src/app/(app)/dashboard/page.tsx`**

```tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { startOfMonth, endOfMonth, format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { CalendarRange, ChevronRight } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Logo } from "@/components/shared/Logo";
import { BudgetHero } from "@/components/dashboard/BudgetHero";
import { BudgetWatchlist } from "@/components/dashboard/BudgetWatchlist";
import { BalanceStrip } from "@/components/dashboard/BalanceStrip";
import { RecentTransactions } from "@/components/dashboard/RecentTransactions";
import { LoadingState } from "@/components/shared/LoadingState";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { useBudgetStatus } from "@/hooks/useBudgetStatus";
import { useTransactions } from "@/hooks/useTransactions";
import { useTransfers } from "@/hooks/useTransfers";
import { useAccounts } from "@/hooks/useAccounts";
import { useAppStore } from "@/store/useAppStore";
import { Transfer } from "@/types";

export default function DashboardPage() {
  const router = useRouter();
  const openSheet = useAppStore((s) => s.openSheet);
  // Beranda selalu fokus ke bulan berjalan — bulan lain lewat Rekap/Budget.
  const currentMonth = useMemo(() => new Date(), []);
  const [deleteTransferTarget, setDeleteTransferTarget] = useState<Transfer | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Deep-link dari notifikasi pengingat: /dashboard?add=1 langsung buka form catat.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("add") === "1") {
      openSheet("expense");
      router.replace("/dashboard");
    }
  }, [openSheet, router]);

  const { accounts, isLoading: accountsLoading } = useAccounts();
  const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0);
  const { summary, isLoading: budgetLoading } = useBudgetStatus(currentMonth);
  const { transactions, isLoading: txLoading } = useTransactions({
    startDate: startOfMonth(currentMonth),
    endDate: endOfMonth(currentMonth),
  });
  const { transfers, isLoading: tfLoading, remove: removeTransfer } = useTransfers({
    startDate: startOfMonth(currentMonth),
    endDate: endOfMonth(currentMonth),
  });

  const isLoading = accountsLoading || budgetLoading || txLoading || tfLoading;
  const monthLabel = format(currentMonth, "MMMM", { locale: idLocale });

  const handleDeleteTransfer = async () => {
    if (!deleteTransferTarget) return;
    setIsDeleting(true);
    try {
      await removeTransfer(deleteTransferTarget);
    } finally {
      setIsDeleting(false);
      setDeleteTransferTarget(null);
    }
  };

  return (
    <>
      <Header titleSlot={<Logo size="lg" />} />

      <div className="mx-auto w-full max-w-4xl space-y-4 p-4 md:max-w-5xl md:p-6">
        {isLoading ? (
          <LoadingState variant="page" />
        ) : (
          <>
            <BudgetHero summary={summary} monthLabel={monthLabel} />
            <BudgetWatchlist items={summary.items} />
            <RecentTransactions
              transactions={transactions}
              transfers={transfers}
              limit={5}
              onEdit={(tx) => openSheet(tx.type, tx)}
              onEditTransfer={(tf) => openSheet("transfer", tf)}
              onDeleteTransfer={(tf) => setDeleteTransferTarget(tf)}
            />
            <BalanceStrip totalBalance={totalBalance} />
            <Link
              href="/recap"
              className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:bg-accent/50 active:bg-accent"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <CalendarRange className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">Rekap Bulanan</p>
                <p className="text-xs text-muted-foreground">Arus kas, kategori & insight bulan ini</p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </Link>
          </>
        )}
      </div>

      <ConfirmDialog
        open={!!deleteTransferTarget}
        onClose={() => setDeleteTransferTarget(null)}
        onConfirm={handleDeleteTransfer}
        title="Hapus Transfer?"
        description="Saldo kedua rekening akan dikembalikan. Tindakan ini tidak bisa dibatalkan."
        isLoading={isDeleting}
      />
    </>
  );
}
```

- [ ] **Step 6: Hapus komponen lama**

```bash
git rm -q src/components/dashboard/SummaryCards.tsx src/components/dashboard/SpendingByCategory.tsx
```

Catatan: `src/components/dashboard/SpendingDonut.tsx` sudah tidak dipakai sejak sebelum redesign — **jangan dihapus** di sini (bukan bagian perubahan ini); sebutkan di laporan akhir.

- [ ] **Step 7: Verifikasi**

Run: `npm run lint && npm test && npm run build`
Expected: semua hijau.

Manual: Beranda menampilkan (urut) kartu "Sisa budget {bulan}" + jatah/hari, "Perlu diperhatikan" (hanya kalau ada kategori ≥80%), 5 transaksi terakhir, total saldo dengan mata, kartu Rekap. Buka `http://localhost:1806/dashboard?add=1` → form catat terbuka dan URL kembali `/dashboard`.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "beranda minimalis: sisa budget bulan ini + jatah per hari, kategori mepet, 5 transaksi terakhir; ?add=1 buka form catat

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Rekening per pemilik + label "dicatat oleh"

**Files:**
- Create: `src/lib/utils/accounts.ts`, `src/lib/utils/__tests__/accounts.test.ts`, `src/lib/utils/recorder.ts`, `src/lib/utils/__tests__/recorder.test.ts`, `src/hooks/useRecorderLabel.ts`
- Replace: `src/components/accounts/AccountList.tsx`
- Modify: `src/components/transactions/TransactionItem.tsx`

**Interfaces:**
- Consumes: `OWNER_LABELS`, store `currentUser`/`partner`.
- Produces:
  - `summarizeAccountsByOwner(accounts: Pick<Account,"owner"|"balance">[] & …)` → `{ total: number; groups: { owner: Owner; subtotal: number; accounts: T[] }[] }` (urutan arul, fifi, shared; grup kosong dibuang)
  - `recorderLabel(uid, currentUser, partner): string | null`
  - `useRecorderLabel(): (uid: string | undefined) => string | null`

- [ ] **Step 1: Tulis test gagal — `src/lib/utils/__tests__/accounts.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { summarizeAccountsByOwner } from "@/lib/utils/accounts";

const acc = (accountId: string, owner: "arul" | "fifi" | "shared", balance: number) => ({
  accountId,
  owner,
  balance,
});

describe("summarizeAccountsByOwner", () => {
  it("urut Arul, Fifi, Bersama dengan subtotal; total keseluruhan", () => {
    const res = summarizeAccountsByOwner([
      acc("s1", "shared", 300),
      acc("a1", "arul", 100),
      acc("f1", "fifi", 50),
      acc("a2", "arul", 25),
    ]);
    expect(res.total).toBe(475);
    expect(res.groups.map((g) => [g.owner, g.subtotal, g.accounts.length])).toEqual([
      ["arul", 125, 2],
      ["fifi", 50, 1],
      ["shared", 300, 1],
    ]);
  });
  it("grup kosong tidak ditampilkan", () => {
    const res = summarizeAccountsByOwner([acc("a1", "arul", 10)]);
    expect(res.groups.map((g) => g.owner)).toEqual(["arul"]);
  });
});
```

- [ ] **Step 2: Tulis test gagal — `src/lib/utils/__tests__/recorder.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { recorderLabel } from "@/lib/utils/recorder";

const me = { uid: "u-arul", role: "arul" as const };
const partner = { uid: "u-fifi", role: "fifi" as const };

describe("recorderLabel", () => {
  it("uid sendiri → label role sendiri", () => {
    expect(recorderLabel("u-arul", me, partner)).toBe("Arul");
  });
  it("uid pasangan → label role pasangan", () => {
    expect(recorderLabel("u-fifi", me, partner)).toBe("Fifi");
  });
  it("uid tak dikenal / kosong → null", () => {
    expect(recorderLabel("lain", me, partner)).toBeNull();
    expect(recorderLabel(undefined, me, null)).toBeNull();
  });
});
```

- [ ] **Step 3: Jalankan, pastikan gagal**

Run: `npx vitest run src/lib/utils/__tests__/accounts.test.ts src/lib/utils/__tests__/recorder.test.ts`
Expected: FAIL — modul tidak ditemukan.

- [ ] **Step 4: Implementasi `src/lib/utils/accounts.ts`**

```ts
import type { Account, Owner } from "@/types";

const OWNER_ORDER: Owner[] = ["arul", "fifi", "shared"];

/** Kelompokkan rekening per pemilik (Arul, Fifi, Bersama) + subtotal & total. */
export function summarizeAccountsByOwner<T extends Pick<Account, "owner" | "balance">>(accounts: T[]) {
  const groups = OWNER_ORDER.map((owner) => {
    const items = accounts.filter((a) => a.owner === owner);
    return {
      owner,
      subtotal: items.reduce((sum, a) => sum + a.balance, 0),
      accounts: items,
    };
  }).filter((g) => g.accounts.length > 0);

  return { total: accounts.reduce((sum, a) => sum + a.balance, 0), groups };
}
```

- [ ] **Step 5: Implementasi `src/lib/utils/recorder.ts`**

```ts
import { OWNER_LABELS } from "@/lib/constants/labels";
import type { User } from "@/types";

type Person = Pick<User, "uid" | "role"> | null | undefined;

/** Nama pencatat transaksi dari `ownerUid` (Arul/Fifi); null kalau tak dikenal. */
export function recorderLabel(uid: string | undefined, currentUser: Person, partner: Person): string | null {
  if (!uid) return null;
  if (currentUser && uid === currentUser.uid) return OWNER_LABELS[currentUser.role];
  if (partner && uid === partner.uid) return OWNER_LABELS[partner.role];
  return null;
}
```

- [ ] **Step 6: Jalankan, pastikan lulus**

Run: `npx vitest run src/lib/utils/__tests__/accounts.test.ts src/lib/utils/__tests__/recorder.test.ts`
Expected: PASS.

- [ ] **Step 7: Buat `src/hooks/useRecorderLabel.ts`**

```ts
"use client";

import { useCallback } from "react";
import { useAppStore } from "@/store/useAppStore";
import { recorderLabel } from "@/lib/utils/recorder";

/** `(ownerUid) => "Arul" | "Fifi" | null` berdasarkan user login & pasangan. */
export function useRecorderLabel() {
  const currentUser = useAppStore((s) => s.currentUser);
  const partner = useAppStore((s) => s.partner);
  return useCallback(
    (uid: string | undefined) => recorderLabel(uid, currentUser, partner),
    [currentUser, partner]
  );
}
```

- [ ] **Step 8: Ganti isi `src/components/accounts/AccountList.tsx`**

```tsx
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
```

- [ ] **Step 9: `src/components/transactions/TransactionItem.tsx`**
  - Tambah import `import { useRecorderLabel } from "@/hooks/useRecorderLabel";`.
  - Di awal komponen: `const recorderOf = useRecorderLabel();` lalu `const recorder = recorderOf(transaction.ownerUid);`.
  - Baris subjudul `{transaction.categoryName}` menjadi:

```tsx
              {transaction.categoryName}
              {recorder && ` · dicatat ${recorder}`}
```

- [ ] **Step 10: Verifikasi**

Run: `npm run lint && npm test && npm run build`
Expected: semua hijau.

Manual: `/accounts` → kartu total + grup "Rekening Arul / Fifi / Bersama" dengan subtotal (disembunyikan kalau "Sembunyikan saldo" aktif); daftar transaksi menampilkan "Makan · dicatat Fifi".

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "rekening dikelompokkan per pemilik dengan subtotal; transaksi tampil 'dicatat oleh'

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Script gabung kategori duplikat

**Files:**
- Create: `scripts/lib/categoryMerge.mjs`, `scripts/lib/categoryMerge.test.mjs`, `scripts/merge-duplicate-categories.mjs`
- Modify: `package.json` (dependency `firebase-admin`), `README.md`

**Interfaces:**
- Consumes: —
- Produces: `duplicateKey(category)`, `planCategoryMerges(categories, txCountByCategory) → { keep, remove[], budgetAmount }[]`; dependency `firebase-admin` (dipakai juga Fase 3 & 4).

- [ ] **Step 1: Install dependency**

Run: `npm install firebase-admin`
Expected: `firebase-admin` masuk `dependencies` di `package.json`.

- [ ] **Step 2: Tulis test gagal — `scripts/lib/categoryMerge.test.mjs`**

```js
import { describe, it, expect } from "vitest";
import { duplicateKey, planCategoryMerges } from "./categoryMerge.mjs";

const cat = (id, name, type, order, budgetAmount = 0) => ({ id, name, type, order, budgetAmount, icon: "package" });

describe("duplicateKey", () => {
  it("abaikan huruf besar/kecil & spasi berlebih", () => {
    expect(duplicateKey(cat("1", "  Food   &  Drink ", "expense", 0))).toBe("food & drink|expense");
  });
  it("tipe beda → kunci beda", () => {
    expect(duplicateKey(cat("1", "Lainnya", "expense", 0))).not.toBe(duplicateKey(cat("2", "Lainnya", "income", 0)));
  });
});

describe("planCategoryMerges", () => {
  it("pertahankan yang paling banyak transaksi, limit = maksimum grup", () => {
    const plans = planCategoryMerges(
      [cat("a", "Makan", "expense", 0, 1_000_000), cat("b", "makan", "expense", 5, 2_000_000), cat("c", "Transport", "expense", 1)],
      { a: 3, b: 10 }
    );
    expect(plans).toHaveLength(1);
    expect(plans[0].keep.id).toBe("b");
    expect(plans[0].remove.map((r) => r.id)).toEqual(["a"]);
    expect(plans[0].budgetAmount).toBe(2_000_000);
  });
  it("jumlah transaksi seri → order terkecil", () => {
    const plans = planCategoryMerges([cat("x", "Hiburan", "expense", 9), cat("y", "Hiburan", "expense", 2)], {});
    expect(plans[0].keep.id).toBe("y");
  });
  it("tanpa duplikat → kosong", () => {
    expect(planCategoryMerges([cat("a", "A", "expense", 0), cat("b", "B", "expense", 1)], {})).toEqual([]);
  });
});
```

- [ ] **Step 3: Jalankan, pastikan gagal**

Run: `npx vitest run scripts/lib/categoryMerge.test.mjs`
Expected: FAIL — `./categoryMerge.mjs` tidak ditemukan.

- [ ] **Step 4: Implementasi `scripts/lib/categoryMerge.mjs`**

```js
/**
 * Logika murni penggabungan kategori duplikat (sisa era kategori per pemilik).
 * Dipisah dari script supaya bisa di-test tanpa Firestore.
 */

/** Kunci duplikat: nama (lowercase, spasi dirapikan) + tipe. */
export function duplicateKey(category) {
  return `${category.name.trim().toLowerCase().replace(/\s+/g, " ")}|${category.type}`;
}

/**
 * @param {{ id: string, name: string, type: string, order?: number, budgetAmount?: number }[]} categories kategori aktif
 * @param {Record<string, number>} txCountByCategory jumlah transaksi per id kategori
 * @returns {{ keep: object, remove: object[], budgetAmount: number }[]}
 */
export function planCategoryMerges(categories, txCountByCategory) {
  const groups = new Map();
  for (const category of categories) {
    const key = duplicateKey(category);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(category);
  }

  const plans = [];
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    const sorted = [...group].sort(
      (a, b) =>
        (txCountByCategory[b.id] ?? 0) - (txCountByCategory[a.id] ?? 0) ||
        (a.order ?? 0) - (b.order ?? 0)
    );
    const [keep, ...remove] = sorted;
    plans.push({
      keep,
      remove,
      budgetAmount: Math.max(...group.map((c) => c.budgetAmount ?? 0)),
    });
  }
  return plans;
}
```

- [ ] **Step 5: Jalankan, pastikan lulus**

Run: `npx vitest run scripts/lib/categoryMerge.test.mjs`
Expected: PASS.

- [ ] **Step 6: Buat `scripts/merge-duplicate-categories.mjs`**

```js
#!/usr/bin/env node
/**
 * Gabungkan kategori duplikat (nama + tipe sama) sisa era kategori per pemilik.
 *
 *   node scripts/merge-duplicate-categories.mjs           # dry-run (hanya tampilkan rencana)
 *   node scripts/merge-duplicate-categories.mjs --apply   # eksekusi
 *
 * Kredensial (salah satu):
 *   FIREBASE_SERVICE_ACCOUNT='{"type":"service_account",...}'   (JSON satu baris)
 *   FIREBASE_SERVICE_ACCOUNT=/path/ke/service-account.json
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/ke/service-account.json
 */
import { readFileSync } from "node:fs";
import { applicationDefault, cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { planCategoryMerges } from "./lib/categoryMerge.mjs";

const apply = process.argv.includes("--apply");
const raw = process.env.FIREBASE_SERVICE_ACCOUNT?.trim();
const credential = raw
  ? cert(JSON.parse(raw.startsWith("{") ? raw : readFileSync(raw, "utf8")))
  : applicationDefault();

initializeApp({ credential });
const db = getFirestore();

const catSnap = await db.collection("categories").where("isActive", "==", true).get();
const categories = catSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

const txSnap = await db.collection("transactions").select("categoryId").get();
const txCount = {};
const txIds = {};
for (const d of txSnap.docs) {
  const categoryId = d.get("categoryId");
  if (!categoryId) continue;
  txCount[categoryId] = (txCount[categoryId] ?? 0) + 1;
  (txIds[categoryId] ??= []).push(d.id);
}

const plans = planCategoryMerges(categories, txCount);
if (plans.length === 0) {
  console.log("Tidak ada kategori duplikat. Selesai.");
  process.exit(0);
}

for (const p of plans) {
  console.log(
    `\n• ${p.keep.name} [${p.keep.type}] → pertahankan ${p.keep.id} (${txCount[p.keep.id] ?? 0} transaksi), limit ${p.budgetAmount}`
  );
  for (const r of p.remove) {
    console.log(`    gabungkan ${r.id} (scope ${r.budgetScope ?? "-"}, ${txCount[r.id] ?? 0} transaksi)`);
  }
}

if (!apply) {
  console.log("\nDry-run. Jalankan lagi dengan --apply untuk eksekusi.");
  process.exit(0);
}

const BATCH_LIMIT = 450;
let batch = db.batch();
let ops = 0;
const queue = async (fn) => {
  fn(batch);
  ops += 1;
  if (ops >= BATCH_LIMIT) {
    await batch.commit();
    batch = db.batch();
    ops = 0;
  }
};

for (const p of plans) {
  for (const r of p.remove) {
    for (const txId of txIds[r.id] ?? []) {
      await queue((b) =>
        b.update(db.collection("transactions").doc(txId), {
          categoryId: p.keep.id,
          categoryName: p.keep.name,
          categoryIcon: p.keep.icon,
        })
      );
    }
    await queue((b) => b.update(db.collection("categories").doc(r.id), { isActive: false }));
  }
  await queue((b) =>
    b.update(db.collection("categories").doc(p.keep.id), { budgetAmount: p.budgetAmount, budgetScope: "shared" })
  );
}
if (ops > 0) await batch.commit();

console.log(`\nSelesai: ${plans.length} grup kategori digabung.`);
```

- [ ] **Step 7: `README.md`** — tambahkan bagian setelah "## Scripts":

````markdown
## Rapikan kategori duplikat (sekali, setelah redesign rumah tangga)

Dulu kategori dibuat per pemilik, jadi bisa ada "Makan" versi Arul & Fifi.
Script ini menggabungkannya (transaksi dipindah, limit ambil yang terbesar):

```bash
FIREBASE_SERVICE_ACCOUNT=/path/ke/service-account.json node scripts/merge-duplicate-categories.mjs
FIREBASE_SERVICE_ACCOUNT=/path/ke/service-account.json node scripts/merge-duplicate-categories.mjs --apply
```

Jalankan dry-run dulu, cek daftar, baru `--apply`.
````

- [ ] **Step 8: Verifikasi**

Run: `npm run lint && npm test && npm run build`
Expected: semua hijau (test `.mjs` ikut jalan di `npm test`).

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "script gabung kategori duplikat sisa era per-pemilik (dry-run default, --apply untuk eksekusi)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
