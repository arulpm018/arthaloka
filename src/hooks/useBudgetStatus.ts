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
import { Transaction, BudgetStatus } from "@/types";
import { useCategories } from "./useCategories";
import { startOfMonth, endOfMonth } from "date-fns";

export function useBudgetStatus(month: Date) {
  const { categories } = useCategories();
  const [budgets, setBudgets] = useState<BudgetStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, "transactions"),
      where("type", "==", "expense"),
      where("date", ">=", Timestamp.fromDate(startOfMonth(month))),
      where("date", "<=", Timestamp.fromDate(endOfMonth(month))),
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

        const statuses: BudgetStatus[] = categories
          .filter((c) => c.budgetAmount > 0)
          .map((c) => {
            const spent = spending[c.categoryId] || 0;
            const percentage = Math.round((spent / c.budgetAmount) * 100);
            return {
              categoryId: c.categoryId,
              categoryName: c.name,
              categoryIcon: c.icon,
              budgetAmount: c.budgetAmount,
              spent,
              percentage,
              status:
                percentage >= 100 ? "over" : percentage >= 75 ? "warning" : "normal",
            };
          });

        setBudgets(statuses);
        setIsLoading(false);
      },
      (error) => {
        console.error("Error fetching budget status:", error);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [month, categories]);

  return { budgets, isLoading };
}
