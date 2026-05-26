"use client";

import {
  couplePhotoService,
  type CouplePhoto,
} from "@/lib/firestore/couplePhoto";
import { useCouplePhotoContext } from "@/components/shared/CouplePhotoProvider";

const STORAGE_KEY = "arthafiloka.couplePhotoDataUrl";

/**
 * Public hook untuk consumer di dalam (app)/ — pulang foto dari single
 * Firestore subscription (lihat `<CouplePhotoProvider>`) plus service
 * untuk write ops.
 */
export const useCouplePhoto = (): {
  photo: CouplePhoto | null;
  isLoading: boolean;
  service: typeof couplePhotoService;
} => {
  const { photo, isLoading } = useCouplePhotoContext();
  return { photo, isLoading, service: couplePhotoService };
};

/**
 * Read-only sibling untuk halaman pre-auth (login). Cuma pulang cached
 * data URL — nggak attach listener. Aman dipanggil tanpa user.
 */
export const getCachedCoupleDataUrl = (): string | null => {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
};
