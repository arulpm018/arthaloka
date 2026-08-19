import {
  collection,
  doc,
  addDoc,
  updateDoc,
  writeBatch,
  serverTimestamp,
  deleteField,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Account, CreateAccountInput } from "@/types";

const COLLECTION = "accounts";

// Firestore rejects documents containing `undefined` values
const stripUndefined = (data: object): Record<string, unknown> =>
  Object.fromEntries(
    Object.entries(data).filter(([, value]) => value !== undefined)
  );

export const accountsService = {
  /**
   * Create a new account
   */
  create: async (input: CreateAccountInput): Promise<string> => {
    const docRef = await addDoc(collection(db, COLLECTION), {
      ...stripUndefined(input),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  },

  /**
   * Update an existing account.
   * Fields explicitly set to undefined are removed from the document.
   */
  update: async (id: string, data: Partial<Account>): Promise<void> => {
    const ref = doc(db, COLLECTION, id);
    const payload: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      payload[key] = value === undefined ? deleteField() : value;
    }
    await updateDoc(ref, {
      ...payload,
      updatedAt: serverTimestamp(),
    });
  },

  /**
   * Soft delete (deactivate) an account
   */
  deactivate: async (id: string): Promise<void> => {
    const ref = doc(db, COLLECTION, id);
    await updateDoc(ref, {
      isActive: false,
      updatedAt: serverTimestamp(),
    });
  },

  /**
   * Update the display order of multiple accounts in a single batch
   */
  updateOrder: async (
    orderedAccounts: { accountId: string; order: number }[]
  ): Promise<void> => {
    const batch = writeBatch(db);
    for (const { accountId, order } of orderedAccounts) {
      const ref = doc(db, COLLECTION, accountId);
      batch.update(ref, { order, updatedAt: serverTimestamp() });
    }
    await batch.commit();
  },

  /**
   * Reorder accounts by providing an array of account IDs in desired order.
   * Each ID's index becomes its new order value.
   */
  reorder: async (orderedIds: string[]): Promise<void> => {
    const batch = writeBatch(db);
    orderedIds.forEach((id, index) => {
      const ref = doc(db, COLLECTION, id);
      batch.update(ref, { order: index, updatedAt: serverTimestamp() });
    });
    await batch.commit();
  },
};
