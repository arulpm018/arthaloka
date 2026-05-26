import {
  collection,
  doc,
  writeBatch,
  increment,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Transaction, CreateTransactionInput, UpdateTransactionInput } from "@/types";
import { computeBalanceDelta } from "./helpers";

const COLLECTION = "transactions";

export const transactionsService = {
  /**
   * Create transaction + update account balance (atomic batch write)
   */
  create: async (input: CreateTransactionInput): Promise<string> => {
    const batch = writeBatch(db);
    const txRef = doc(collection(db, COLLECTION));

    batch.set(txRef, {
      ...input,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // Update account balance
    const accountRef = doc(db, "accounts", input.accountId);
    const delta = computeBalanceDelta(input.type, input.amount);
    batch.update(accountRef, { balance: increment(delta), updatedAt: serverTimestamp() });

    await batch.commit();
    return txRef.id;
  },

  /**
   * Update transaction + adjust balances (reverse old, apply new)
   */
  update: async (id: string, oldTx: Transaction, newInput: UpdateTransactionInput): Promise<void> => {
    const batch = writeBatch(db);
    const txRef = doc(db, COLLECTION, id);

    batch.update(txRef, { ...newInput, updatedAt: serverTimestamp() });

    // Reverse old balance: negate the original delta
    const oldDelta = -computeBalanceDelta(oldTx.type, oldTx.amount);
    const oldAccountRef = doc(db, "accounts", oldTx.accountId);
    batch.update(oldAccountRef, { balance: increment(oldDelta), updatedAt: serverTimestamp() });

    // Apply new balance
    const newAccountId = newInput.accountId || oldTx.accountId;
    const newAmount = newInput.amount || oldTx.amount;
    const newType = newInput.type || oldTx.type;
    const newDelta = computeBalanceDelta(newType, newAmount);
    const newAccountRef = doc(db, "accounts", newAccountId);
    batch.update(newAccountRef, { balance: increment(newDelta), updatedAt: serverTimestamp() });

    await batch.commit();
  },

  /**
   * Delete transaction + reverse balance
   */
  delete: async (tx: Transaction): Promise<void> => {
    const batch = writeBatch(db);
    const txRef = doc(db, COLLECTION, tx.transactionId);
    batch.delete(txRef);

    // Reverse balance: negate the original delta
    const delta = -computeBalanceDelta(tx.type, tx.amount);
    const accountRef = doc(db, "accounts", tx.accountId);
    batch.update(accountRef, { balance: increment(delta), updatedAt: serverTimestamp() });

    await batch.commit();
  },
};
