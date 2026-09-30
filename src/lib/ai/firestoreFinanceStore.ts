import { FieldValue, Timestamp, type Firestore } from "firebase-admin/firestore";
import { computeBalanceDelta } from "@/lib/firestore/helpers";
import type { AccountType } from "@/types";
import type { FinanceStore, StoreAccount, StoreCategory, StoreTransaction } from "./financeStore";

const ACCOUNT_ICONS: Record<AccountType, string> = {
  bank: "building-2",
  cash: "wallet",
  "e-wallet": "smartphone",
  savings: "piggy-bank",
  investment: "trending-up",
};

const COLORS = ["#2383E2", "#0F9B58", "#D9730D", "#E03E3E", "#9B59B6", "#00BCD4", "#795548", "#607D8B"];
const colorFor = (seed: string) =>
  COLORS[seed.split("").reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % COLORS.length];

const toDate = (value: unknown): Date =>
  value instanceof Timestamp ? value.toDate() : new Date(value as string);

/** Implementasi FinanceStore dengan Firestore Admin SDK (mengikuti skema app). */
export function createFirestoreFinanceStore(db: Firestore): FinanceStore {
  const listAccounts = async (): Promise<StoreAccount[]> => {
    const snap = await db.collection("accounts").where("isActive", "==", true).get();
    return snap.docs
      .map((d) => ({
        id: d.id,
        name: d.get("name") as string,
        owner: d.get("owner"),
        type: d.get("type"),
        balance: (d.get("balance") as number) ?? 0,
        order: (d.get("order") as number) ?? 0,
      }))
      .sort((a, b) => a.order - b.order);
  };

  const listCategories = async (): Promise<StoreCategory[]> => {
    const snap = await db.collection("categories").where("isActive", "==", true).get();
    return snap.docs
      .map((d) => ({
        id: d.id,
        name: d.get("name") as string,
        icon: (d.get("icon") as string) ?? "package",
        type: d.get("type"),
        budgetAmount: (d.get("budgetAmount") as number) ?? 0,
        order: (d.get("order") as number) ?? 0,
      }))
      .sort((a, b) => a.order - b.order);
  };

  return {
    listAccounts,
    listCategories,

    async listTransactions(start, end): Promise<StoreTransaction[]> {
      const snap = await db
        .collection("transactions")
        .where("date", ">=", Timestamp.fromDate(start))
        .where("date", "<", Timestamp.fromDate(end))
        .orderBy("date", "desc")
        .get();
      return snap.docs.map((d) => ({
        id: d.id,
        type: d.get("type"),
        name: d.get("name"),
        amount: d.get("amount"),
        accountId: d.get("accountId"),
        accountName: d.get("accountName"),
        categoryId: d.get("categoryId"),
        categoryName: d.get("categoryName"),
        date: toDate(d.get("date")),
      }));
    },

    async createCategory(input, uid) {
      const existing = await listCategories();
      const order = existing.reduce((max, c) => Math.max(max, c.order), -1) + 1;
      const ref = db.collection("categories").doc();
      const icon = "package";
      await ref.set({
        name: input.name,
        icon,
        color: colorFor(input.name),
        type: input.type,
        budgetAmount: input.budgetAmount,
        budgetScope: "shared",
        isActive: true,
        order,
        createdBy: uid,
        createdAt: FieldValue.serverTimestamp(),
      });
      return { id: ref.id, name: input.name, icon, type: input.type, budgetAmount: input.budgetAmount, order };
    },

    async createAccount(input, uid) {
      const existing = await listAccounts();
      const order = existing.reduce((max, a) => Math.max(max, a.order), -1) + 1;
      const ref = db.collection("accounts").doc();
      await ref.set({
        name: input.name,
        type: input.type,
        category: input.owner === "shared" ? "shared" : "personal",
        owner: input.owner,
        ownerUid: uid,
        balance: input.balance,
        currency: "IDR",
        color: colorFor(input.name),
        icon: ACCOUNT_ICONS[input.type],
        isActive: true,
        order,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      return { id: ref.id, name: input.name, owner: input.owner, type: input.type, balance: input.balance, order };
    },

    async addTransactions(items, uid) {
      const batch = db.batch();
      const ids: string[] = [];
      const deltas = new Map<string, number>();

      items.forEach((item) => {
        const ref = db.collection("transactions").doc();
        ids.push(ref.id);
        batch.set(ref, {
          type: item.type,
          name: item.name,
          amount: item.amount,
          accountId: item.account.id,
          accountName: item.account.name,
          categoryId: item.category.id,
          categoryName: item.category.name,
          categoryIcon: item.category.icon,
          owner: item.account.owner,
          ownerUid: uid,
          date: Timestamp.fromDate(item.date),
          note: "",
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
        deltas.set(item.account.id, (deltas.get(item.account.id) ?? 0) + computeBalanceDelta(item.type, item.amount));
      });

      deltas.forEach((delta, accountId) => {
        batch.update(db.collection("accounts").doc(accountId), {
          balance: FieldValue.increment(delta),
          updatedAt: FieldValue.serverTimestamp(),
        });
      });

      await batch.commit();
      return ids;
    },

    async addTransfer(input, uid) {
      const batch = db.batch();
      const ref = db.collection("transfers").doc();
      batch.set(ref, {
        name: input.name,
        amount: input.amount,
        fromAccountId: input.from.id,
        fromAccountName: input.from.name,
        fromAccountOwner: input.from.owner,
        toAccountId: input.to.id,
        toAccountName: input.to.name,
        toAccountOwner: input.to.owner,
        owner: input.from.owner,
        ownerUid: uid,
        date: Timestamp.fromDate(input.date),
        note: "",
        createdAt: FieldValue.serverTimestamp(),
      });
      batch.update(db.collection("accounts").doc(input.from.id), {
        balance: FieldValue.increment(-input.amount),
        updatedAt: FieldValue.serverTimestamp(),
      });
      batch.update(db.collection("accounts").doc(input.to.id), {
        balance: FieldValue.increment(input.amount),
        updatedAt: FieldValue.serverTimestamp(),
      });
      await batch.commit();
      return ref.id;
    },

    async deleteTransaction(tx) {
      const batch = db.batch();
      batch.delete(db.collection("transactions").doc(tx.id));
      batch.update(db.collection("accounts").doc(tx.accountId), {
        balance: FieldValue.increment(-computeBalanceDelta(tx.type, tx.amount)),
        updatedAt: FieldValue.serverTimestamp(),
      });
      await batch.commit();
    },
  };
}
