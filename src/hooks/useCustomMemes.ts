"use client";

import { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { memesService } from "@/lib/firestore/memes";
import type { CustomMeme } from "@/types/meme";
import type { MoodKey } from "@/lib/constants/memes";

/**
 * Subscribe ke koleksi `memes` (active only). Terurut dari yang terbaru.
 * Pakai realtime listener supaya upload baru langsung muncul tanpa refetch.
 *
 * Kalau `mood` di-pass, filter di Firestore query level (butuh composite
 * index `mood + isActive + createdAt`).
 */
export function useCustomMemes(mood?: MoodKey) {
  const [memes, setMemes] = useState<CustomMeme[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const colRef = collection(db, "memes");
    const q = mood
      ? query(
          colRef,
          where("isActive", "==", true),
          where("mood", "==", mood),
          orderBy("createdAt", "desc")
        )
      : query(
          colRef,
          where("isActive", "==", true),
          orderBy("createdAt", "desc")
        );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((d) => ({
          ...d.data(),
          memeId: d.id,
        })) as CustomMeme[];
        // Filter out doc tanpa foto (defensive).
        setMemes(data.filter((m) => !!m.dataUrl));
        setIsLoading(false);
        setError(null);
      },
      (err) => {
        console.error("Error fetching custom memes:", err);
        setError("Gagal memuat meme custom");
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [mood]);

  return { memes, isLoading, error, service: memesService };
}
