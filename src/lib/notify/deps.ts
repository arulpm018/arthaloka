import { adminDb } from "@/lib/server/firebaseAdmin";
import { sendToUids } from "@/lib/push/send";
import { createSubscriptionRepo } from "@/lib/push/subscriptionRepo";
import { createFirestoreNotifyRepo } from "./firestoreNotifyRepo";
import type { NotifyDeps } from "./notifications";

/** Dependensi produksi untuk pemicu notifikasi (Firestore Admin + web-push). */
export function createNotifyDeps(): NotifyDeps {
  const db = adminDb();
  const subscriptions = createSubscriptionRepo(db);
  return {
    repo: createFirestoreNotifyRepo(db),
    push: (uids, payload) => sendToUids(subscriptions, uids, payload),
  };
}
