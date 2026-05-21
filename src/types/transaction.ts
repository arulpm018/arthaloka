import { Timestamp } from "firebase/firestore";
import { Owner } from "./account";

export type TransactionType = "expense" | "income";

export interface Transaction {
  transactionId: string;
  type: TransactionType;
  name: string;
  amount: number;
  accountId: string;
  accountName: string;
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  owner: Owner;
  ownerUid: string;
  date: Timestamp;
  note?: string;
  tags?: string[];
  isRecurring?: boolean;
  recurringId?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type CreateTransactionInput = Omit<Transaction, "transactionId" | "createdAt" | "updatedAt">;
export type UpdateTransactionInput = Partial<Omit<Transaction, "transactionId" | "createdAt" | "ownerUid">>;
