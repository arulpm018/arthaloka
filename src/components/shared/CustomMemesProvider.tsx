"use client";

import { createContext, useContext, useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAppStore } from "@/store/useAppStore";
import type { CustomMeme } from "@/types/meme";
import type { MoodKey } from "@/lib/constants/memes";

interface CustomMemesContextValue {
  byMood: Map<MoodKey, CustomMeme[]>;
  isLoading: boolean;
}

const Context = createContext<CustomMemesContextValue>({
  byMood: new Map(),
  isLoading: true,
});

/**
 * Provider yang subscribe ke koleksi `memes` SEKALI di app shell, lalu
 * expose `byMood` map ke semua `<MemeReaction>` instance.
 *
 * Listener cuma jalan kalau user authenticated — Firestore rules block
 * unauthenticated reads, jadi kita skip subscription di awal.
 */
export const CustomMemesProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [byMood, setByMood] = useState<Map<MoodKey, CustomMeme[]>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const currentUser = useAppStore((s) => s.currentUser);

  useEffect(() => {
    if (!currentUser) {
      setByMood(new Map());
      setIsLoading(false);
      return;
    }

    const colRef = collection(db, "memes");
    const q = query(
      colRef,
      where("isActive", "==", true),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const next = new Map<MoodKey, CustomMeme[]>();
        for (const d of snapshot.docs) {
          const meme = { ...d.data(), memeId: d.id } as CustomMeme;
          if (!meme.dataUrl) continue; // skip doc tanpa foto (defensive)
          const list = next.get(meme.mood) ?? [];
          list.push(meme);
          next.set(meme.mood, list);
        }
        setByMood(next);
        setIsLoading(false);
      },
      (err) => {
        console.error("Error subscribing to custom memes:", err);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  return (
    <Context.Provider value={{ byMood, isLoading }}>
      {children}
    </Context.Provider>
  );
};

export const useCustomMemesByMood = (mood: MoodKey): CustomMeme[] => {
  return useContext(Context).byMood.get(mood) ?? [];
};
