"use client";

import { authFetch } from "@/lib/authFetch";
import { urlBase64ToUint8Array } from "./vapidKey";

export type PushSupport = "supported" | "needs-install" | "unsupported";

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
