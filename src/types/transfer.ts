import { Timestamp } from "firebase/firestore";
import { Owner } from "./account";

export interface Transfer {
  transferId: string;
  name: string;
  amount: number;
  fromAccountId: string;
  fromAccountName: string;
  toAccountId: string;
  toAccountName: string;
  owner: Owner;
  ownerUid: string;
  date: Timestamp;
  note?: string;
  createdAt: Timestamp;
}

export type CreateTransferInput = Omit<Transfer, "transferId" | "createdAt">;
