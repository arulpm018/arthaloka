"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAppStore } from "@/store/useAppStore";
import type { CouplePhoto } from "@/lib/firestore/couplePhoto";

const STORAGE_KEY = "arthafiloka.couplePhotoDataUrl";

interface CouplePhotoContextValue {
  photo: CouplePhoto | null;
  isLoading: boolean;
}

const Context = createContext<CouplePhotoContextValue>({
  photo: null,
  isLoading: true,
});

/**
 * Provider yang subscribe ke `appConfig/couple` SEKALI di app shell.
 * Single listener melayani semua consumer (OwnerAvatar, CoupleHero,
 * CouplePhotoSection) supaya nggak ada duplicate Firestore subscriptions.
 *
 * Cache ke localStorage juga di sini supaya login page (pre-auth) bisa
 * read via `getCachedCoupleDataUrl()`.
 */
export const CouplePhotoProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const currentUser = useAppStore((s) => s.currentUser);
  const [photo, setPhoto] = useState<CouplePhoto | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) {
      setIsLoading(false);
      return;
    }
    const ref = doc(db, "appConfig", "couple");
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as CouplePhoto;
          setPhoto(data);
          try {
            window.localStorage.setItem(STORAGE_KEY, data.dataUrl);
          } catch {
            /* ignore quota errors */
          }
        } else {
          setPhoto(null);
          try {
            window.localStorage.removeItem(STORAGE_KEY);
          } catch {
            /* ignore */
          }
        }
        setIsLoading(false);
      },
      (err) => {
        console.error("Error subscribing to couple photo:", err);
        setIsLoading(false);
      }
    );
    return () => unsub();
  }, [currentUser]);

  return (
    <Context.Provider value={{ photo, isLoading }}>{children}</Context.Provider>
  );
};

export const useCouplePhotoContext = (): CouplePhotoContextValue =>
  useContext(Context);
