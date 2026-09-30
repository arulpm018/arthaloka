"use client";

import { useState, useEffect, useMemo } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
} from "firebase/firestore";
import { startOfMonth, endOfMonth } from "date-fns";
import { db } from "@/lib/firebase";
import { Transaction } from "@/types";
import { summarizeMonthBudget } from "@/lib/utils/budget";
import { useCategories } from "./useCategories";

/**
 * Pengeluaran per kategori di `month` (realtime) + ringkasan budget bulanan.
 * Budget berlaku sama tiap bulan (limit = `category.budgetAmount`).
 */
export function useBudgetStatus(month: Date) {
  const { categories } = useCategories();
  const [spendingByCategory, setSpendingByCategory] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);

  // Primitive dep supaya call-site yang kirim `new Date()` tiap render aman.
  const monthMs = month.getTime();

  useEffect(() => {
    const monthDate = new Date(monthMs);
    const q = query(
      collection(db, "transactions"),
      where("type", "==", "expense"),
      where("date", ">=", Timestamp.fromDate(startOfMonth(monthDate))),
      where("date", "<=", Timestamp.fromDate(endOfMonth(monthDate))),
      orderBy("date", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const spending: Record<string, number> = {};
        snapshot.docs.forEach((doc) => {
          const data = doc.data() as Transaction;
          spending[data.categoryId] = (spending[data.categoryId] || 0) + data.amount;
        });
        setSpendingByCategory(spending);
        setIsLoading(false);
      },
      (error) => {
        console.error("Error fetching budget status:", error);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [monthMs]);

  const summary = useMemo(
    () => summarizeMonthBudget(categories, spendingByCategory, new Date(monthMs), new Date()),
    [categories, spendingByCategory, monthMs]
  );

  return { budgets: summary.items, summary, spendingByCategory, isLoading };
}
