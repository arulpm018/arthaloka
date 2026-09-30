"use client";

import { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Transfer, TransferFilters } from "@/types";
import { transfersService } from "@/lib/firestore/transfers";

export function useTransfers(filters: TransferFilters) {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const startMs = filters.startDate.getTime();
  const endMs = filters.endDate.getTime();

  useEffect(() => {
    const q = query(
      collection(db, "transfers"),
      where("date", ">=", Timestamp.fromMillis(startMs)),
      where("date", "<=", Timestamp.fromMillis(endMs)),
      orderBy("date", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          ...doc.data(),
          transferId: doc.id,
        })) as Transfer[];
        setTransfers(data);
        setIsLoading(false);
      },
      (error) => {
        console.error("Error fetching transfers:", error);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [startMs, endMs]);

  const remove = async (transfer: Transfer) => {
    await transfersService.delete(transfer);
  };

  return { transfers, isLoading, remove };
}
