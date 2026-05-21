import { Timestamp } from "firebase/firestore";

export type AccountType = "bank" | "cash" | "e-wallet" | "savings" | "investment";
export type Owner = "arul" | "fifi" | "shared";

export interface Account {
  accountId: string;
  name: string;
  type: AccountType;
  category: "personal" | "shared";
  owner: Owner;
  ownerUid: string;
  balance: number;
  currency: "IDR";
  color: string;
  icon: string;
  isActive: boolean;
  order: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  note?: string;
}

export type CreateAccountInput = Omit<Account, "accountId" | "createdAt" | "updatedAt">;
