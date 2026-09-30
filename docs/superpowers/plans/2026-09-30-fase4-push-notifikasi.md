# Fase 4 — Push Notification (Web Push) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Notifikasi muncul di HP (PWA Android Chrome & iPhone iOS ≥16.4 dari Home Screen) untuk: pasangan mencatat, budget 80%/100%, pengingat harian 21:00 WIB, dan ringkasan bulanan tanggal 1.

**Architecture:** Web Push standar (VAPID) tanpa layanan pihak ketiga. Service worker `public/sw.js` menampilkan notifikasi; langganan per HP disimpan di Firestore `pushSubscriptions` (hanya server). Pengirim `web-push` di route handler Vercel. Pemicu event dipanggil client setelah simpan transaksi (dan langsung dari route AI); pemicu terjadwal lewat Vercel Cron. Logika pemicu murni di atas interface `NotifyRepo` sehingga bisa di-test dengan fake.

**Tech Stack:** Next.js 14 route handlers, `web-push`, firebase-admin, Vercel Cron, Service Worker + Push API, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-30-household-finance-redesign-design.md` (bagian "Fase 4")

**Prasyarat:** Fase 1–3 selesai (butuh `verifyRequest`, `authErrorResponse`, `adminDb`, `authFetch`, util `wib*`, route `/api/ai/chat`).

## Global Constraints

- Ambang budget: **80** dan **100** persen, masing-masing maksimal sekali per kategori per bulan (kunci `notifLog/{YYYY-MM}_{categoryId}_{ambang}` dibuat dengan `create()`).
- Kalau 80 & 100 sama-sama baru tercapai di satu request → kirim hanya notif 100.
- Notif "pasangan mencatat" hanya untuk transaksi yang `ownerUid`-nya = uid token pemanggil; dikirim ke semua user KECUALI pencatat. Edit/hapus/transfer tidak memicu notif.
- Cron: `0 14 * * *` (21:00 WIB) → `/api/cron/daily-reminder`; `0 1 1 * *` (08:00 WIB tgl 1) → `/api/cron/monthly-summary`; header `Authorization: Bearer ${CRON_SECRET}` wajib.
- Env: `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (`mailto:arulpm010@gmail.com`), `CRON_SECRET`. VAPID belum di-set → pengiriman dilewati dengan `console.warn`, TIDAK error.
- Gagal kirim notifikasi tidak boleh menggagalkan penyimpanan transaksi (client fire-and-forget; route AI `catch`).
- Langganan 404/410 dihapus otomatis.
- Tidak ada cache offline di service worker. Jangan ubah `firestore.rules` (koleksi baru otomatis tertutup untuk client).
- Hindari `for…of` atas `Map`/`Set` dan spread `Set` (downlevelIteration).
- Jangan baca/ubah `.env*`.
- Setelah tiap task: `npm run lint && npm test && npm run build` hijau.
- Commit message gaya repo + `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Dua transaksi nyaris bersamaan melewati 80%** → notif budget tetap sekali (penanda `create()` atomik). Dipin test "kedua kali tidak kirim lagi" (Task 3) — fake `claimOnce` meniru `create()`.
2. **User memanggil `/api/notify/transaction` dengan id transaksi milik pasangan** → diabaikan, tidak ada notif palsu. Dipin test (Task 3).
3. **Langganan kedaluwarsa (410) di salah satu HP** → dihapus, HP lain tetap menerima. Dipin test `sendToUids` (Task 1).
4. **VAPID env belum diisi** → transaksi tetap tersimpan, notif dilewati. Dipin test `sendToUids(..., null)` (Task 1).
5. **iPhone belum "Add to Home Screen" / browser tanpa Push API** → toggle nonaktif dengan petunjuk, tidak crash. Dicek manual (Task 4) + test `getPushSupport` tidak dibuat (butuh DOM) — lihat langkah manual.

---

### Task 1: Format payload + pengirim web-push + repo langganan

**Files:**
- Create: `src/lib/push/format.ts`, `src/lib/push/__tests__/format.test.ts`, `src/lib/push/send.ts`, `src/lib/push/__tests__/send.test.ts`, `src/lib/push/subscriptionRepo.ts`
- Modify: `package.json` (dependency), `next.config.mjs`

**Interfaces:**
- Consumes: `formatCurrency`.
- Produces:
  - `format.ts`: `PushPayload { title; body; url; tag? }`, `BUDGET_THRESHOLDS = [80, 100]`, `type BudgetThreshold = 80 | 100`, `budgetThresholdsReached(spent, budget): BudgetThreshold[]`, `RecordedItem`, `partnerTransactionPayload(recorderName, items): PushPayload`, `budgetPayload({ categoryId, categoryName, threshold, spent, budget }): PushPayload`, `DAILY_REMINDER_PAYLOAD`, `monthlySummaryPayload({ monthLabel, income, expense, topCategory }): PushPayload`
  - `send.ts`: `StoredSubscription { id; uid; endpoint; keys: { p256dh; auth } }`, `SubscriptionRepo { listByUids(uids); remove(id) }`, `SendFn`, `sendToUids(repo, uids, payload, send?): Promise<{ sent; removed }>`
  - `subscriptionRepo.ts`: `subscriptionId(endpoint): string` (sha256 hex), `createSubscriptionRepo(db)` → `SubscriptionRepo & { save(uid, sub, userAgent); removeOwned(uid, endpoint) }`

- [ ] **Step 1: Install dependency**

Run: `npm install web-push && npm install -D @types/web-push`
Expected: `web-push` di `dependencies`, `@types/web-push` di `devDependencies`.

- [ ] **Step 2: `next.config.mjs`** — tambahkan di dalam `nextConfig`:

```js
  experimental: {
    // web-push memakai modul Node (crypto/https) — jangan di-bundle.
    serverComponentsExternalPackages: ["web-push"],
  },
```

dan di array `headers()` tambahkan entri:

```js
      {
        source: "/sw.js",
        headers: [{ key: "Cache-Control", value: "no-cache" }],
      },
```

- [ ] **Step 3: Tulis test gagal — `src/lib/push/__tests__/format.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import {
  budgetPayload,
  budgetThresholdsReached,
  DAILY_REMINDER_PAYLOAD,
  monthlySummaryPayload,
  partnerTransactionPayload,
} from "@/lib/push/format";
import { formatCurrency } from "@/lib/utils/formatCurrency";

describe("budgetThresholdsReached", () => {
  it.each([
    [79, 100, []],
    [80, 100, [80]],
    [99, 100, [80]],
    [100, 100, [80, 100]],
    [150, 100, [80, 100]],
    [500, 0, []],
  ])("spent %d / budget %d → %j", (spent, budget, expected) => {
    expect(budgetThresholdsReached(spent, budget)).toEqual(expected);
  });
});

describe("partnerTransactionPayload", () => {
  it("satu transaksi", () => {
    const p = partnerTransactionPayload("Fifi", [
      { type: "expense", amount: 50_000, categoryName: "Makan", accountName: "BRI" },
    ]);
    expect(p).toEqual({
      title: `Fifi catat ${formatCurrency(50_000)}`,
      body: "Makan · BRI",
      url: "/transactions",
      tag: "partner-tx",
    });
  });
  it("pemasukan diberi keterangan", () => {
    const p = partnerTransactionPayload("Arul", [
      { type: "income", amount: 1_000_000, categoryName: "Gaji", accountName: "BCA" },
    ]);
    expect(p.body).toBe("Gaji · BCA (pemasukan)");
  });
  it("banyak transaksi → ringkasan", () => {
    const p = partnerTransactionPayload("Arul", [
      { type: "expense", amount: 10_000, categoryName: "Makan", accountName: "BCA" },
      { type: "expense", amount: 15_000, categoryName: "Parkir", accountName: "BCA" },
    ]);
    expect(p.title).toBe("Arul catat 2 transaksi");
    expect(p.body).toBe(`Total ${formatCurrency(25_000)}`);
  });
});

describe("budgetPayload", () => {
  it("80%", () => {
    const p = budgetPayload({ categoryId: "c1", categoryName: "Makan", threshold: 80, spent: 1_600_000, budget: 2_000_000 });
    expect(p.title).toBe("Makan sudah 80% budget");
    expect(p.body).toBe(`${formatCurrency(1_600_000)} dari ${formatCurrency(2_000_000)} bulan ini`);
    expect(p).toMatchObject({ url: "/budget", tag: "budget-c1" });
  });
  it("100%", () => {
    expect(budgetPayload({ categoryId: "c1", categoryName: "Makan", threshold: 100, spent: 1, budget: 1 }).title).toBe(
      "Makan lewat budget"
    );
  });
});

describe("payload terjadwal", () => {
  it("pengingat harian membuka form catat", () => {
    expect(DAILY_REMINDER_PAYLOAD.url).toBe("/dashboard?add=1");
  });
  it("ringkasan bulanan", () => {
    const p = monthlySummaryPayload({ monthLabel: "September 2026", income: 10_000_000, expense: 7_000_000, topCategory: "Makan" });
    expect(p.title).toBe("Rekap September 2026");
    expect(p.body).toBe(`Keluar ${formatCurrency(7_000_000)}, masuk ${formatCurrency(10_000_000)}. Paling boros: Makan.`);
    expect(p.url).toBe("/recap");
  });
  it("ringkasan tanpa kategori", () => {
    expect(monthlySummaryPayload({ monthLabel: "X", income: 0, expense: 0, topCategory: null }).body).not.toContain("boros");
  });
});
```

- [ ] **Step 4: Tulis test gagal — `src/lib/push/__tests__/send.test.ts`**

```ts
import { describe, it, expect, vi } from "vitest";
import { sendToUids, type StoredSubscription, type SubscriptionRepo } from "@/lib/push/send";

const sub = (id: string, uid: string): StoredSubscription => ({
  id,
  uid,
  endpoint: `https://push.example/${id}`,
  keys: { p256dh: "p", auth: "a" },
});

const makeRepo = (subs: StoredSubscription[]) => {
  const removed: string[] = [];
  const repo: SubscriptionRepo = {
    listByUids: vi.fn(async (uids: string[]) => subs.filter((s) => uids.includes(s.uid))),
    remove: vi.fn(async (id: string) => {
      removed.push(id);
    }),
  };
  return { repo, removed };
};

const payload = { title: "T", body: "B", url: "/x" };

describe("sendToUids", () => {
  it("kirim ke semua HP milik uid target saja", async () => {
    const { repo } = makeRepo([sub("s1", "arul"), sub("s2", "arul"), sub("s3", "fifi")]);
    const send = vi.fn().mockResolvedValue({});
    const res = await sendToUids(repo, ["arul"], payload, send);
    expect(res).toEqual({ sent: 2, removed: 0 });
    expect(send).toHaveBeenCalledTimes(2);
    expect(JSON.parse(send.mock.calls[0][1])).toEqual(payload);
  });

  it("410/404 → langganan dihapus, sisanya tetap terkirim", async () => {
    const { repo, removed } = makeRepo([sub("s1", "arul"), sub("s2", "arul")]);
    const send = vi
      .fn()
      .mockRejectedValueOnce(Object.assign(new Error("gone"), { statusCode: 410 }))
      .mockResolvedValueOnce({});
    const res = await sendToUids(repo, ["arul"], payload, send);
    expect(res).toEqual({ sent: 1, removed: 1 });
    expect(removed).toEqual(["s1"]);
  });

  it("error lain → tidak dihapus, tidak throw", async () => {
    const { repo, removed } = makeRepo([sub("s1", "arul")]);
    const send = vi.fn().mockRejectedValue(Object.assign(new Error("timeout"), { statusCode: 500 }));
    await expect(sendToUids(repo, ["arul"], payload, send)).resolves.toEqual({ sent: 0, removed: 0 });
    expect(removed).toEqual([]);
  });

  it("VAPID belum di-set (send null) → dilewati", async () => {
    const { repo } = makeRepo([sub("s1", "arul")]);
    await expect(sendToUids(repo, ["arul"], payload, null)).resolves.toEqual({ sent: 0, removed: 0 });
    expect(repo.listByUids).not.toHaveBeenCalled();
  });

  it("tanpa target → tidak query", async () => {
    const { repo } = makeRepo([]);
    await sendToUids(repo, [], payload, vi.fn());
    expect(repo.listByUids).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 5: Jalankan, pastikan gagal**

Run: `npx vitest run src/lib/push/__tests__`
Expected: FAIL — modul `@/lib/push/format` & `@/lib/push/send` tidak ditemukan.

- [ ] **Step 6: Implementasi `src/lib/push/format.ts`**

```ts
import { formatCurrency } from "@/lib/utils/formatCurrency";

export interface PushPayload {
  title: string;
  body: string;
  /** URL yang dibuka saat notifikasi di-tap */
  url: string;
  /** Notif dengan tag sama saling menggantikan di HP */
  tag?: string;
}

export const BUDGET_THRESHOLDS = [80, 100] as const;
export type BudgetThreshold = (typeof BUDGET_THRESHOLDS)[number];

/** Ambang budget (persen) yang sudah tercapai. */
export function budgetThresholdsReached(spent: number, budget: number): BudgetThreshold[] {
  if (budget <= 0) return [];
  const pct = (spent / budget) * 100;
  return BUDGET_THRESHOLDS.filter((t) => pct >= t);
}

export interface RecordedItem {
  type: "expense" | "income";
  amount: number;
  categoryName: string;
  accountName: string;
}

export function partnerTransactionPayload(recorderName: string, items: RecordedItem[]): PushPayload {
  if (items.length === 1) {
    const [it] = items;
    return {
      title: `${recorderName} catat ${formatCurrency(it.amount)}`,
      body: `${it.categoryName} · ${it.accountName}${it.type === "income" ? " (pemasukan)" : ""}`,
      url: "/transactions",
      tag: "partner-tx",
    };
  }
  const total = items.reduce((sum, i) => sum + i.amount, 0);
  return {
    title: `${recorderName} catat ${items.length} transaksi`,
    body: `Total ${formatCurrency(total)}`,
    url: "/transactions",
    tag: "partner-tx",
  };
}

export function budgetPayload(input: {
  categoryId: string;
  categoryName: string;
  threshold: BudgetThreshold;
  spent: number;
  budget: number;
}): PushPayload {
  return {
    title:
      input.threshold >= 100
        ? `${input.categoryName} lewat budget`
        : `${input.categoryName} sudah ${input.threshold}% budget`,
    body: `${formatCurrency(input.spent)} dari ${formatCurrency(input.budget)} bulan ini`,
    url: "/budget",
    tag: `budget-${input.categoryId}`,
  };
}

export const DAILY_REMINDER_PAYLOAD: PushPayload = {
  title: "Udah catat pengeluaran hari ini?",
  body: "Catat sekarang biar sisa budget tetap akurat.",
  url: "/dashboard?add=1",
  tag: "daily-reminder",
};

export function monthlySummaryPayload(input: {
  monthLabel: string;
  income: number;
  expense: number;
  topCategory: string | null;
}): PushPayload {
  return {
    title: `Rekap ${input.monthLabel}`,
    body: `Keluar ${formatCurrency(input.expense)}, masuk ${formatCurrency(input.income)}.${
      input.topCategory ? ` Paling boros: ${input.topCategory}.` : ""
    }`,
    url: "/recap",
    tag: "monthly-summary",
  };
}
```

- [ ] **Step 7: Implementasi `src/lib/push/send.ts`**

```ts
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
```

- [ ] **Step 8: Implementasi `src/lib/push/subscriptionRepo.ts`**

```ts
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
```

- [ ] **Step 9: Jalankan, pastikan lulus**

Run: `npx vitest run src/lib/push/__tests__`
Expected: PASS.

- [ ] **Step 10: Verifikasi**

Run: `npm run lint && npm test && npm run build`
Expected: semua hijau.

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "push: format payload notifikasi, pengirim web-push vapid (hapus langganan 404/410), repo langganan firestore

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Endpoint langganan + service worker + toggle di Pengaturan

**Files:**
- Create: `public/sw.js`, `src/lib/push/client.ts`, `src/lib/push/__tests__/client.test.ts`, `src/components/shared/ServiceWorkerRegistrar.tsx`, `src/components/settings/NotificationToggle.tsx`, `src/app/api/push/subscribe/route.ts`
- Modify: `src/components/Providers.tsx`, `src/components/settings/SettingsScreen.tsx`

**Interfaces:**
- Consumes: `verifyRequest`, `authErrorResponse`, `AuthedUser`, `adminDb`, `authFetch` (Fase 3); `createSubscriptionRepo` (Task 1).
- Produces:
  - `POST /api/push/subscribe` body `{ subscription: { endpoint, keys: { p256dh, auth } } }` → `{ ok: true }`; `DELETE /api/push/subscribe` body `{ endpoint }` → `{ ok: true }`.
  - `client.ts`: `type PushSupport = "supported" | "needs-install" | "unsupported"`, `getPushSupport()`, `registerServiceWorker()`, `getCurrentSubscription()`, `enablePush()`, `disablePush()`, `urlBase64ToUint8Array(base64)`.

- [ ] **Step 1: Tulis test gagal — `src/lib/push/__tests__/client.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { urlBase64ToUint8Array } from "@/lib/push/client";

describe("urlBase64ToUint8Array", () => {
  it("decode base64url tanpa padding", () => {
    // "hello" = aGVsbG8 (base64url, tanpa "=")
    expect(Array.from(urlBase64ToUint8Array("aGVsbG8"))).toEqual([104, 101, 108, 108, 111]);
  });
  it("karakter - dan _ dipetakan ke + dan /", () => {
    // bytes [251, 255] = "+/8=" (base64) = "-_8" (base64url)
    expect(Array.from(urlBase64ToUint8Array("-_8"))).toEqual([251, 255]);
  });
});
```

- [ ] **Step 2: Jalankan, pastikan gagal**

Run: `npx vitest run src/lib/push/__tests__/client.test.ts`
Expected: FAIL — modul `@/lib/push/client` tidak ditemukan.

- [ ] **Step 3: Implementasi `src/lib/push/client.ts`**

```ts
"use client";

import { authFetch } from "@/lib/authFetch";

export type PushSupport = "supported" | "needs-install" | "unsupported";

/** VAPID public key (base64url) → bytes untuk `applicationServerKey`. */
export function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

/**
 * iPhone hanya mendukung Web Push untuk app yang dibuka dari Home Screen
 * (iOS ≥16.4). Browser lain cukup punya Service Worker + Push API.
 */
export function getPushSupport(): PushSupport {
  if (typeof window === "undefined") return "unsupported";
  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  if (isIos && !standalone) return "needs-install";
  const hasApis = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  return hasApis ? "supported" : "unsupported";
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return null;
  return navigator.serviceWorker.register("/sw.js");
}

export async function getCurrentSubscription(): Promise<PushSubscription | null> {
  const registration = await navigator.serviceWorker.getRegistration();
  return registration ? registration.pushManager.getSubscription() : null;
}

/** Minta izin → subscribe → simpan ke server. Throw dengan pesan Indonesia kalau gagal. */
export async function enablePush(): Promise<void> {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!publicKey) throw new Error("Notifikasi belum dikonfigurasi di server");

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("Izin notifikasi ditolak. Aktifkan dari pengaturan browser/HP.");
  }

  await registerServiceWorker();
  const registration = await navigator.serviceWorker.ready;
  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    }));

  const res = await authFetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subscription: subscription.toJSON() }),
  });
  if (!res.ok) throw new Error("Gagal menyimpan langganan notifikasi");
}

/** Hapus langganan di server lalu unsubscribe di HP ini. */
export async function disablePush(): Promise<void> {
  const subscription = await getCurrentSubscription();
  if (!subscription) return;
  await authFetch("/api/push/subscribe", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint: subscription.endpoint }),
  });
  await subscription.unsubscribe();
}
```

- [ ] **Step 4: Jalankan, pastikan lulus**

Run: `npx vitest run src/lib/push/__tests__/client.test.ts`
Expected: PASS.

- [ ] **Step 5: Buat `public/sw.js`**

```js
/* Service worker Arthafiloka — hanya untuk push notification (tanpa cache offline). */

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "Arthafiloka", body: event.data ? event.data.text() : "" };
  }

  event.waitUntil(
    self.registration.showNotification(data.title || "Arthafiloka", {
      body: data.body || "",
      tag: data.tag,
      icon: "/logo-192.png",
      data: { url: data.url || "/dashboard" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL((event.notification.data && event.notification.data.url) || "/dashboard", self.location.origin).href;

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of windows) {
        if ("focus" in client) {
          await client.focus();
          if ("navigate" in client) await client.navigate(url).catch(() => undefined);
          return;
        }
      }
      await self.clients.openWindow(url);
    })()
  );
});
```

- [ ] **Step 6: Buat `src/components/shared/ServiceWorkerRegistrar.tsx`**

```tsx
"use client";

import { useEffect } from "react";
import { registerServiceWorker } from "@/lib/push/client";

/** Daftarkan service worker sekali saat app dimuat (dibutuhkan push notification). */
export const ServiceWorkerRegistrar = () => {
  useEffect(() => {
    registerServiceWorker().catch((error) => console.error("[sw] gagal register:", error));
  }, []);
  return null;
};
```

- [ ] **Step 7: `src/components/Providers.tsx`** — import `ServiceWorkerRegistrar` lalu render `<ServiceWorkerRegistrar />` tepat setelah `<Toaster position="top-center" richColors />`.

- [ ] **Step 8: Buat `src/app/api/push/subscribe/route.ts`**

```ts
import { NextResponse } from "next/server";
import { adminDb } from "@/lib/server/firebaseAdmin";
import { authErrorResponse, verifyRequest, type AuthedUser } from "@/lib/server/auth";
import { createSubscriptionRepo } from "@/lib/push/subscriptionRepo";

export const runtime = "nodejs";

function parseSubscription(value: unknown) {
  const s = value as { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } } | null;
  if (
    !s ||
    typeof s.endpoint !== "string" ||
    !s.endpoint.startsWith("https://") ||
    typeof s.keys?.p256dh !== "string" ||
    typeof s.keys?.auth !== "string"
  ) {
    return null;
  }
  return { endpoint: s.endpoint, keys: { p256dh: s.keys.p256dh, auth: s.keys.auth } };
}

/** Simpan langganan push HP ini untuk user login. */
export async function POST(req: Request) {
  let user: AuthedUser;
  try {
    user = await verifyRequest(req);
  } catch (error) {
    return authErrorResponse(error);
  }

  const body = await req.json().catch(() => null);
  const subscription = parseSubscription(body?.subscription);
  if (!subscription) {
    return NextResponse.json({ error: "Subscription tidak valid" }, { status: 400 });
  }

  await createSubscriptionRepo(adminDb()).save(user.uid, subscription, req.headers.get("user-agent") ?? "");
  return NextResponse.json({ ok: true });
}

/** Hapus langganan (hanya milik user sendiri). */
export async function DELETE(req: Request) {
  let user: AuthedUser;
  try {
    user = await verifyRequest(req);
  } catch (error) {
    return authErrorResponse(error);
  }

  const body = await req.json().catch(() => null);
  if (typeof body?.endpoint !== "string") {
    return NextResponse.json({ error: "endpoint wajib" }, { status: 400 });
  }

  await createSubscriptionRepo(adminDb()).removeOwned(user.uid, body.endpoint);
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 9: Buat `src/components/settings/NotificationToggle.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { SettingsRow } from "@/components/settings/SettingsRow";
import {
  disablePush,
  enablePush,
  getCurrentSubscription,
  getPushSupport,
  type PushSupport,
} from "@/lib/push/client";

const DESCRIPTIONS: Record<PushSupport, string> = {
  supported: "Pasangan mencatat, budget mepet, pengingat harian & rekap bulanan",
  "needs-install": "Di iPhone: Share → Add to Home Screen, lalu buka app dari ikon itu",
  unsupported: "Browser ini belum mendukung notifikasi",
};

/** Toggle push notification untuk HP/browser ini (langganan per perangkat). */
export const NotificationToggle = () => {
  const [support, setSupport] = useState<PushSupport>("unsupported");
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const detected = getPushSupport();
    setSupport(detected);
    if (detected !== "supported") return;
    getCurrentSubscription()
      .then((sub) => setEnabled(!!sub && Notification.permission === "granted"))
      .catch(() => setEnabled(false));
  }, []);

  const handleChange = async (next: boolean) => {
    setBusy(true);
    try {
      if (next) {
        await enablePush();
        setEnabled(true);
        toast.success("Notifikasi aktif di HP ini");
      } else {
        await disablePush();
        setEnabled(false);
        toast.success("Notifikasi dimatikan di HP ini");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal mengubah notifikasi");
    } finally {
      setBusy(false);
    }
  };

  return (
    <SettingsRow
      icon={Bell}
      label="Notifikasi di HP ini"
      description={DESCRIPTIONS[support]}
      htmlFor="push-toggle"
      trailing={
        <Switch
          id="push-toggle"
          checked={enabled}
          disabled={busy || support !== "supported"}
          onCheckedChange={(value) => void handleChange(value)}
          aria-label="Notifikasi di HP ini"
        />
      }
    />
  );
};
```

- [ ] **Step 10: `src/components/settings/SettingsScreen.tsx`** — import `NotificationToggle` lalu sisipkan grup baru tepat sebelum `<SettingsGroup title="Tampilan">`:

```tsx
        <SettingsGroup title="Notifikasi">
          <NotificationToggle />
        </SettingsGroup>
```

- [ ] **Step 11: Verifikasi**

Run: `npm run lint && npm test && npm run build`
Expected: semua hijau.

Manual desktop Chrome (`npm run dev`, localhost boleh untuk push; butuh env VAPID + service account di `.env.local` yang diisi USER):
- DevTools → Application → Service Workers: `/sw.js` activated.
- `/settings` → "Notifikasi di HP ini" → nyalakan → izinkan → toast "Notifikasi aktif di HP ini"; Firestore `pushSubscriptions` bertambah 1 dokumen dengan `uid` user.
- DevTools → Application → Service Workers → "Push" dengan teks `{"title":"Tes","body":"Halo","url":"/budget"}` → notifikasi muncul; klik → membuka `/budget`.
- Matikan toggle → dokumen langganan terhapus.
- Safari iPhone tanpa Home Screen → toggle nonaktif dengan petunjuk "Add to Home Screen".

- [ ] **Step 12: Commit**

```bash
git add -A
git commit -m "push: service worker, endpoint langganan & toggle notifikasi per HP di pengaturan

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Pemicu notifikasi — pasangan mencatat, budget, pengingat, rekap

**Files:**
- Create: `src/lib/notify/repo.ts`, `src/lib/notify/firestoreNotifyRepo.ts`, `src/lib/notify/notifications.ts`, `src/lib/notify/__tests__/notifications.test.ts`, `src/lib/notify/deps.ts`

**Interfaces:**
- Consumes: `wib*`, `MONTH_NAMES_ID` (Fase 3 Task 1); `format.ts` (Task 1); `sendToUids`, `createSubscriptionRepo` (Task 1); `adminDb`; `OWNER_LABELS`.
- Produces:
  - `repo.ts`: `NotifyUser { uid; role }`, `NotifyTransaction`, `NotifyCategory`, `interface NotifyRepo` (lihat kode)
  - `notifications.ts`: `type PushFn = (uids: string[], payload: PushPayload) => Promise<unknown>`, `interface NotifyDeps { repo: NotifyRepo; push: PushFn }`, `notifyTransactionsCreated(deps, { recorderUid, transactionIds, now }): Promise<void>`, `runDailyReminder(deps, now): Promise<string[]>` (uid yang diingatkan), `runMonthlySummary(deps, now): Promise<void>`
  - `deps.ts`: `createNotifyDeps(): NotifyDeps`
  - `firestoreNotifyRepo.ts`: `createFirestoreNotifyRepo(db): NotifyRepo`

- [ ] **Step 1: Buat `src/lib/notify/repo.ts`**

```ts
import type { Owner, TransactionType } from "@/types";

export interface NotifyUser {
  uid: string;
  role: Owner;
}

export interface NotifyTransaction {
  id: string;
  type: TransactionType;
  amount: number;
  categoryId: string;
  categoryName: string;
  accountName: string;
  ownerUid: string;
  date: Date;
}

export interface NotifyCategory {
  id: string;
  name: string;
  budgetAmount: number;
}

/** Akses data untuk pemicu notifikasi — Firestore Admin (produksi) & fake (test). */
export interface NotifyRepo {
  listUsers(): Promise<NotifyUser[]>;
  getTransactions(ids: string[]): Promise<NotifyTransaction[]>;
  getCategories(ids: string[]): Promise<NotifyCategory[]>;
  /** Σ pengeluaran per categoryId untuk `date` di [start, end). */
  expenseByCategory(start: Date, end: Date): Promise<Record<string, number>>;
  /** Buat penanda sekali-kirim; true kalau baru dibuat, false kalau sudah ada. */
  claimOnce(key: string): Promise<boolean>;
  /** uid yang punya transaksi dengan `createdAt` ≥ since. */
  recorderUidsSince(since: Date): Promise<string[]>;
  /** Total masuk/keluar + pengeluaran per nama kategori untuk `date` di [start, end). */
  monthTotals(start: Date, end: Date): Promise<{
    income: number;
    expense: number;
    expenseByCategoryName: Record<string, number>;
  }>;
}
```

- [ ] **Step 2: Tulis test gagal — `src/lib/notify/__tests__/notifications.test.ts`**

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  notifyTransactionsCreated,
  runDailyReminder,
  runMonthlySummary,
  type NotifyDeps,
} from "@/lib/notify/notifications";
import type { NotifyCategory, NotifyRepo, NotifyTransaction, NotifyUser } from "@/lib/notify/repo";
import type { PushPayload } from "@/lib/push/format";

const NOW = new Date("2026-09-30T05:00:00Z"); // 30 Sep 2026 12:00 WIB

class FakeRepo implements NotifyRepo {
  users: NotifyUser[] = [
    { uid: "u-arul", role: "arul" },
    { uid: "u-fifi", role: "fifi" },
  ];
  transactions: NotifyTransaction[] = [];
  categories: NotifyCategory[] = [
    { id: "c-makan", name: "Makan", budgetAmount: 1_000_000 },
    { id: "c-lain", name: "Lainnya", budgetAmount: 0 },
  ];
  claimed: string[] = [];
  recorders: string[] = [];

  async listUsers() {
    return this.users;
  }
  async getTransactions(ids: string[]) {
    return this.transactions.filter((t) => ids.includes(t.id));
  }
  async getCategories(ids: string[]) {
    return this.categories.filter((c) => ids.includes(c.id));
  }
  async expenseByCategory(start: Date, end: Date) {
    const out: Record<string, number> = {};
    this.transactions
      .filter((t) => t.type === "expense" && t.date >= start && t.date < end)
      .forEach((t) => {
        out[t.categoryId] = (out[t.categoryId] ?? 0) + t.amount;
      });
    return out;
  }
  async claimOnce(key: string) {
    if (this.claimed.includes(key)) return false;
    this.claimed.push(key);
    return true;
  }
  async recorderUidsSince() {
    return this.recorders;
  }
  async monthTotals() {
    return { income: 9_000_000, expense: 6_000_000, expenseByCategoryName: { Makan: 2_000_000, Transport: 500_000 } };
  }
}

const tx = (id: string, overrides: Partial<NotifyTransaction> = {}): NotifyTransaction => ({
  id,
  type: "expense",
  amount: 50_000,
  categoryId: "c-lain",
  categoryName: "Lainnya",
  accountName: "BCA",
  ownerUid: "u-arul",
  date: NOW,
  ...overrides,
});

let repo: FakeRepo;
let sent: { uids: string[]; payload: PushPayload }[];
let deps: NotifyDeps;

beforeEach(() => {
  repo = new FakeRepo();
  sent = [];
  deps = {
    repo,
    push: vi.fn(async (uids: string[], payload: PushPayload) => {
      sent.push({ uids, payload });
    }),
  };
});

describe("notifyTransactionsCreated — pasangan", () => {
  it("dikirim ke pasangan saja, dengan nama pencatat", async () => {
    repo.transactions = [tx("t1")];
    await notifyTransactionsCreated(deps, { recorderUid: "u-arul", transactionIds: ["t1"], now: NOW });
    expect(sent).toHaveLength(1);
    expect(sent[0].uids).toEqual(["u-fifi"]);
    expect(sent[0].payload.title).toMatch(/^Arul catat/);
  });

  it("transaksi milik orang lain diabaikan (anti notif palsu)", async () => {
    repo.transactions = [tx("t1", { ownerUid: "u-fifi" })];
    await notifyTransactionsCreated(deps, { recorderUid: "u-arul", transactionIds: ["t1"], now: NOW });
    expect(sent).toHaveLength(0);
  });

  it("id kosong → tidak apa-apa", async () => {
    await notifyTransactionsCreated(deps, { recorderUid: "u-arul", transactionIds: [], now: NOW });
    expect(deps.push).not.toHaveBeenCalled();
  });
});

describe("notifyTransactionsCreated — budget", () => {
  it("tembus 80% → notif ke berdua, sekali saja", async () => {
    repo.transactions = [tx("old", { categoryId: "c-makan", amount: 700_000 }), tx("t1", { categoryId: "c-makan", amount: 150_000 })];
    await notifyTransactionsCreated(deps, { recorderUid: "u-arul", transactionIds: ["t1"], now: NOW });
    const budgetNotifs = sent.filter((s) => s.payload.url === "/budget");
    expect(budgetNotifs).toHaveLength(1);
    expect(budgetNotifs[0].uids).toEqual(["u-arul", "u-fifi"]);
    expect(budgetNotifs[0].payload.title).toBe("Makan sudah 80% budget");
    expect(repo.claimed).toEqual(["2026-09_c-makan_80"]);

    repo.transactions.push(tx("t2", { categoryId: "c-makan", amount: 10_000 }));
    await notifyTransactionsCreated(deps, { recorderUid: "u-arul", transactionIds: ["t2"], now: NOW });
    expect(sent.filter((s) => s.payload.url === "/budget")).toHaveLength(1);
  });

  it("80 & 100 baru sekaligus → hanya notif 100", async () => {
    repo.transactions = [tx("t1", { categoryId: "c-makan", amount: 1_200_000 })];
    await notifyTransactionsCreated(deps, { recorderUid: "u-arul", transactionIds: ["t1"], now: NOW });
    const budgetNotifs = sent.filter((s) => s.payload.url === "/budget");
    expect(budgetNotifs).toHaveLength(1);
    expect(budgetNotifs[0].payload.title).toBe("Makan lewat budget");
    expect(repo.claimed).toEqual(["2026-09_c-makan_80", "2026-09_c-makan_100"]);
  });

  it("kategori tanpa limit → tidak ada notif budget", async () => {
    repo.transactions = [tx("t1", { categoryId: "c-lain", amount: 9_000_000 })];
    await notifyTransactionsCreated(deps, { recorderUid: "u-arul", transactionIds: ["t1"], now: NOW });
    expect(sent.filter((s) => s.payload.url === "/budget")).toHaveLength(0);
  });

  it("transaksi bertanggal bulan lalu → tidak cek budget bulan ini", async () => {
    repo.transactions = [tx("t1", { categoryId: "c-makan", amount: 5_000_000, date: new Date("2026-08-15T05:00:00Z") })];
    await notifyTransactionsCreated(deps, { recorderUid: "u-arul", transactionIds: ["t1"], now: NOW });
    expect(sent.filter((s) => s.payload.url === "/budget")).toHaveLength(0);
  });
});

describe("runDailyReminder", () => {
  it("hanya user yang belum mencatat hari ini", async () => {
    repo.recorders = ["u-arul"];
    const targets = await runDailyReminder(deps, NOW);
    expect(targets).toEqual(["u-fifi"]);
    expect(sent[0]).toMatchObject({ uids: ["u-fifi"], payload: { url: "/dashboard?add=1" } });
  });
  it("semua sudah mencatat → tidak kirim", async () => {
    repo.recorders = ["u-arul", "u-fifi"];
    expect(await runDailyReminder(deps, NOW)).toEqual([]);
    expect(deps.push).not.toHaveBeenCalled();
  });
});

describe("runMonthlySummary", () => {
  it("rekap bulan lalu ke berdua dengan kategori terboros", async () => {
    await runMonthlySummary(deps, new Date("2026-10-01T01:00:00Z"));
    expect(sent[0].uids).toEqual(["u-arul", "u-fifi"]);
    expect(sent[0].payload.title).toBe("Rekap September 2026");
    expect(sent[0].payload.body).toContain("Paling boros: Makan");
  });
});
```

- [ ] **Step 3: Jalankan, pastikan gagal**

Run: `npx vitest run src/lib/notify/__tests__/notifications.test.ts`
Expected: FAIL — modul `@/lib/notify/notifications` tidak ditemukan.

- [ ] **Step 4: Implementasi `src/lib/notify/notifications.ts`**

```ts
import { OWNER_LABELS } from "@/lib/constants/labels";
import {
  budgetPayload,
  budgetThresholdsReached,
  DAILY_REMINDER_PAYLOAD,
  monthlySummaryPayload,
  partnerTransactionPayload,
  type BudgetThreshold,
  type PushPayload,
} from "@/lib/push/format";
import {
  MONTH_NAMES_ID,
  wibDayRange,
  wibMonthKey,
  wibMonthRange,
  wibParts,
  wibPreviousMonth,
} from "@/lib/utils/wib";
import type { NotifyRepo } from "./repo";

export type PushFn = (uids: string[], payload: PushPayload) => Promise<unknown>;

export interface NotifyDeps {
  repo: NotifyRepo;
  push: PushFn;
}

const MAX_IDS = 50;
const unique = (values: string[]) => values.filter((v, i) => values.indexOf(v) === i);

/**
 * Setelah transaksi baru tersimpan: kabari pasangan, lalu cek ambang budget
 * (80/100%) kategori pengeluaran bulan berjalan — masing-masing sekali per bulan.
 */
export async function notifyTransactionsCreated(
  deps: NotifyDeps,
  input: { recorderUid: string; transactionIds: string[]; now: Date }
): Promise<void> {
  const ids = input.transactionIds.slice(0, MAX_IDS);
  if (ids.length === 0) return;

  const [users, fetched] = await Promise.all([deps.repo.listUsers(), deps.repo.getTransactions(ids)]);
  // Hanya transaksi milik pemanggil — cegah notif atas nama orang lain.
  const transactions = fetched.filter((t) => t.ownerUid === input.recorderUid);
  if (transactions.length === 0) return;

  const recorder = users.find((u) => u.uid === input.recorderUid);
  const partnerUids = users.filter((u) => u.uid !== input.recorderUid).map((u) => u.uid);
  if (recorder && partnerUids.length > 0) {
    await deps.push(
      partnerUids,
      partnerTransactionPayload(
        OWNER_LABELS[recorder.role],
        transactions.map((t) => ({
          type: t.type,
          amount: t.amount,
          categoryName: t.categoryName,
          accountName: t.accountName,
        }))
      )
    );
  }

  const monthKey = wibMonthKey(input.now);
  const categoryIds = unique(
    transactions.filter((t) => t.type === "expense" && wibMonthKey(t.date) === monthKey).map((t) => t.categoryId)
  );
  if (categoryIds.length === 0) return;

  const categories = (await deps.repo.getCategories(categoryIds)).filter((c) => c.budgetAmount > 0);
  if (categories.length === 0) return;

  const { year, month } = wibParts(input.now);
  const { start, end } = wibMonthRange(year, month);
  const spending = await deps.repo.expenseByCategory(start, end);
  const everyone = users.map((u) => u.uid);

  for (const category of categories) {
    const spent = spending[category.id] ?? 0;
    const fresh: BudgetThreshold[] = [];
    for (const threshold of budgetThresholdsReached(spent, category.budgetAmount)) {
      if (await deps.repo.claimOnce(`${monthKey}_${category.id}_${threshold}`)) fresh.push(threshold);
    }
    if (fresh.length === 0) continue;
    // 80 & 100 sama-sama baru → cukup kirim yang tertinggi.
    await deps.push(
      everyone,
      budgetPayload({
        categoryId: category.id,
        categoryName: category.name,
        threshold: fresh[fresh.length - 1],
        spent,
        budget: category.budgetAmount,
      })
    );
  }
}

/** Ingatkan user yang belum mencatat transaksi apa pun hari ini (WIB). */
export async function runDailyReminder(deps: NotifyDeps, now: Date): Promise<string[]> {
  const [users, recorded] = await Promise.all([
    deps.repo.listUsers(),
    deps.repo.recorderUidsSince(wibDayRange(now).start),
  ]);
  const targets = users.map((u) => u.uid).filter((uid) => !recorded.includes(uid));
  if (targets.length > 0) await deps.push(targets, DAILY_REMINDER_PAYLOAD);
  return targets;
}

/** Rekap bulan lalu (WIB) ke semua user. */
export async function runMonthlySummary(deps: NotifyDeps, now: Date): Promise<void> {
  const { year, month } = wibPreviousMonth(now);
  const { start, end } = wibMonthRange(year, month);
  const [users, totals] = await Promise.all([deps.repo.listUsers(), deps.repo.monthTotals(start, end)]);
  const top = Object.entries(totals.expenseByCategoryName).sort((a, b) => b[1] - a[1])[0];
  await deps.push(
    users.map((u) => u.uid),
    monthlySummaryPayload({
      monthLabel: `${MONTH_NAMES_ID[month]} ${year}`,
      income: totals.income,
      expense: totals.expense,
      topCategory: top ? top[0] : null,
    })
  );
}
```

- [ ] **Step 5: Jalankan, pastikan lulus**

Run: `npx vitest run src/lib/notify/__tests__/notifications.test.ts`
Expected: PASS.

- [ ] **Step 6: Implementasi `src/lib/notify/firestoreNotifyRepo.ts`**

```ts
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
```

- [ ] **Step 7: Buat `src/lib/notify/deps.ts`**

```ts
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
```

- [ ] **Step 8: Verifikasi**

Run: `npm run lint && npm test && npm run build`
Expected: semua hijau.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "pemicu notifikasi: pasangan mencatat, ambang budget 80/100% sekali per bulan, pengingat harian & rekap bulanan

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Route notifikasi & cron + sambungkan ke form catat dan AI

**Files:**
- Create: `src/app/api/notify/transaction/route.ts`, `src/app/api/cron/daily-reminder/route.ts`, `src/app/api/cron/monthly-summary/route.ts`, `src/lib/server/cron.ts`, `src/lib/server/__tests__/cron.test.ts`, `src/lib/notifyClient.ts`, `vercel.json`
- Modify: `src/components/transactions/TransactionSheet.tsx`, `src/app/api/ai/chat/route.ts`, `README.md`

**Interfaces:**
- Consumes: `notifyTransactionsCreated`, `runDailyReminder`, `runMonthlySummary`, `createNotifyDeps` (Task 3); `verifyRequest`, `authErrorResponse`, `AuthedUser`, `authFetch` (Fase 3).
- Produces:
  - `POST /api/notify/transaction` body `{ transactionIds: string[] }` (1–50) → `{ ok: true }`
  - `GET /api/cron/daily-reminder` → `{ notified: number }`; `GET /api/cron/monthly-summary` → `{ ok: true }` (keduanya 401 tanpa `CRON_SECRET` yang benar)
  - `isCronAuthorized(req: Request, secret?: string): boolean`
  - client `notifyTransactionsCreated(transactionIds: string[]): void` (fire-and-forget)

- [ ] **Step 1: Tulis test gagal — `src/lib/server/__tests__/cron.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { isCronAuthorized } from "@/lib/server/cron";

const req = (authorization?: string) =>
  new Request("http://localhost/api/cron/x", { headers: authorization ? { authorization } : {} });

describe("isCronAuthorized", () => {
  it("secret cocok → true", () => {
    expect(isCronAuthorized(req("Bearer s3cret"), "s3cret")).toBe(true);
  });
  it("secret salah / tanpa header → false", () => {
    expect(isCronAuthorized(req("Bearer lain"), "s3cret")).toBe(false);
    expect(isCronAuthorized(req(), "s3cret")).toBe(false);
  });
  it("CRON_SECRET belum di-set → selalu false", () => {
    expect(isCronAuthorized(req("Bearer undefined"), undefined)).toBe(false);
    expect(isCronAuthorized(req("Bearer "), "")).toBe(false);
  });
});
```

- [ ] **Step 2: Jalankan, pastikan gagal**

Run: `npx vitest run src/lib/server/__tests__/cron.test.ts`
Expected: FAIL — modul `@/lib/server/cron` tidak ditemukan.

- [ ] **Step 3: Implementasi `src/lib/server/cron.ts`**

```ts
/** Vercel Cron mengirim `Authorization: Bearer ${CRON_SECRET}`. */
export function isCronAuthorized(req: Request, secret: string | undefined = process.env.CRON_SECRET): boolean {
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}
```

- [ ] **Step 4: Jalankan, pastikan lulus**

Run: `npx vitest run src/lib/server/__tests__/cron.test.ts`
Expected: PASS.

- [ ] **Step 5: Buat `src/app/api/notify/transaction/route.ts`**

```ts
import { NextResponse } from "next/server";
import { authErrorResponse, verifyRequest, type AuthedUser } from "@/lib/server/auth";
import { createNotifyDeps } from "@/lib/notify/deps";
import { notifyTransactionsCreated } from "@/lib/notify/notifications";

export const runtime = "nodejs";

/** Dipanggil HP pencatat setelah transaksi tersimpan → notif pasangan & cek budget. */
export async function POST(req: Request) {
  let user: AuthedUser;
  try {
    user = await verifyRequest(req);
  } catch (error) {
    return authErrorResponse(error);
  }

  const body = await req.json().catch(() => null);
  const ids: string[] = Array.isArray(body?.transactionIds)
    ? (body.transactionIds as unknown[]).filter((x): x is string => typeof x === "string").slice(0, 50)
    : [];
  if (ids.length === 0) {
    return NextResponse.json({ error: "transactionIds kosong" }, { status: 400 });
  }

  try {
    await notifyTransactionsCreated(createNotifyDeps(), { recorderUid: user.uid, transactionIds: ids, now: new Date() });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[notify/transaction]", error);
    return NextResponse.json({ error: "Gagal mengirim notifikasi" }, { status: 500 });
  }
}
```

- [ ] **Step 6: Buat `src/app/api/cron/daily-reminder/route.ts`**

```ts
import { NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/server/cron";
import { createNotifyDeps } from "@/lib/notify/deps";
import { runDailyReminder } from "@/lib/notify/notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Vercel Cron 21:00 WIB — ingatkan yang belum mencatat hari ini. */
export async function GET(req: Request) {
  if (!isCronAuthorized(req)) return new Response("Unauthorized", { status: 401 });
  const targets = await runDailyReminder(createNotifyDeps(), new Date());
  return NextResponse.json({ notified: targets.length });
}
```

- [ ] **Step 7: Buat `src/app/api/cron/monthly-summary/route.ts`**

```ts
import { NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/server/cron";
import { createNotifyDeps } from "@/lib/notify/deps";
import { runMonthlySummary } from "@/lib/notify/notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Vercel Cron tanggal 1, 08:00 WIB — rekap bulan lalu. */
export async function GET(req: Request) {
  if (!isCronAuthorized(req)) return new Response("Unauthorized", { status: 401 });
  await runMonthlySummary(createNotifyDeps(), new Date());
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 8: Buat `vercel.json`**

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "crons": [
    { "path": "/api/cron/daily-reminder", "schedule": "0 14 * * *" },
    { "path": "/api/cron/monthly-summary", "schedule": "0 1 1 * *" }
  ]
}
```

- [ ] **Step 9: Buat `src/lib/notifyClient.ts`**

```ts
"use client";

import { authFetch } from "@/lib/authFetch";

/**
 * Minta server kabari pasangan & cek budget untuk transaksi baru.
 * Fire-and-forget: gagal notifikasi tidak boleh mengganggu pencatatan.
 */
export function notifyTransactionsCreated(transactionIds: string[]): void {
  if (transactionIds.length === 0) return;
  void authFetch("/api/notify/transaction", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ transactionIds }),
  }).catch((error) => console.warn("[notify] gagal:", error));
}
```

- [ ] **Step 10: `src/components/transactions/TransactionSheet.tsx`**
  - Tambah import `import { notifyTransactionsCreated } from "@/lib/notifyClient";`.
  - Di `onSubmit` cabang create, ganti `await transactionsService.create(input);` menjadi:

```tsx
        const transactionId = await transactionsService.create(input);
        notifyTransactionsCreated([transactionId]);
```

- [ ] **Step 11: `src/app/api/ai/chat/route.ts`** — sambungkan notifikasi untuk transaksi dari AI
  - Tambah import:

```ts
import { createNotifyDeps } from "@/lib/notify/deps";
import { notifyTransactionsCreated } from "@/lib/notify/notifications";
```

  - Tepat sebelum `return NextResponse.json(result);` di blok `try`, tambahkan:

```ts
    if (ctx.createdTransactionIds.length > 0) {
      await notifyTransactionsCreated(createNotifyDeps(), {
        recorderUid: user.uid,
        transactionIds: ctx.createdTransactionIds,
        now,
      }).catch((error) => console.error("[ai/chat] notifikasi gagal:", error));
    }
```

- [ ] **Step 12: `README.md`** — di tabel "Environment server" tambahkan baris:

```markdown
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Public key VAPID (Web Push) |
| `VAPID_PRIVATE_KEY` | Private key VAPID |
| `VAPID_SUBJECT` | `mailto:arulpm010@gmail.com` |
| `CRON_SECRET` | String acak (`openssl rand -hex 32`) — dipakai Vercel Cron |
```

dan setelah tabel tambahkan:

````markdown
### Push notification

Generate kunci VAPID sekali:

```bash
npx web-push generate-vapid-keys
```

Lalu di tiap HP: buka app (Android: dari ikon hasil "Install app" Chrome; iPhone iOS ≥16.4: Share → Add to Home Screen, buka dari ikon) → Pengaturan → nyalakan **Notifikasi di HP ini**.

Jadwal (Vercel Cron, `vercel.json`): pengingat 21:00 WIB setiap hari, rekap bulanan tanggal 1 pukul 08:00 WIB. Di paket Hobby jam eksekusi bisa bergeser dalam jam yang sama.
````

- [ ] **Step 13: Verifikasi**

Run: `npm run lint && npm test && npm run build`
Expected: semua hijau.

Cron tanpa secret ditolak (dev server jalan):

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:1806/api/cron/daily-reminder
```

Expected: `401`.

Manual end-to-end (setelah deploy preview Vercel dengan semua env terisi oleh USER; dua akun login di dua browser/HP dengan notifikasi aktif):
- Arul catat pengeluaran → HP Fifi menerima "Arul catat Rp…"; HP Arul tidak.
- Catat sampai kategori ber-limit ≥80% → kedua HP menerima "… sudah 80% budget" sekali; catat lagi (masih <100%) → tidak ada notif budget baru.
- Catat lewat Prometheus → pasangan menerima notif yang sama.
- Panggil cron manual dengan secret:

```bash
curl -s -H "Authorization: Bearer $CRON_SECRET" https://<preview-url>/api/cron/daily-reminder
```

Expected: `{"notified":N}` dan HP yang belum mencatat hari ini menerima pengingat; tap → form catat terbuka.

- [ ] **Step 14: Commit**

```bash
git add -A
git commit -m "notifikasi tersambung: endpoint notify transaksi (form & prometheus), cron pengingat 21:00 wib & rekap tanggal 1

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
