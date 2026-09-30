import webpush from "web-push";
import type { PushPayload } from "./format";

export interface StoredSubscription {
  id: string;
  uid: string;
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export interface SubscriptionRepo {
  listByUids(uids: string[]): Promise<StoredSubscription[]>;
  remove(id: string): Promise<void>;
}

export type SendFn = (
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  body: string
) => Promise<unknown>;

let vapidConfigured = false;

/** Pengirim web-push dari env VAPID; null kalau env belum lengkap. */
function defaultSender(): SendFn | null {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) return null;
  if (!vapidConfigured) {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    vapidConfigured = true;
  }
  return (subscription, body) =>
    webpush.sendNotification(subscription, body, { TTL: 60 * 60 * 12, urgency: "normal" });
}

const isGone = (error: unknown) => {
  const code = (error as { statusCode?: number } | null)?.statusCode;
  return code === 404 || code === 410;
};

/**
 * Kirim push ke semua HP milik `uids`. Langganan mati (404/410) dihapus.
 * Error per-HP hanya di-log — satu HP gagal tidak menggagalkan yang lain.
 */
export async function sendToUids(
  repo: SubscriptionRepo,
  uids: string[],
  payload: PushPayload,
  send: SendFn | null = defaultSender()
): Promise<{ sent: number; removed: number }> {
  if (!send) {
    console.warn("[push] env VAPID belum lengkap — notifikasi dilewati");
    return { sent: 0, removed: 0 };
  }
  if (uids.length === 0) return { sent: 0, removed: 0 };

  const subscriptions = await repo.listByUids(uids);
  const body = JSON.stringify(payload);
  let sent = 0;
  let removed = 0;

  await Promise.all(
    subscriptions.map(async (s) => {
      try {
        await send({ endpoint: s.endpoint, keys: s.keys }, body);
        sent += 1;
      } catch (error) {
        if (isGone(error)) {
          await repo.remove(s.id).catch(() => undefined);
          removed += 1;
        } else {
          console.error("[push] gagal kirim:", (error as Error).message);
        }
      }
    })
  );

  return { sent, removed };
}
