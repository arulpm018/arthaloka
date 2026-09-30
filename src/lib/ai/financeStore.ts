import type { AccountType, CategoryType, Owner, TransactionType } from "@/types";

export interface StoreAccount {
  id: string;
  name: string;
  owner: Owner;
  type: AccountType;
  balance: number;
  order: number;
}

export interface StoreCategory {
  id: string;
  name: string;
  icon: string;
  type: CategoryType;
  budgetAmount: number;
  order: number;
}

export interface StoreTransaction {
  id: string;
  type: TransactionType;
  name: string;
  amount: number;
  accountId: string;
  accountName: string;
  categoryId: string;
  categoryName: string;
  date: Date;
}

export interface NewTransaction {
  type: TransactionType;
  name: string;
  amount: number;
  account: StoreAccount;
  category: StoreCategory;
  date: Date;
}

export interface NewTransfer {
  name: string;
  amount: number;
  from: StoreAccount;
  to: StoreAccount;
  date: Date;
}

/** Akses data keuangan untuk tool AI — Firestore Admin (produksi) & fake (test). */
export interface FinanceStore {
  listAccounts(): Promise<StoreAccount[]>;
  listCategories(): Promise<StoreCategory[]>;
  /** Transaksi dengan `date` di [start, end), terbaru dulu. */
  listTransactions(start: Date, end: Date): Promise<StoreTransaction[]>;
  createCategory(input: { name: string; type: CategoryType; budgetAmount: number }, uid: string): Promise<StoreCategory>;
  createAccount(input: { name: string; type: AccountType; owner: Owner; balance: number }, uid: string): Promise<StoreAccount>;
  /** Simpan transaksi + update saldo rekening secara atomik. Mengembalikan id baru. */
  addTransactions(items: NewTransaction[], uid: string): Promise<string[]>;
  addTransfer(input: NewTransfer, uid: string): Promise<string>;
  /** Hapus transaksi + kembalikan saldo rekening. */
  deleteTransaction(tx: StoreTransaction): Promise<void>;
}
