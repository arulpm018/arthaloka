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
