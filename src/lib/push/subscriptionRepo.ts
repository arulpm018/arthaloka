import { createHash } from "node:crypto";
import { FieldValue, type Firestore } from "firebase-admin/firestore";
import type { StoredSubscription, SubscriptionRepo } from "./send";

/** Id dokumen langganan = sha256(endpoint) — satu dokumen per HP/browser. */
export const subscriptionId = (endpoint: string) => createHash("sha256").update(endpoint).digest("hex");

type SubscriptionInput = { endpoint: string; keys: { p256dh: string; auth: string } };

/** Koleksi `pushSubscriptions` — hanya diakses server (rules default menolak client). */
export function createSubscriptionRepo(db: Firestore): SubscriptionRepo & {
  save(uid: string, subscription: SubscriptionInput, userAgent: string): Promise<void>;
  removeOwned(uid: string, endpoint: string): Promise<void>;
} {
  const col = db.collection("pushSubscriptions");
  return {
    async listByUids(uids) {
      const snap = await col.where("uid", "in", uids.slice(0, 30)).get();
      return snap.docs.map(
        (d): StoredSubscription => ({
          id: d.id,
          uid: d.get("uid"),
          endpoint: d.get("endpoint"),
          keys: d.get("keys"),
        })
      );
    },
    async remove(id) {
      await col.doc(id).delete();
    },
    async save(uid, subscription, userAgent) {
      await col.doc(subscriptionId(subscription.endpoint)).set({
        uid,
        endpoint: subscription.endpoint,
        keys: subscription.keys,
        userAgent: userAgent.slice(0, 300),
        createdAt: FieldValue.serverTimestamp(),
      });
    },
    async removeOwned(uid, endpoint) {
      const ref = col.doc(subscriptionId(endpoint));
      const snap = await ref.get();
      if (snap.exists && snap.get("uid") === uid) await ref.delete();
    },
  };
}
