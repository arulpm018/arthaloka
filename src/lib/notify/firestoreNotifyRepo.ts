import { FieldValue, Timestamp, type Firestore } from "firebase-admin/firestore";
import type { NotifyRepo, NotifyTransaction } from "./repo";

const ALREADY_EXISTS = 6; // gRPC status code

/** NotifyRepo di atas Firestore Admin. Query hanya rentang tanggal → tanpa index baru. */
export function createFirestoreNotifyRepo(db: Firestore): NotifyRepo {
  const transactionsBetween = (start: Date, end: Date) =>
    db
      .collection("transactions")
      .where("date", ">=", Timestamp.fromDate(start))
      .where("date", "<", Timestamp.fromDate(end))
      .get();

  return {
    async listUsers() {
      const snap = await db.collection("users").get();
      return snap.docs.map((d) => ({ uid: d.id, role: d.get("role") }));
    },

    async getTransactions(ids) {
      if (ids.length === 0) return [];
      const snaps = await db.getAll(...ids.map((id) => db.collection("transactions").doc(id)));
      return snaps
        .filter((s) => s.exists)
        .map(
          (s): NotifyTransaction => ({
            id: s.id,
            type: s.get("type"),
            amount: s.get("amount"),
            categoryId: s.get("categoryId"),
            categoryName: s.get("categoryName"),
            accountName: s.get("accountName"),
            ownerUid: s.get("ownerUid"),
            date: (s.get("date") as Timestamp).toDate(),
          })
        );
    },

    async getCategories(ids) {
      if (ids.length === 0) return [];
      const snaps = await db.getAll(...ids.map((id) => db.collection("categories").doc(id)));
      return snaps
        .filter((s) => s.exists)
        .map((s) => ({ id: s.id, name: s.get("name"), budgetAmount: (s.get("budgetAmount") as number) ?? 0 }));
    },

    async expenseByCategory(start, end) {
      const snap = await transactionsBetween(start, end);
      const out: Record<string, number> = {};
      snap.docs.forEach((d) => {
        if (d.get("type") !== "expense") return;
        const categoryId = d.get("categoryId") as string;
        out[categoryId] = (out[categoryId] ?? 0) + ((d.get("amount") as number) ?? 0);
      });
      return out;
    },

    async claimOnce(key) {
      try {
        await db.collection("notifLog").doc(key).create({ createdAt: FieldValue.serverTimestamp() });
        return true;
      } catch (error) {
        if ((error as { code?: number }).code === ALREADY_EXISTS) return false;
        throw error;
      }
    },

    async recorderUidsSince(since) {
      const snap = await db.collection("transactions").where("createdAt", ">=", Timestamp.fromDate(since)).get();
      const uids: string[] = [];
      snap.docs.forEach((d) => {
        const uid = d.get("ownerUid") as string | undefined;
        if (uid && !uids.includes(uid)) uids.push(uid);
      });
      return uids;
    },

    async monthTotals(start, end) {
      const snap = await transactionsBetween(start, end);
      let income = 0;
      let expense = 0;
      const expenseByCategoryName: Record<string, number> = {};
      snap.docs.forEach((d) => {
        const amount = (d.get("amount") as number) ?? 0;
        if (d.get("type") === "income") {
          income += amount;
        } else {
          expense += amount;
          const name = (d.get("categoryName") as string) || "Lainnya";
          expenseByCategoryName[name] = (expenseByCategoryName[name] ?? 0) + amount;
        }
      });
      return { income, expense, expenseByCategoryName };
    },
  };
}
