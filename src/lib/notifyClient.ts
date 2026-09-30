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
