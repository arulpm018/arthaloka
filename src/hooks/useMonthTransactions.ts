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
import { Transaction } from "@/types";
import { startOfMonth, endOfMonth } from "date-fns";

/**
 * All transactions in the given month (realtime, not paginated).
 * Used for recap views that need the full month: daily chart,
 * category breakdown, top expenses.
 */
export function useMonthTransactions(month: Date, owner?: string) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Depend on a primitive (timestamp ms) instead of the Date object so that
  // call-sites passing `new Date(...)` each render don't trigger an infinite
  // effect re-run loop.
  const monthMs = month.getTime();

  useEffect(() => {
    const monthDate = new Date(monthMs);
    const constraints = [
      where("date", ">=", Timestamp.fromDate(startOfMonth(monthDate))),
      where("date", "<=", Timestamp.fromDate(endOfMonth(monthDate))),
      orderBy("date", "desc"),
    ];
    if (owner) constraints.push(where("owner", "==", owner));

    const q = query(collection(db, "transactions"), ...constraints);

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          ...doc.data(),
          transactionId: doc.id,
        })) as Transaction[];
        setTransactions(data);
        setIsLoading(false);
      },
      (error) => {
        console.error("Error fetching month transactions:", error);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [monthMs, owner]);

  return { transactions, isLoading };
}
