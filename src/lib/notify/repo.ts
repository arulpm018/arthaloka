import type { Owner, TransactionType } from "@/types";

export interface NotifyUser {
  uid: string;
  role: Owner;
}

export interface NotifyTransaction {
  id: string;
  type: TransactionType;
  amount: number;
  categoryId: string;
  categoryName: string;
  accountName: string;
  ownerUid: string;
  date: Date;
}

export interface NotifyCategory {
  id: string;
  name: string;
  budgetAmount: number;
}

/** Akses data untuk pemicu notifikasi — Firestore Admin (produksi) & fake (test). */
export interface NotifyRepo {
  listUsers(): Promise<NotifyUser[]>;
  getTransactions(ids: string[]): Promise<NotifyTransaction[]>;
  getCategories(ids: string[]): Promise<NotifyCategory[]>;
  /** Σ pengeluaran per categoryId untuk `date` di [start, end). */
  expenseByCategory(start: Date, end: Date): Promise<Record<string, number>>;
  /** Buat penanda sekali-kirim; true kalau baru dibuat, false kalau sudah ada. */
  claimOnce(key: string): Promise<boolean>;
  /** uid yang punya transaksi dengan `createdAt` ≥ since. */
  recorderUidsSince(since: Date): Promise<string[]>;
  /** Total masuk/keluar + pengeluaran per nama kategori untuk `date` di [start, end). */
  monthTotals(start: Date, end: Date): Promise<{
    income: number;
    expense: number;
    expenseByCategoryName: Record<string, number>;
  }>;
}
