"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, Timestamp, where } from "firebase/firestore";
import { db } from "@/lib/firebase";

/**
 * Jumlah transaksi per `categoryId` dalam `days` hari terakhir (realtime).
 * Dipakai untuk mengurutkan grid kategori di form catat.
 */
export function useCategoryUsage(days = 90): Record<string, number> {
  const [usage, setUsage] = useState<Record<string, number>>({});

  useEffect(() => {
    const since = new Date();
    since.setDate(since.getDate() - days);
    since.setHours(0, 0, 0, 0);

    const q = query(
      collection(db, "transactions"),
      where("date", ">=", Timestamp.fromDate(since))
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const counts: Record<string, number> = {};
        snapshot.docs.forEach((doc) => {
          const categoryId = doc.get("categoryId") as string | undefined;
          if (categoryId) counts[categoryId] = (counts[categoryId] ?? 0) + 1;
        });
        setUsage(counts);
      },
      (error) => console.error("Error fetching category usage:", error)
    );

    return () => unsubscribe();
  }, [days]);

  return usage;
}
