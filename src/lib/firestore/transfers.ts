import {
  collection,
  doc,
  writeBatch,
  increment,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Transfer, CreateTransferInput } from "@/types";
import { computeTransferDeltas } from "./helpers";

const COLLECTION = "transfers";

export const transfersService = {
  /**
   * Create transfer + debit from account + credit to account (atomic batch write)
   */
  create: async (input: CreateTransferInput): Promise<string> => {
    const batch = writeBatch(db);
    const transferRef = doc(collection(db, COLLECTION));

    batch.set(transferRef, {
      ...input,
      createdAt: serverTimestamp(),
    });

    // Debit from account
    const fromRef = doc(db, "accounts", input.fromAccountId);
    batch.update(fromRef, {
      balance: increment(-input.amount),
      updatedAt: serverTimestamp(),
    });

    // Credit to account
    const toRef = doc(db, "accounts", input.toAccountId);
    batch.update(toRef, {
      balance: increment(input.amount),
      updatedAt: serverTimestamp(),
    });

    await batch.commit();
    return transferRef.id;
  },

  /**
   * Update transfer + adjust both account balances (reverse old, apply new)
   * Net deltas are merged per accountId to avoid Firestore batch overwriting
   * multiple updates to the same document.
   */
  update: async (
    id: string,
    oldTransfer: Transfer,
    newInput: CreateTransferInput
  ): Promise<void> => {
    const batch = writeBatch(db);
    const transferRef = doc(db, COLLECTION, id);

    batch.update(transferRef, {
      ...newInput,
      updatedAt: serverTimestamp(),
    });

    // Compute net delta per accountId via pure helper
    const { deltas } = computeTransferDeltas(oldTransfer, newInput);

    deltas.forEach((delta, accountId) => {
      if (delta === 0) return;
      const accountRef = doc(db, "accounts", accountId);
      batch.update(accountRef, {
        balance: increment(delta),
        updatedAt: serverTimestamp(),
      });
    });

    await batch.commit();
  },

  /**
   * Delete transfer + reverse both account balances (atomic batch write)
   */
  delete: async (transfer: Transfer): Promise<void> => {
    const batch = writeBatch(db);
    const transferRef = doc(db, COLLECTION, transfer.transferId);
    batch.delete(transferRef);

    // Reverse: credit back to from account
    const fromRef = doc(db, "accounts", transfer.fromAccountId);
    batch.update(fromRef, {
      balance: increment(transfer.amount),
      updatedAt: serverTimestamp(),
    });

    // Reverse: debit from to account
    const toRef = doc(db, "accounts", transfer.toAccountId);
    batch.update(toRef, {
      balance: increment(-transfer.amount),
      updatedAt: serverTimestamp(),
    });

    await batch.commit();
  },
};
